/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise} A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function (storedVersion) {
  ui.notifications.info(`Applying SWN/CWN/AWN System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

  // Migrate world depending on the version of the system
  await runMigrationsSequentially(storedVersion);

  // Set the migration as complete
  game.settings.set("swnr", "systemMigrationVersion", game.system.version);
  ui.notifications.info(`SWN System Migration to version ${game.system.version} completed!`, { permanent: true });
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

/**
 * Object containing migration functions keyed by version.
 * Each migration function should perform all necessary updates for that version.
 *
 * @type {Object.<string, function(): Promise<void>>}
 */
const migrations = {
  "2.0.0": async () => {
    console.log('Running migration for 2.0.0');
    for (const item of game.items.contents) {
      if (item.type.toLowerCase() === 'focus' || item.type.toLowerCase() === 'edge') {
        const { description = "", level1 = "", level2 = "", type = "feature"} = item.system;
        const level = 0;
        const newDescription = item.type.toLowerCase() === 'focus'
          ? `${description} ${level1} ${level2}`.trim()
          : description;
      
        const updateData = {
          type: "feature",
          system: {
            description: newDescription,
            level: level,
            type: type
          }
        };

        try {
          await item.update(updateData);
          console.log("Item updated successfully:", updateData);
        } catch (err) {
          console.error("Failed to update item:", err);
        }
      }
    }
  },
  "2.1.0": async () => { console.log('Running migration for 2.1.0'); },
  "2.2.0": async () => { console.log('Running migration for 2.2.0'); },
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