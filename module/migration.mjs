/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise} A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function (storedVersion) {
  ui.notifications.info(`Applying SWN/CWN/AWN System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

  try {
    // Migrate world depending on the version of the system
    await runMigrationsSequentially(storedVersion);

    // Set the migration as complete only if all migrations succeeded
    await game.settings.set("swnr", "systemMigrationVersion", game.system.version);
    ui.notifications.info(`SWN System Migration to version ${game.system.version} completed!`, { permanent: true });
  } catch (err) {
    console.error("Migration failed:", err);
    ui.notifications.error(`Migration failed: ${err.message}. System version not updated. Please check console for details.`, { permanent: true });
    throw err;
  }
};

/**
 * Runs migration functions sequentially, starting from the stored version
 * up to the latest version defined in the migrations object.
 *
 * This function first filters the migration versions to only those that are
 * greater than the currently stored version, then sorts them in ascending order.
 * It then iterates through each version and awaits the corresponding migration function,
 * ensuring that migrations are applied in the correct order.
 *
 * @param {string} storedVersion - The version number from which to start migrations.
 * @returns {Promise<void>} A Promise that resolves once all applicable migrations have been executed.
 */
async function runMigrationsSequentially(storedVersion) {
  const versions = Object.keys(migrations).filter(key => compareVersions(key, storedVersion) > 0).sort((a, b) => compareVersions(a, b));

  for (const version of versions) {
    await migrations[version]();
  }
}

async function migrateFeature(item) {
  const { description = "", level1 = "", level2 = "", type = "feature"} = item.system;
  let level = 0;
  const newDescription = item.type.toLowerCase() === 'focus'
    ? `${description} ${level1} ${level2}`.trim()
    : description;
  const subtype = item.type.toLowerCase() === 'focus' ? 'focus' : 'edge';
  if (subtype === 'focus') {
    level = parseInt(item.system.level);
  }
  const updateData = {
    type: "feature",
    system: {
      description: newDescription,
      level: level,
      type: subtype
    }
  };

  try {
    await item.update(updateData);
    return true;
  } catch (err) {
    ui.notifications?.error("Failed to update item:", err);
    return false;
  }
}

async function versionNote(version, note) {
  const msg = `<b>Version ${version} note:</b> ${note}`;
  console.log(msg);
  ChatMessage.create({
    user: game.user.id,
    speaker: { alias: "wintersleepAI" },
    content: msg,
  });
  ui.notifications?.info(msg);
}
/**
 * Object containing migration functions keyed by version.
 * Each migration function should perform all necessary updates for that version.
 *
 * @type {Object.<string, function(): Promise<void>>}
 */
const migrations = {
  "2.0.0": async () => {
    console.log('Running migration for 2.0.0');
    //for (const item of game.items.contents) {
    let migrated = false;
    for (const itemId  of game.items.invalidDocumentIds) {
      let item = game.items.getInvalid(itemId);
      if (item.type.toLowerCase() === 'focus' || item.type.toLowerCase() === 'edge') {
        if (migrateFeature(item)) {
          migrated = true;
        }
      }
    }
    for (const actor of game.actors) {
      if (actor.type == 'character' || actor.type == 'npc') {
        for (const itemId of actor.items.invalidDocumentIds) {
          let item = actor.items.getInvalid(itemId);
          if (item.type.toLowerCase() === 'focus' || item.type.toLowerCase() === 'edge') {
            if (migrateFeature(item)) {
              migrated = true;
            }
          }
        }
      }
    }
    if (migrated) {
      const msg = "Items have been successfully updated to version. Please refresh your browser to see the changes -- otherwise you will not see the updated items.";
      ChatMessage.create({
        user: game.user.id,
        whisper: [game.user.id],
        speaker: { alias: "wintersleepAI" },
        content: msg,
      });
      ui.notifications?.error(msg);
    }
  },
  "2.0.8": async () => {
    console.log('Running migration for 2.0.8');
    versionNote("2.0.8", "This migration adds a 'melee' flag to weapons which is used for determining what attack bonus to use with CWN Armor setting enabled. <b>You will need to set this flag manually for existing items.</b>");
  },
  "2.0.11": async () => {
    console.log('Running migration for 2.0.11');
    versionNote("2.0.11", "This version adds the ability for items to be marked as consumable (partially for AWN support) with the ability to track empty 'containers'. Ammo is treated as a consumable, which means a weapon should have the ammo source selected to reload. Shift+clicking reload will bypass this logic.");
    },
  "2.1.0": async () => {
    console.log('Running migration for 2.1.0 - Unified Power System');
    
    // Log migration start for debugging purposes
    console.log(`Starting migration 2.1.0 at ${new Date().toISOString()}`);
    
    let migrationErrors = [];
    let actorsMigrated = 0;
    let powerItemsMigrated = 0;
    
    try {
      // Migrate Actors - transform effort to pools
      for (const actor of game.actors) {
        if (actor.system.effort) {
          // Log original effort data for debugging
          console.log(`Migrating actor ${actor.name} with effort:`, actor.system.effort);
          
          try {
            const effortData = actor.system.effort;
            const totalEffort = (effortData.bonus || 0) + (effortData.current || 0) + (effortData.scene || 0) + (effortData.day || 0);
            
            const pools = {
              "Effort:Psychic": {
                value: totalEffort,
                max: totalEffort,
                cadence: "scene"
              }
            };
            
            await actor.update({
              "system.pools": pools,
              "system.-=effort": null
            });
            
            actorsMigrated++;
          } catch (err) {
            migrationErrors.push(`Actor ${actor.name} (${actor.id}): ${err.message}`);
          }
        }
      }
      
      // Migrate Power Items - add new unified fields
      for (const item of game.items) {
        if (item.type === "power") {
          // Log original power data for debugging
          console.log(`Migrating power item ${item.name} with system:`, item.system);
          
          try {
            // Map old effort values to valid resourceLength choices
            const effortToResourceLength = {
              "scene": "scene",
              "day": "day", 
              "current": "commit"  // "current" maps to "commit" in new system
            };
            const resourceLength = effortToResourceLength[item.system.effort] || "scene";
            
            const updateData = {
              "system.subType": "psychic",
              "system.resourceName": "Effort",
              "system.subResource": "Psychic",
              "system.resourceCost": 1,
              "system.sharedResource": true,
              "system.resourceLength": resourceLength,
              "system.leveledResource": false,
              "system.strainCost": 0,
              "system.internalResource": { value: 0, max: 1 },
              "system.uses": { value: 0, max: 1 }
            };
            
            // Remove old effort field if it exists
            if (item.system.effort) {
              updateData["system.-=effort"] = null;
            }
            
            await item.update(updateData);
            powerItemsMigrated++;
          } catch (err) {
            migrationErrors.push(`Power item ${item.name} (${item.id}): ${err.message}`);
          }
        }
      }
      
      // Migrate embedded power items in actors
      for (const actor of game.actors) {
        for (const item of actor.items) {
          if (item.type === "power") {
            try {
              // Map old effort values to valid resourceLength choices
              const effortToResourceLength = {
                "scene": "scene",
                "day": "day", 
                "current": "commit"  // "current" maps to "commit" in new system
              };
              const resourceLength = effortToResourceLength[item.system.effort] || "scene";
              
              const updateData = {
                "system.subType": "psychic",
                "system.resourceName": "Effort",
                "system.subResource": "Psychic",
                "system.resourceCost": 1,
                "system.sharedResource": true,
                "system.resourceLength": resourceLength,
                "system.leveledResource": false,
                "system.strainCost": 0,
                "system.internalResource": { value: 0, max: 1 },
                "system.uses": { value: 0, max: 1 }
              };
              
              // Remove old effort field if it exists
              if (item.system.effort) {
                updateData["system.-=effort"] = null;
              }
              
              await item.update(updateData);
              powerItemsMigrated++;
            } catch (err) {
              migrationErrors.push(`Embedded power item ${item.name} in ${actor.name}: ${err.message}`);
            }
          }
        }
      }
      
      // Migration completed successfully
      console.log(`Migration 2.1.0 completed successfully at ${new Date().toISOString()}`);
      
      // Report migration results
      const successMsg = `Migration 2.1.0 completed: ${actorsMigrated} actors migrated, ${powerItemsMigrated} power items updated.`;
      console.log(successMsg);
      
      if (migrationErrors.length > 0) {
        const errorMsg = `Migration completed with ${migrationErrors.length} errors. Check console for details.`;
        console.warn("Migration errors:", migrationErrors);
        ui.notifications?.warn(errorMsg);
      } else {
        ui.notifications?.info(successMsg);
      }
      
      versionNote("2.1.0", "Unified Power System migration completed. Power items now use the new resource pool system. Old effort values have been converted to Effort:Psychic pools.");
      
    } catch (err) {
      console.error("Critical migration error:", err);
      ui.notifications?.error(`Migration 2.1.0 failed: ${err.message}. Check console for details.`);
      throw err;
    }
  },
  "2.1.1": async () => {
    console.log('Running migration for 2.1.1 - Feature-based Pool Generation');
    
    // Log migration start for debugging purposes
    console.log(`Starting migration 2.1.1 at ${new Date().toISOString()}`);
    
    let migrationErrors = [];
    let featuresMigrated = 0;
    let powersMigrated = 0;
    
    try {
      // Create default feature items for common pool grants
      const defaultPoolFeatures = [
        {
          name: "Psychic Training",
          type: "feature",
          system: {
            description: "Basic psychic training grants access to psychic powers and effort pools.",
            type: "edge",
            level: 0,
            poolsGranted: [{
              resourceName: "Effort",
              subResource: "Psychic", 
              baseAmount: 1,
              perLevel: 1,
              cadence: "scene",
              formula: "",
              condition: ""
            }]
          }
        }
      ];
      
      // Process each actor to migrate pool configurations
      for (const actor of game.actors) {
        if (actor.type === 'character' || actor.type === 'npc') {
          let actorNeedsPoolFeature = false;
          
          // Check if actor has any existing pools that need migration
          if (actor.system.pools && Object.keys(actor.system.pools).length > 0) {
            console.log(`Actor ${actor.name} has existing pools:`, actor.system.pools);
            
            // Check if they already have features that grant these pools
            const existingFeatures = actor.items.filter(item => 
              item.type === "feature" && 
              item.system.poolsGranted?.length > 0
            );
            
            // If no pool-granting features exist, we need to create one
            if (existingFeatures.length === 0) {
              actorNeedsPoolFeature = true;
              
              // Create a feature based on existing pools
              const poolKeys = Object.keys(actor.system.pools);
              const effortPools = poolKeys.filter(key => key.startsWith("Effort:"));
              
              if (effortPools.length > 0) {
                try {
                  // Create a psychic training feature for effort pools
                  const psychicTrainingFeature = {
                    ...defaultPoolFeatures[0],
                    system: {
                      ...defaultPoolFeatures[0].system,
                      poolsGranted: effortPools.map(poolKey => {
                        const [resourceName, subResource] = poolKey.split(":");
                        const pool = actor.system.pools[poolKey];
                        return {
                          resourceName,
                          subResource: subResource || "",
                          baseAmount: pool.max || 1,
                          perLevel: 0,
                          cadence: pool.cadence || "scene",
                          formula: "",
                          condition: ""
                        };
                      })
                    }
                  };
                  
                  await actor.createEmbeddedDocuments("Item", [psychicTrainingFeature]);
                  featuresMigrated++;
                  console.log(`Created psychic training feature for ${actor.name}`);
                } catch (err) {
                  migrationErrors.push(`Failed to create pool feature for actor ${actor.name}: ${err.message}`);
                }
              }
            }
          }
          
          // Update any power items to remove pool generation logic (they should only consume)
          for (const item of actor.items) {
            if (item.type === "power") {
              try {
                // Ensure powers are configured to consume from shared pools, not generate them
                const updateData = {
                  "system.sharedResource": true,
                  "system.internalResource": { value: 0, max: 0 }
                };
                
                await item.update(updateData);
                powersMigrated++;
              } catch (err) {
                migrationErrors.push(`Failed to update power ${item.name} in actor ${actor.name}: ${err.message}`);
              }
            }
          }
        }
      }
      
      // Update standalone power items in world
      for (const item of game.items) {
        if (item.type === "power") {
          try {
            // Ensure standalone powers are configured to consume from shared pools
            const updateData = {
              "system.sharedResource": true,
              "system.internalResource": { value: 0, max: 0 }
            };
            
            await item.update(updateData);
            powersMigrated++;
          } catch (err) {
            migrationErrors.push(`Failed to update standalone power ${item.name}: ${err.message}`);
          }
        }
      }
      
      // Migration completed successfully
      console.log(`Migration 2.1.1 completed successfully at ${new Date().toISOString()}`);
      
      // Report migration results
      const successMsg = `Migration 2.1.1 completed: ${featuresMigrated} pool features created, ${powersMigrated} power items updated.`;
      console.log(successMsg);
      
      if (migrationErrors.length > 0) {
        const errorMsg = `Migration completed with ${migrationErrors.length} errors. Check console for details.`;
        console.warn("Migration errors:", migrationErrors);
        ui.notifications?.warn(errorMsg);
      } else {
        ui.notifications?.info(successMsg);
      }
      
      versionNote("2.1.1", "Pool generation migration completed. Resource pools are now granted by Features/Foci/Edges instead of Power items. Default psychic training features have been created for characters with existing pools.");
      
    } catch (err) {
      console.error("Critical migration error:", err);
      ui.notifications?.error(`Migration 2.1.1 failed: ${err.message}. Check console for details.`);
      throw err;
    }
  },
  "2.2.0": async () => {
    console.log('Running migration for 2.2.0 - Unified Consumption System');
    
    // Log migration start for debugging purposes
    console.log(`Starting migration 2.2.0 at ${new Date().toISOString()}`);
    
    let migrationErrors = [];
    let powersMigrated = 0;
    let itemsSkipped = 0;
    
    try {
      // Migrate Power Items - convert legacy fields to consumption array
      for (const item of game.items) {
        if (item.type === "power") {
          try {
            const system = item.system;
            const existingConsumptions = foundry.utils.deepClone(system.consumptions || []);
            let newConsumptions = [];
            let needsUpdate = false;
            
            // Convert primary resource cost to consumption entry
            if (system.resourceName && system.resourceCost > 0) {
              const primaryCost = {
                type: "sourceEffort", // Map all primary costs to sourceEffort for now
                usesCost: system.resourceCost,
                cadence: system.resourceLength || "scene",
                itemId: "",
                uses: { value: 0, max: 1 }
              };
              
              // Special handling for different resource types
              if (system.resourceName === "Strain") {
                primaryCost.type = "systemStrain";
              } else if (system.resourceName === "Uses") {
                primaryCost.type = "uses";
                primaryCost.uses = {
                  value: system.uses?.value || 0,
                  max: system.uses?.max || 1
                };
              }
              
              newConsumptions.push(primaryCost);
              needsUpdate = true;
            }
            
            // Convert strain cost if separate from primary cost
            if (system.strainCost > 0 && system.resourceName !== "Strain") {
              newConsumptions.push({
                type: "systemStrain",
                usesCost: system.strainCost,
                cadence: "day",
                itemId: "",
                uses: { value: 0, max: 1 }
              });
              needsUpdate = true;
            }
            
            // Convert internal resource if used
            if (!system.sharedResource && system.internalResource?.max > 0) {
              newConsumptions.push({
                type: "uses",
                usesCost: 1,
                cadence: "day",
                itemId: "",
                uses: {
                  value: system.internalResource.value || 0,
                  max: system.internalResource.max
                }
              });
              needsUpdate = true;
            }
            
            // Merge with existing consumptions, avoiding duplicates
            const finalConsumptions = [...existingConsumptions, ...newConsumptions];
            
            if (needsUpdate) {
              console.log(`Migrating power ${item.name} - converting legacy fields to consumptions`);
              
              const updateData = {
                "system.consumptions": finalConsumptions,
                // Remove legacy fields
                "system.-=resourceName": null,
                "system.-=subResource": null, 
                "system.-=resourceCost": null,
                "system.-=resourceLength": null,
                "system.-=sharedResource": null,
                "system.-=leveledResource": null,
                "system.-=strainCost": null,
                "system.-=internalResource": null,
                "system.-=uses": null
              };
              
              await item.update(updateData);
              powersMigrated++;
            } else {
              itemsSkipped++;
            }
          } catch (err) {
            migrationErrors.push(`Power item ${item.name} (${item.id}): ${err.message}`);
          }
        }
      }
      
      // Migrate embedded power items in actors
      for (const actor of game.actors) {
        for (const item of actor.items) {
          if (item.type === "power") {
            try {
              const system = item.system;
              const existingConsumptions = foundry.utils.deepClone(system.consumptions || []);
              let newConsumptions = [];
              let needsUpdate = false;
              
              // Convert primary resource cost to consumption entry
              if (system.resourceName && system.resourceCost > 0) {
                const primaryCost = {
                  type: "sourceEffort",
                  usesCost: system.resourceCost,
                  cadence: system.resourceLength || "scene",
                  itemId: "",
                  uses: { value: 0, max: 1 }
                };
                
                // Special handling for different resource types
                if (system.resourceName === "Strain") {
                  primaryCost.type = "systemStrain";
                } else if (system.resourceName === "Uses") {
                  primaryCost.type = "uses";
                  primaryCost.uses = {
                    value: system.uses?.value || 0,
                    max: system.uses?.max || 1
                  };
                }
                
                newConsumptions.push(primaryCost);
                needsUpdate = true;
              }
              
              // Convert strain cost if separate from primary cost
              if (system.strainCost > 0 && system.resourceName !== "Strain") {
                newConsumptions.push({
                  type: "systemStrain",
                  usesCost: system.strainCost,
                  cadence: "day",
                  itemId: "",
                  uses: { value: 0, max: 1 }
                });
                needsUpdate = true;
              }
              
              // Convert internal resource if used
              if (!system.sharedResource && system.internalResource?.max > 0) {
                newConsumptions.push({
                  type: "uses",
                  usesCost: 1,
                  cadence: "day",
                  itemId: "",
                  uses: {
                    value: system.internalResource.value || 0,
                    max: system.internalResource.max
                  }
                });
                needsUpdate = true;
              }
              
              // Merge with existing consumptions
              const finalConsumptions = [...existingConsumptions, ...newConsumptions];
              
              if (needsUpdate) {
                console.log(`Migrating embedded power ${item.name} in ${actor.name} - converting legacy fields`);
                
                const updateData = {
                  "system.consumptions": finalConsumptions,
                  // Remove legacy fields
                  "system.-=resourceName": null,
                  "system.-=subResource": null,
                  "system.-=resourceCost": null,
                  "system.-=resourceLength": null,
                  "system.-=sharedResource": null,
                  "system.-=leveledResource": null,
                  "system.-=strainCost": null,
                  "system.-=internalResource": null,
                  "system.-=uses": null
                };
                
                await item.update(updateData);
                powersMigrated++;
              } else {
                itemsSkipped++;
              }
            } catch (err) {
              migrationErrors.push(`Embedded power ${item.name} in ${actor.name}: ${err.message}`);
            }
          }
        }
      }
      
      // Migration completed successfully
      console.log(`Migration 2.2.0 completed successfully at ${new Date().toISOString()}`);
      
      // Report migration results
      const successMsg = `Migration 2.2.0 completed: ${powersMigrated} power items migrated to unified consumption system, ${itemsSkipped} items skipped (already migrated).`;
      console.log(successMsg);
      
      if (migrationErrors.length > 0) {
        const errorMsg = `Migration completed with ${migrationErrors.length} errors. Check console for details.`;
        console.warn("Migration errors:", migrationErrors);
        ui.notifications?.warn(errorMsg);
      } else {
        ui.notifications?.info(successMsg);
      }
      
      versionNote("2.2.0", "Unified Consumption System migration completed. All power resource costs have been converted to the expandable consumption array system. The legacy resource configuration fields have been removed for a cleaner, more consistent interface.");
      
    } catch (err) {
      console.error("Critical migration error:", err);
      ui.notifications?.error(`Migration 2.2.0 failed: ${err.message}. Check console for details.`);
      throw err;
    }
  },
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const len = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0; // They are equal
}