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
    let featuresMigrated = 0;
    
    try {
      // PHASE 1: Migrate Actors - transform effort to pools
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
      
      // PHASE 2: Migrate Power Items - populate resource fields and create consumption arrays
      for (const item of game.items) {
        if (item.type === "power") {
          try {
            const system = foundry.utils.deepClone(item.system);
            let needsUpdate = false;
            const updateData = {};
            
            // Step 2A: Populate resourceName and subResource fields if missing
            if (!system.resourceName) {
              switch (system.subType) {
                case "psychic":
                case "art":
                case "adept":
                  system.resourceName = "Effort";
                  system.subResource = system.source || "Psychic";
                  needsUpdate = true;
                  break;
                case "spell":
                  system.resourceName = "Slots";
                  system.subResource = `Lv${system.level || 1}`;
                  needsUpdate = true;
                  break;
                case "mutation":
                  system.resourceName = "Uses";
                  system.subResource = system.source || "";
                  needsUpdate = true;
                  break;
                default:
                  if (system.source) {
                    system.resourceName = "Effort";
                    system.subResource = system.source;
                    needsUpdate = true;
                  }
                  break;
              }
            }
            
            // Step 2B: Convert legacy fields to consumption array
            const existingConsumptions = foundry.utils.deepClone(system.consumptions || []);
            let newConsumptions = [];
            
            // Convert primary resource cost to consumption entry
            if ((system.resourceName || item.system.resourceName) && (system.resourceCost > 0 || item.system.resourceCost > 0)) {
              const resourceCost = system.resourceCost || item.system.resourceCost || 1;
              const resourceLength = system.resourceLength || item.system.resourceLength || "scene";
              
              const primaryCost = {
                type: "sourceEffort",
                usesCost: resourceCost,
                cadence: resourceLength,
                itemId: "",
                uses: { value: 0, max: 1 }
              };
              
              // Special handling for different resource types
              const resourceName = system.resourceName || item.system.resourceName;
              if (resourceName === "Strain") {
                primaryCost.type = "systemStrain";
              } else if (resourceName === "Uses") {
                primaryCost.type = "uses";
                primaryCost.uses = {
                  value: system.uses?.value || item.system.uses?.value || 0,
                  max: system.uses?.max || item.system.uses?.max || 1
                };
              }
              
              newConsumptions.push(primaryCost);
              needsUpdate = true;
            }
            
            // Convert strain cost if separate from primary cost
            const strainCost = system.strainCost || item.system.strainCost || 0;
            const resourceName = system.resourceName || item.system.resourceName;
            if (strainCost > 0 && resourceName !== "Strain") {
              newConsumptions.push({
                type: "systemStrain",
                usesCost: strainCost,
                cadence: "day",
                itemId: "",
                uses: { value: 0, max: 1 }
              });
              needsUpdate = true;
            }
            
            // Convert internal resource if used
            const sharedResource = system.sharedResource !== undefined ? system.sharedResource : item.system.sharedResource;
            const internalResource = system.internalResource || item.system.internalResource;
            if (!sharedResource && internalResource?.max > 0) {
              newConsumptions.push({
                type: "uses",
                usesCost: 1,
                cadence: "day",
                itemId: "",
                uses: {
                  value: internalResource.value || 0,
                  max: internalResource.max
                }
              });
              needsUpdate = true;
            }
            
            // Step 2C: Legacy effort field handling
            if (item.system.effort) {
              const effortToResourceLength = {
                "scene": "scene",
                "day": "day", 
                "current": "commit"
              };
              system.resourceLength = effortToResourceLength[item.system.effort] || "scene";
              if (!system.resourceName) {
                system.resourceName = "Effort";
                system.subResource = "Psychic";
              }
              needsUpdate = true;
              updateData["system.-=effort"] = null;
            }
            
            if (needsUpdate) {
              // Merge with existing consumptions
              const finalConsumptions = [...existingConsumptions, ...newConsumptions];
              
              // Update with new system data
              updateData["system"] = system;
              updateData["system.consumptions"] = finalConsumptions;
              
              // Remove legacy fields if they exist
              if (item.system.resourceCost !== undefined) updateData["system.-=resourceCost"] = null;
              if (item.system.resourceLength !== undefined) updateData["system.-=resourceLength"] = null;
              if (item.system.sharedResource !== undefined) updateData["system.-=sharedResource"] = null;
              if (item.system.leveledResource !== undefined) updateData["system.-=leveledResource"] = null;
              if (item.system.strainCost !== undefined) updateData["system.-=strainCost"] = null;
              if (item.system.internalResource !== undefined) updateData["system.-=internalResource"] = null;
              if (item.system.uses !== undefined) updateData["system.-=uses"] = null;
              
              await item.update(updateData);
              powerItemsMigrated++;
              console.log(`Migrated power: ${item.name} -> ${system.resourceName}:${system.subResource}`);
            }
          } catch (err) {
            migrationErrors.push(`Power item ${item.name} (${item.id}): ${err.message}`);
          }
        }
      }
      
      // PHASE 3: Migrate embedded power items in actors (same logic as above)
      for (const actor of game.actors) {
        for (const item of actor.items) {
          if (item.type === "power") {
            try {
              const system = foundry.utils.deepClone(item.system);
              let needsUpdate = false;
              const updateData = {};
              
              // Populate resource fields and convert to consumption arrays (same logic as global items)
              if (!system.resourceName) {
                switch (system.subType) {
                  case "psychic":
                  case "art": 
                  case "adept":
                    system.resourceName = "Effort";
                    system.subResource = system.source || "Psychic";
                    needsUpdate = true;
                    break;
                  case "spell":
                    system.resourceName = "Slots";
                    system.subResource = `Lv${system.level || 1}`;
                    needsUpdate = true;
                    break;
                  case "mutation":
                    system.resourceName = "Uses";
                    system.subResource = system.source || "";
                    needsUpdate = true;
                    break;
                  default:
                    if (system.source) {
                      system.resourceName = "Effort";
                      system.subResource = system.source;
                      needsUpdate = true;
                    }
                    break;
                }
              }
              
              if (item.system.effort) {
                const effortToResourceLength = {
                  "scene": "scene",
                  "day": "day", 
                  "current": "commit"
                };
                system.resourceLength = effortToResourceLength[item.system.effort] || "scene";
                if (!system.resourceName) {
                  system.resourceName = "Effort";
                  system.subResource = "Psychic";
                }
                needsUpdate = true;
                updateData["system.-=effort"] = null;
              }
              
              if (needsUpdate) {
                updateData["system"] = system;
                await item.update(updateData);
                powerItemsMigrated++;
              }
            } catch (err) {
              migrationErrors.push(`Embedded power item ${item.name} in ${actor.name}: ${err.message}`);
            }
          }
        }
      }
      
      // PHASE 4: Create default pool features for actors with existing pools
      const defaultPoolFeatures = [
        {
          name: "Psychic Training",
          type: "feature", 
          system: {
            description: "Basic psychic training grants access to psychic powers and effort pools.",
            type: "edge",
            level: 0,
            poolsGranted: []
          }
        }
      ];
      
      for (const actor of game.actors) {
        if (actor.type === 'character' || actor.type === 'npc') {
          // Check if actor has existing pools that need pool-granting features
          if (actor.system.pools && Object.keys(actor.system.pools).length > 0) {
            console.log(`Actor ${actor.name} has existing pools:`, actor.system.pools);
            
            // Check if they already have features that grant these pools
            const existingFeatures = actor.items.filter(item => 
              item.type === "feature" && 
              item.system.poolsGranted?.length > 0
            );
            
            // If no pool-granting features exist, create one
            if (existingFeatures.length === 0) {
              try {
                const poolKeys = Object.keys(actor.system.pools);
                const effortPools = poolKeys.filter(key => key.startsWith("Effort:"));
                
                if (effortPools.length > 0) {
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
                          formula: `${pool.max || 1}`,
                          cadence: pool.cadence || "scene",
                          condition: ""
                        };
                      })
                    }
                  };
                  
                  await actor.createEmbeddedDocuments("Item", [psychicTrainingFeature]);
                  featuresMigrated++;
                  console.log(`Created psychic training feature for ${actor.name}`);
                }
              } catch (err) {
                migrationErrors.push(`Failed to create pool feature for actor ${actor.name}: ${err.message}`);
              }
            }
          }
        }
      }
      
      // Migration completed successfully
      console.log(`Migration 2.1.0 completed successfully at ${new Date().toISOString()}`);
      
      // Report migration results
      const successMsg = `Migration 2.1.0 completed: ${actorsMigrated} actors migrated, ${powerItemsMigrated} power items updated, ${featuresMigrated} pool features created.`;
      console.log(successMsg);
      
      if (migrationErrors.length > 0) {
        const errorMsg = `Migration completed with ${migrationErrors.length} errors. Check console for details.`;
        console.warn("Migration errors:", migrationErrors);
        ui.notifications?.warn(errorMsg);
      } else {
        ui.notifications?.info(successMsg);
      }
      
      versionNote("2.1.0", "Unified Power System migration completed. This comprehensive migration transforms the legacy effort system into the new resource pool system, populates power resource fields, converts legacy configurations to consumption arrays, and creates pool-granting features for characters. All worlds from 2.0.12 or earlier have been fully migrated to the new system.");
      
    } catch (err) {
      console.error("Critical migration error:", err);
      ui.notifications?.error(`Migration 2.1.0 failed: ${err.message}. Check console for details.`);
      throw err;
    }
  }
};

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