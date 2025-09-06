/**
 * Refresh Helper Functions for SWN Power System
 * Handles automatic and manual refresh of actor resource pools
 */

/**
 * Refresh pools based on cadence level
 * @param {string} cadenceLevel - "scene" or "day"
 * @param {Actor[]} actors - Optional array of specific actors to refresh
 * @returns {Promise<Object>} Refresh results
 */
async function refreshPools(cadenceLevel, actors = null) {
  // Build cadence hierarchy from CONFIG - higher index = higher level
  const cadenceHierarchy = {};
  CONFIG.SWN.poolCadences.forEach((cadence, index) => {
    if (cadence !== "commit") { // commit cadence doesn't auto-refresh
      cadenceHierarchy[cadence] = index;
    }
  });

  const currentLevel = cadenceHierarchy[cadenceLevel];
  if (currentLevel === undefined) {
    console.error(`[SWN Refresh] Invalid cadence level: ${cadenceLevel}`);
    return { success: false, reason: "invalid-cadence" };
  }

  // Get actors to refresh
  const actorsToRefresh = actors || game.actors.filter(a => a.type !== "faction");
  const refreshResults = [];

  console.log(`[SWN Refresh] Starting ${cadenceLevel} refresh for ${actorsToRefresh.length} actors`);

  for (const actor of actorsToRefresh) {
    try {
      const result = await refreshActorPools(actor, currentLevel);
      refreshResults.push({
        actorId: actor.id,
        actorName: actor.name,
        ...result
      });
    } catch (error) {
      console.error(`[SWN Refresh] Error refreshing actor ${actor.name}:`, error);
      refreshResults.push({
        actorId: actor.id,
        actorName: actor.name,
        success: false,
        error: error.message
      });
    }
  }

  // Emit hook for module compatibility
  Hooks.call("swnrPoolsRefreshed", {
    cadenceLevel,
    actorsRefreshed: actorsToRefresh.length,
    results: refreshResults
  });

  // Create chat message summary
  await createRefreshChatMessage(cadenceLevel, refreshResults);

  return {
    success: true,
    cadenceLevel,
    actorsRefreshed: actorsToRefresh.length,
    results: refreshResults
  };
}

/**
 * Refresh pools for a single actor
 * @param {Actor} actor - The actor to refresh
 * @param {number} cadenceLevel - Numeric cadence level (from CONFIG.SWN.poolCadences array index)
 * @returns {Promise<Object>} Refresh result for this actor
 */
async function refreshActorPools(actor, cadenceLevel) {
  const pools = foundry.utils.deepClone(actor.system.pools || {});
  const refreshedPools = [];

  // Build reverse cadence map from CONFIG (numeric level -> cadence name)
  const cadenceMap = {};
  CONFIG.SWN.poolCadences.forEach((cadence, index) => {
    if (cadence !== "commit") {
      cadenceMap[index] = cadence;
    }
  });

  for (const [poolKey, poolData] of Object.entries(pools)) {
    const poolCadenceLevel = getCadenceLevel(poolData.cadence);
    const oldValue = poolData.value;
    let poolChanged = false;
    
    // Refresh if pool cadence is at or below current refresh level
    if (poolCadenceLevel <= cadenceLevel) {
      poolData.value = poolData.max;
      if (oldValue !== poolData.value) {
        poolChanged = true;
      }
    }
    
    // Reset temp modifiers based on cadence level
    let tempModifierReset = false;
    const sourcePoolData = actor._source.system.pools?.[poolKey];
    
    if (cadenceLevel >= getCadenceLevel("scene")) {
      // Scene or higher refresh: reset scene and day temp modifiers
      if ((sourcePoolData?.tempScene || 0) !== 0) {
        poolData.tempScene = 0;
        tempModifierReset = true;
      }
      if (cadenceLevel >= getCadenceLevel("day")) {
        // Day refresh: also reset day temp modifiers  
        if ((sourcePoolData?.tempDay || 0) !== 0) {
          poolData.tempDay = 0;
          tempModifierReset = true;
        }
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

  // Update actor if any pools changed
  if (refreshedPools.length > 0) {
    await actor.update({ "system.pools": pools });
  }

  // Refresh consumption uses for powers
  const consumptionRefreshResults = await refreshConsumptionUses(actor, cadenceLevel);

  // Unprepare all prepared powers on day refresh (rest for the day)
  const preparedPowersResults = await unprepareAllPowers(actor, cadenceLevel);

  return {
    success: true,
    poolsRefreshed: refreshedPools.length,
    pools: refreshedPools,
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
async function createRefreshChatMessage(cadenceLevel, results) {
  const successfulRefreshes = results.filter(r => r.success && (r.poolsRefreshed > 0 || r.preparedPowersUnprepared > 0));
  
  if (successfulRefreshes.length === 0) {
    return; // No need to create a message if nothing was refreshed
  }

  const totalPoolsRefreshed = successfulRefreshes.reduce((sum, r) => sum + r.poolsRefreshed, 0);
  const totalPowersUnprepared = successfulRefreshes.reduce((sum, r) => sum + (r.preparedPowersUnprepared || 0), 0);
  
  let content = `<div class="chat-card refresh-summary">`;
  content += `<h3><i class="fas fa-sync-alt"></i> ${game.i18n.localize(`SWN.pools.refreshSummary.${cadenceLevel}`) || (cadenceLevel.charAt(0).toUpperCase() + cadenceLevel.slice(1) + " Refresh")}</h3>`;
  
  if (totalPoolsRefreshed > 0) {
    content += `<p>Refreshed ${totalPoolsRefreshed} resource pools across ${successfulRefreshes.length} actors.</p>`;
  }
  
  if (totalPowersUnprepared > 0 && cadenceLevel === "day") {
    content += `<p>Unprepared ${totalPowersUnprepared} prepared powers (rest for the day).</p>`;
  }
  
  if (successfulRefreshes.length <= 5) {
    content += `<ul>`;
    for (const result of successfulRefreshes) {
      let details = [];
      if (result.poolsRefreshed > 0) {
        details.push(`${result.poolsRefreshed} pools refreshed`);
      }
      if (result.preparedPowersUnprepared > 0) {
        details.push(`${result.preparedPowersUnprepared} powers unprepared`);
      }
      if (details.length > 0) {
        content += `<li><strong>${result.actorName}</strong>: ${details.join(', ')}</li>`;
      }
    }
    content += `</ul>`;
  }
  
  content += `</div>`;

  await getDocumentClass("ChatMessage").create({
    speaker: { alias: "System" },
    content: content,
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });
}

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
  refreshPools,
  refreshActorPools,
  refreshSpecificPools,
  getRefreshStatus,
  getCadenceLevel,
  createRefreshChatMessage,
  refreshConsumptionUses,
  unprepareAllPowers
};

// Export functions that will be added to global swnr object by swnr.mjs
// Global functions will be accessible as globalThis.swnr.refreshScene(), etc.
