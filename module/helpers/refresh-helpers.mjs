/**
 * Refresh Helper Functions for SWN Power System
 * Handles automatic and manual refresh of actor resource pools
 */

/**
 * Refresh pools based on cadence level
 * @param {string} cadenceLevel - "scene", "rest", or "day"
 * @param {Actor[]} actors - Optional array of specific actors to refresh
 * @returns {Promise<Object>} Refresh results
 */
async function refreshPools(cadenceLevel, actors = null) {
  const cadenceHierarchy = {
    "scene": 1,
    "rest": 2,
    "day": 3
  };

  const currentLevel = cadenceHierarchy[cadenceLevel];
  if (!currentLevel) {
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
 * @param {number} cadenceLevel - Numeric cadence level (1=scene, 2=rest, 3=day)
 * @returns {Promise<Object>} Refresh result for this actor
 */
async function refreshActorPools(actor, cadenceLevel) {
  const pools = foundry.utils.deepClone(actor.system.pools || {});
  const refreshedPools = [];

  const cadenceMap = {
    1: "scene",
    2: "rest", 
    3: "day"
  };

  for (const [poolKey, poolData] of Object.entries(pools)) {
    const poolCadenceLevel = getCadenceLevel(poolData.cadence);
    
    // Refresh if pool cadence is at or below current refresh level
    if (poolCadenceLevel <= cadenceLevel) {
      const oldValue = poolData.value;
      poolData.value = poolData.max;
      
      if (oldValue !== poolData.value) {
        refreshedPools.push({
          key: poolKey,
          oldValue,
          newValue: poolData.value,
          max: poolData.max,
          cadence: poolData.cadence
        });
      }
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
  const cadenceMap = {
    "commit": 0,  // Never auto-refresh
    "scene": 1,
    "rest": 2,
    "day": 3
  };
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
  const status = {
    scene: [],
    rest: [],
    day: []
  };

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
 * @param {number} cadenceLevel - Numeric cadence level (1=scene, 2=rest, 3=day)
 * @returns {Promise<Object>} Refresh results
 */
async function refreshConsumptionUses(actor, cadenceLevel) {
  const cadenceMap = {
    1: "scene",
    2: "rest", 
    3: "day"
  };
  
  const currentCadence = cadenceMap[cadenceLevel];
  const updates = {};
  const refreshedItems = [];

  // Check all power items for consumption uses that need refreshing
  for (const item of actor.items) {
    if (item.type !== "power") continue;
    
    const power = item.system;
    let itemUpdated = false;
    
    // Check consumption array for "uses" type consumptions
    if (power.consumptions && Array.isArray(power.consumptions)) {
      for (let i = 0; i < power.consumptions.length; i++) {
        const consumption = power.consumptions[i];
        if (consumption.type === "uses" && consumption.cadence) {
          const consumptionCadenceLevel = getCadenceLevel(consumption.cadence);
          if (consumptionCadenceLevel <= cadenceLevel && consumption.uses.value < consumption.uses.max) {
            updates[`items.${item.id}.system.consumptions.${i}.uses.value`] = consumption.uses.max;
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
    }
  }
  
  // Apply all updates at once
  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
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
 * @param {number} cadenceLevel - Numeric cadence level (only works on day/3)
 * @returns {Promise<Object>} Unprepare results
 */
async function unprepareAllPowers(actor, cadenceLevel) {
  // Only unprepare powers on day rest (full rest)
  if (cadenceLevel !== 3) {
    return {
      unpreparedCount: 0,
      unpreparedPowers: []
    };
  }

  const updates = {};
  const unpreparedPowers = [];

  // Check all power items for prepared powers
  for (const item of actor.items) {
    if (item.type !== "power") continue;
    
    const power = item.system;
    
    // If power is prepared, unprepare it
    if (power.prepared) {
      updates[`items.${item.id}.system.prepared`] = false;
      
      // Also reset any preparation-based internal uses (spendOnPrep: true uses)
      if (power.consumptions && Array.isArray(power.consumptions)) {
        for (let i = 0; i < power.consumptions.length; i++) {
          const consumption = power.consumptions[i];
          if (consumption.type === "uses" && consumption.spendOnPrep && consumption.uses) {
            // Reset prep-based uses to maximum
            updates[`items.${item.id}.system.consumptions.${i}.uses.value`] = consumption.uses.max;
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
  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
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
  createRefreshChatMessage,
  refreshConsumptionUses,
  unprepareAllPowers
};

// Add to global swnr object
globalThis.swnr = globalThis.swnr || {};
globalThis.swnr.refreshScene = () => refreshPools("scene");
globalThis.swnr.refreshRest = () => refreshPools("rest");
globalThis.swnr.refreshDay = () => refreshPools("day");
globalThis.swnr.getRefreshStatus = getRefreshStatus;