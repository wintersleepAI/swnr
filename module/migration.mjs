/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise} A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function () {
  ui.notifications.info(`Applying SWN/CWN/AWN System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

  for (const item of game.items.contents) {
    if (item.type === 'Focus' || item.type === 'Edge') {
      await migrateFocusAndEdgeToFeature(item);
    }
  }

  // Set the migration as complete
  game.settings.set("swnr", "systemMigrationVersion", game.system.version);
  ui.notifications.info(`SWN System Migration to version ${game.system.version} completed!`, { permanent: true });
};

/**
 * Apply migration to Focus/Edge and convert to Feature
 * @param {Item} item to be migrated.
 */
async function migrateFocusAndEdgeToFeature(item) {
  const { description = "", level1 = "", level2 = "" } = item.system;
  const level = 0;
  const newDescription = item.type === 'Focus'
    ? `${description} ${level1} ${level2}`.trim()
    : description;

  const updateData = {
    type: "feature",
    system: {
      description: newDescription,
      level: level
    }
  };

  try {
    // Update the item with the new values
    const updatedItem = await item.update(updateData);
    console.log("Item updated successfully:", updatedItem);
  } catch (err) {
    console.error("Failed to update item:", err);
  }
}