/**
 * Refresh Helper Functions for SWN Power System
 * Handles automatic and manual refresh of actor resource pools
 */

// Removed: refreshPools — use refresh-orchestrator.refreshMany instead

/**
 * Refresh pools for a single actor
 * @param {Actor} actor - The actor to refresh
 * @param {number} cadenceLevel - Numeric cadence level (from CONFIG.SWN.poolCadences array index)
 * @returns {Promise<Object>} Refresh result for this actor
 */
async function refreshActorPools(actor, cadenceLevel) {
  const pools = foundry.utils.deepClone(actor.system.pools || {});
  const refreshedPools = [];
  // Track commitment changes and releases; clone to avoid mutating source directly
  const sourceCommitments = foundry.utils.deepClone(actor.system.effortCommitments || {});
  const newCommitments = foundry.utils.deepClone(sourceCommitments);
  const effortReleased = [];

  // Build reverse cadence map from CONFIG (numeric level -> cadence name)
  const cadenceMap = {};
  CONFIG.SWN.poolCadences.forEach((cadence, index) => {
    if (cadence !== "commit") {
      cadenceMap[index] = cadence;
    }
  });

  for (const [poolKey, poolData] of Object.entries(pools)) {
    const poolCadenceLevel = getCadenceLevel(poolData.cadence);
    const oldValue = Number(poolData.value) || 0;
    let poolChanged = false;

    // 1) Handle effort commitments for this pool: release by cadence and recompute totals
    let totalCommittedLocal = null;
    if (newCommitments[poolKey]) {
      const remaining = [];
      for (const commitment of newCommitments[poolKey]) {
        let shouldRelease = false;
        if (commitment.duration === "commit") {
          shouldRelease = false; // never auto-release
        } else if (cadenceLevel >= getCadenceLevel("day") && (commitment.duration === "day" || commitment.duration === "scene")) {
          shouldRelease = true;
        } else if (cadenceLevel >= getCadenceLevel("scene") && commitment.duration === "scene") {
          shouldRelease = true;
        }
        if (!shouldRelease) {
          remaining.push(commitment);
        } else {
          effortReleased.push(`${commitment.powerName} (${commitment.amount} ${poolKey})`);
        }
      }
      newCommitments[poolKey] = remaining;
      const oldCommittedTotal = (sourceCommitments[poolKey] || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      totalCommittedLocal = remaining.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const releasedAmount = Math.max(0, oldCommittedTotal - totalCommittedLocal);
      // Reflect committed total on the pool
      poolData.committed = totalCommittedLocal;
      // If commitments were released (e.g., scene cadence), increase available value by the released amount,
      // clamped to current max. Subsequent refresh/tempo blocks may overwrite this as appropriate.
      if (releasedAmount > 0) {
        const curVal = Number(poolData.value) || 0;
        const curMax = Number(poolData.max) || 0;
        const incVal = Math.min(curVal + releasedAmount, curMax);
        if (incVal !== curVal) poolData.value = incVal, poolChanged = true;
      }
      poolChanged = true;
    }

    // 2) Refresh to full if this pool's cadence is within scope
    if (poolCadenceLevel <= cadenceLevel) {
      poolData.value = Number(poolData.max) || 0;
      if (oldValue !== poolData.value) poolChanged = true;
    }

    // 3) Reset temp modifiers based on cadence level
    let tempModifierReset = false;
    const sourcePoolData = actor._source.system.pools?.[poolKey];
    if (cadenceLevel >= getCadenceLevel("scene")) {
      if ((sourcePoolData?.tempScene || 0) !== 0) {
        poolData.tempScene = 0;
        tempModifierReset = true;
      }
      if (cadenceLevel >= getCadenceLevel("day")) {
        if ((sourcePoolData?.tempDay || 0) !== 0) {
          poolData.tempDay = 0;
          tempModifierReset = true;
        }
      }
    }

    // 4) If any temp modifier was reset, recompute max and value to reflect new totals
    if (tempModifierReset) {
      const oldCommit = Number(sourcePoolData?.tempCommit) || 0;
      const oldScene = Number(sourcePoolData?.tempScene) || 0;
      const oldDay = Number(sourcePoolData?.tempDay) || 0;
      const oldTempSum = oldCommit + oldScene + oldDay;

      const newCommit = Number(poolData.tempCommit) || 0;
      const newScene = Number(poolData.tempScene) || 0;
      const newDay = Number(poolData.tempDay) || 0;
      const newTempSum = newCommit + newScene + newDay;

      // Derive baseMax from current max minus old temp sum
      const currentMax = Number(poolData.max) || 0;
      const baseMax = Math.max(0, currentMax - oldTempSum);
      const newMax = Math.max(0, baseMax + newTempSum);
      poolData.max = newMax;

      // Determine new value honoring commitments and cadence
      const valueBefore = Number(poolData.value) || 0;
      let newValue;
      if (totalCommittedLocal !== null) {
        // Commitments reduce availability to max - committed
        newValue = Math.max(0, newMax - totalCommittedLocal);
      } else if (poolCadenceLevel <= cadenceLevel) {
        // If pool refreshed this pass, set to newMax
        newValue = newMax;
      } else {
        // Otherwise, adjust by delta temp
        const delta = newTempSum - oldTempSum;
        newValue = Math.max(0, Math.min(valueBefore + delta, newMax));
      }
      if (poolData.value !== newValue) poolChanged = true;
      poolData.value = newValue;
    }

    // 5) If commitments exist but no temp reset occurred, still ensure value ≤ max - committed when applicable
    if (!tempModifierReset && totalCommittedLocal !== null) {
      const cap = Math.max(0, (Number(poolData.max) || 0) - totalCommittedLocal);
      if (poolData.value > cap) {
        poolData.value = cap;
        poolChanged = true;
      }
    }

    if (poolChanged || tempModifierReset) {
      refreshedPools.push({
        key: poolKey,
        oldValue,
        newValue: poolData.value,
        max: poolData.max,
        cadence: poolData.cadence,
        tempModifierReset
      });
    }
  }

  // Build update payload. Always include commitments if they changed, otherwise only pools
  const updates = { "system.pools": pools };
  if (JSON.stringify(sourceCommitments) !== JSON.stringify(newCommitments)) {
    updates["system.effortCommitments"] = newCommitments;
  }
  // Update actor if any relevant data changed
  if (refreshedPools.length > 0 || updates["system.effortCommitments"]) {
    await actor.update(updates);
  }

  // Refresh consumption uses for powers
  const consumptionRefreshResults = await refreshConsumptionUses(actor, cadenceLevel);

  // Unprepare all prepared powers on day refresh (rest for the day)
  const preparedPowersResults = await unprepareAllPowers(actor, cadenceLevel);

  return {
    success: true,
    poolsRefreshed: refreshedPools.length,
    pools: refreshedPools,
    effortReleased,
    consumptionUsesRefreshed: consumptionRefreshResults.refreshedCount,
    consumptionRefreshDetails: consumptionRefreshResults.refreshedItems,
    preparedPowersUnprepared: preparedPowersResults.unpreparedCount,
    preparedPowersDetails: preparedPowersResults.unpreparedPowers
  };
}

/**
 * Get numeric cadence level for comparison
 * @param {string} cadence - Cadence string
 * @returns {number} Numeric level
 */
function getCadenceLevel(cadence) {
  // Build cadence level map from CONFIG
  const cadenceMap = {};
  CONFIG.SWN.poolCadences.forEach((configCadence, index) => {
    if (configCadence === "commit") {
      cadenceMap[configCadence] = 0;  // Never auto-refresh
    } else {
      cadenceMap[configCadence] = index;
    }
  });
  return cadenceMap[cadence] || 0;
}

/**
 * Create chat message summarizing refresh results
 * @param {string} cadenceLevel - The refresh level
 * @param {Array} results - Refresh results per actor
 */
// (Removed) createRefreshChatMessage — GM summary chat is handled by refresh-orchestrator

/**
 * Manually refresh specific pools for an actor
 * @param {Actor} actor - The actor
 * @param {string[]} poolKeys - Array of pool keys to refresh
 * @returns {Promise<Object>} Refresh result
 */
async function refreshSpecificPools(actor, poolKeys) {
  const pools = foundry.utils.deepClone(actor.system.pools || {});
  const refreshedPools = [];

  for (const poolKey of poolKeys) {
    if (pools[poolKey]) {
      const oldValue = pools[poolKey].value;
      pools[poolKey].value = pools[poolKey].max;
      
      refreshedPools.push({
        key: poolKey,
        oldValue,
        newValue: pools[poolKey].value,
        max: pools[poolKey].max
      });
    }
  }

  if (refreshedPools.length > 0) {
    await actor.update({ "system.pools": pools });
  }

  return {
    success: true,
    poolsRefreshed: refreshedPools.length,
    pools: refreshedPools
  };
}

/**
 * Get refresh status for all actors
 * @returns {Object} Summary of refresh-eligible pools
 */
function getRefreshStatus() {
  const actors = game.actors.filter(a => a.type !== "faction");
  // Build status object from CONFIG cadences (excluding commit)
  const status = {};
  CONFIG.SWN.poolCadences.forEach(cadence => {
    if (cadence !== "commit") {
      status[cadence] = [];
    }
  });

  for (const actor of actors) {
    const pools = actor.system.pools || {};
    
    for (const [poolKey, poolData] of Object.entries(pools)) {
      if (poolData.value < poolData.max) {
        const cadence = poolData.cadence;
        if (status[cadence]) {
          status[cadence].push({
            actor: actor.name,
            poolKey,
            current: poolData.value,
            max: poolData.max
          });
        }
      }
    }
  }

  return status;
}

/**
 * Refresh consumption uses for powers based on cadence
 * @param {Actor} actor - Actor to refresh consumption uses for
 * @param {number} cadenceLevel - Numeric cadence level (from CONFIG.SWN.poolCadences array index)
 * @returns {Promise<Object>} Refresh results
 */
async function refreshConsumptionUses(actor, cadenceLevel) {
  const flatUpdates = {};
  const refreshedItems = [];

  // Check all power items for consumption uses that need refreshing
  for (const item of actor.items) {
    if (item.type !== "power") continue;
    
    const power = item.system;
    let itemUpdated = false;
    const updatedConsumptions = foundry.utils.deepClone(power.consumptions || []);
    
    // Check consumption array for "uses" type consumptions
    if (power.consumptions && Array.isArray(power.consumptions)) {
      for (let i = 0; i < power.consumptions.length; i++) {
        const consumption = power.consumptions[i];
        if (consumption.type === "uses" && consumption.cadence) {
          const consumptionCadenceLevel = getCadenceLevel(consumption.cadence);
          if (consumptionCadenceLevel <= cadenceLevel && consumption.uses.value < consumption.uses.max) {
            console.log(`[SWN Refresh] Updating ${item.name}: ${consumption.uses.value} -> ${consumption.uses.max}`);
            // Update the cloned array element safely
            if (!updatedConsumptions[i]) updatedConsumptions[i] = { type: 'uses', uses: { value: 0, max: 1 } };
            updatedConsumptions[i].type = 'uses';
            updatedConsumptions[i].uses = {
              ...(updatedConsumptions[i].uses || { value: 0, max: 1 }),
              value: consumption.uses.max,
              max: consumption.uses.max
            };
            refreshedItems.push({
              itemName: item.name,
              consumptionSlot: `consumption[${i}]`,
              oldValue: consumption.uses.value,
              newValue: consumption.uses.max,
              cadence: consumption.cadence
            });
            itemUpdated = true;
          }
        }
      }
    }
    
    if (itemUpdated) {
      console.log(`[SWN Refresh] Refreshing consumption uses for power: ${item.name}`);
      // Set full array update per item to avoid sparse array issues in v13
      flatUpdates[`items.${item.id}.system.consumptions`] = updatedConsumptions;
    }
  }
  
  // Apply all updates at once
  if (Object.keys(flatUpdates).length > 0) {
    console.log(`[SWN Refresh] Applying consumption updates:`, flatUpdates);
    // Convert flattened updates into updateEmbeddedDocuments payloads
    const byItem = new Map();
    for (const [key, value] of Object.entries(flatUpdates)) {
      const parts = key.split('.');
      const itemId = parts[1];
      const itemPath = parts.slice(2).join('.');
      if (!byItem.has(itemId)) byItem.set(itemId, { _id: itemId });
      byItem.get(itemId)[itemPath] = value;
    }
    const payload = Array.from(byItem.values());
    await actor.updateEmbeddedDocuments('Item', payload);
    console.log(`[SWN Refresh] Consumption updates applied successfully`);
  } else {
    console.log(`[SWN Refresh] No consumption updates needed`);
  }
  
  return {
    refreshedCount: refreshedItems.length,
    refreshedItems
  };
}

/**
 * Unprepare all prepared powers on day rest (rest for the day)
 * Also restore preparation costs but NOT casting costs
 * @param {Actor} actor - Actor to unprepare powers for
 * @param {number} cadenceLevel - Numeric cadence level (only works on day cadence)
 * @returns {Promise<Object>} Unprepare results
 */
async function unprepareAllPowers(actor, cadenceLevel) {
  // Only unprepare powers on day rest (full rest)
  // Find the index of "day" in CONFIG.SWN.poolCadences
  const dayLevel = CONFIG.SWN.poolCadences.indexOf("day");
  if (cadenceLevel !== dayLevel) {
    return {
      unpreparedCount: 0,
      unpreparedPowers: []
    };
  }

  const flatUpdates = {};
  const unpreparedPowers = [];

  // Check all power items for prepared powers
  for (const item of actor.items) {
    if (item.type !== "power") continue;
    
    const power = item.system;
    
    // If power is prepared, unprepare it
    if (power.prepared) {
      flatUpdates[`items.${item.id}.system.prepared`] = false;
      
      // Also reset any preparation-based internal uses (spendOnPrep: true uses)
      if (power.consumptions && Array.isArray(power.consumptions)) {
        for (let i = 0; i < power.consumptions.length; i++) {
          const consumption = power.consumptions[i];
          if (consumption.type === "uses" && consumption.spendOnPrep && consumption.uses) {
            // Reset prep-based uses to maximum
              flatUpdates[`items.${item.id}.system.consumptions.${i}.uses.value`] = consumption.uses.max;
          }
        }
      }
      
      unpreparedPowers.push({
        itemId: item.id,
        itemName: item.name,
        hadResourceCost: power.hasConsumption()
      });
      
      console.log(`[SWN Refresh] Unpreparing power: ${item.name}`);
    }
  }
  
  // Apply all updates at once
  if (Object.keys(flatUpdates).length > 0) {
    const byItem = new Map();
    for (const [key, value] of Object.entries(flatUpdates)) {
      const parts = key.split('.');
      const itemId = parts[1];
      const itemPath = parts.slice(2).join('.');
      if (!byItem.has(itemId)) byItem.set(itemId, { _id: itemId });
      byItem.get(itemId)[itemPath] = value;
    }
    const payload = Array.from(byItem.values());
    await actor.updateEmbeddedDocuments('Item', payload);
  }
  
  return {
    unpreparedCount: unpreparedPowers.length,
    unpreparedPowers
  };
}

// Export functions for global access
export {
  refreshActorPools,
  refreshSpecificPools,
  getRefreshStatus,
  getCadenceLevel,
  refreshConsumptionUses,
  unprepareAllPowers
};

// Export functions that will be added to global swnr object by swnr.mjs
// Global functions will be accessible as globalThis.swnr.refreshScene(), etc.
