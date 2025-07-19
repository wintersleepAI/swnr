// Import document classes.
import { SWNActor } from './documents/actor.mjs';
import { SWNItem } from './documents/item.mjs';
// Import sheet classes.
import { SWNActorSheet } from './sheets/actor-sheet.mjs';
import { SWNItemSheet } from './sheets/item-sheet.mjs';
import { SWNVehicleSheet } from './sheets/vehicle-sheet.mjs';
import { SWNCyberdeckSheet } from './sheets/cyberdeck-sheet.mjs';
import { SWNFactionSheet } from './sheets/faction-sheet.mjs';

// Import helper/utility classes and constants.
import { SWN } from './helpers/config.mjs';
import { registerSettings } from './helpers/register-settings.mjs';
import { registerHandlebarHelpers } from './helpers/handlebar.mjs';
import { chatListeners, welcomeMessage } from './helpers/chat.mjs';
import * as refreshHelpers from './helpers/refresh-helpers.mjs';
import * as testHelpers from './helpers/test-helpers.mjs';

// Import dialog classes
import PoolOverrideDialog from './dialogs/pool-override-dialog.mjs';

// Import DataModel classes
import * as models from './data/_module.mjs';

// Import migrations
import * as migrations from './migration.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.swnr = {
  documents: {
    SWNActor,
    SWNItem,
  },
  applications: {
    SWNActorSheet,
    SWNItemSheet,
    PoolOverrideDialog,
  },
  utils: {
    rollItemMacro,
    ...refreshHelpers,
    ...testHelpers,
  },
  models,
};

Hooks.once('init', function () {
  // Add custom constants for configuration.
  CONFIG.SWN = SWN;

  // Initialize power usage mutex system
  CONFIG.SWN.poolMutex = new Map();
  CONFIG.SWN.poolResourceNames = ["Effort", "Slots", "Points", "Strain", "Uses"];

  registerSettings();

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d8 + @stats.dex.mod',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = SWNActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.SWNCharacter,
    npc: models.SWNNPC,
    ship: models.SWNShip,
    mech: models.SWNMech,
    drone: models.SWNDrone,
    cyberdeck: models.SWNCyberdeck,
    faction: models.SWNFaction,
    vehicle: models.SWNVehicle
  };
  CONFIG.Item.documentClass = SWNItem;
  CONFIG.Item.dataModels = {
    item: models.SWNItemItem,
    feature: models.SWNFeature,
    power: models.SWNPower,
    skill: models.SWNSkill,
    armor: models.SWNArmor,
    weapon: models.SWNWeapon,
    cyberware: models.SWNCyberware,
    program: models.SWNProgram,
    asset: models.SWNAsset,
    power: models.SWNPower,
    shipWeapon: models.SWNShipWeapon,
    shipFitting: models.SWNShipFitting,
    shipDefense: models.SWNShipDefense
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('swnr', SWNActorSheet, {
    makeDefault: true,
    label: 'SWN.SheetLabels.Actor',
    types: ['character', 'npc'],
  });
  Actors.registerSheet('swnr', SWNVehicleSheet, {
    makeDefault: true,
    label: 'SWN.SheetLabels.Vehicle',
    types: ['ship', 'mech', 'drone', 'vehicle'],
  });
  Actors.registerSheet('swnr', SWNCyberdeckSheet, {
    makeDefault: true,
    label: 'SWN.SheetLabels.Cyberdeck',
    types: ['cyberdeck']
  });
  Actors.registerSheet('swnr', SWNFactionSheet, {
    makeDefault: true,
    label: 'SWN.SheetLabels.Faction',
    types: ['faction']
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('swnr', SWNItemSheet, {
    makeDefault: true,
    label: 'SWN.SheetLabels.Item',
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

registerHandlebarHelpers();


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (_bar, data, slot) => {

    if (data.type === 'Item' && (data.uuid?.includes('Actor.') || data.uuid?.includes('Token.'))) {
      createDocMacro(data, slot);
      return false;
    }

    return true;
  });

  if (!game.user.isGM) {
    return;
  }

  const storedVersion = game.settings.get('swnr', 'systemMigrationVersion');
  const currentVersion = game.system.version;

  // If there's no stored version, set it to the current system version (and don't migrate)
  if (!storedVersion) {
    return game.settings.set('swnr', 'systemMigrationVersion', currentVersion);
  }

  // If the stored version doesn't match the current system version, run migration
  if (storedVersion !== currentVersion) {
    welcomeMessage();
    migrations.migrateWorld(storedVersion);
    game.settings.set('swnr', 'systemMigrationVersion', currentVersion);
  }

  // Override initiative roll method (consolidated from duplicate hook)
  const originalGetInitiativeRoll = Combatant.prototype.getInitiativeRoll;
  Combatant.prototype.getInitiativeRoll = function () {
    if (this.actor?.rollInitiative) {
      return this.actor.rollInitiative();
    }
    return originalGetInitiativeRoll.call(this);
  };
});

/* -------------------------------------------- */
/* Chat Listeners                               */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", (message, html, _data) =>
  chatListeners(message, html)
);

/* -------------------------------------------- */
/* Other Hooks                                */
/* -------------------------------------------- */
Hooks.on("createToken", (document, _options, userId) => {
  if (game.settings.get("swnr", "useRollNPCHD")) {
    if (game.user?.isGM && game.userId === userId) {
      if (document.actor?.type == "npc") {
        document.actor.system.rollHitDice(false);
      }
    }
  }
});



/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `swnr.utils.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'swnr.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/* -------------------------------------------- */
/*  Pool Refresh Hook Integration               */
/* -------------------------------------------- */

// Combat end - trigger scene refresh
Hooks.on("deleteCombat", async (combat, options, userId) => {
  if (game.user.isGM && combat.scene === canvas.scene) {
    console.log("[SWN Refresh] Combat ended, triggering scene refresh");
    await globalThis.swnr.refreshScene();
  }
});

// Long rest integration (if available)
Hooks.on("swnr.rest", async (restType) => {
  if (game.user.isGM) {
    console.log(`[SWN Refresh] Rest triggered: ${restType}`);
    if (restType === "long" || restType === "full") {
      await globalThis.swnr.refreshRest();
    }
  }
});

// Daily refresh on new day (time-based if available)
Hooks.on("swnr.newDay", async () => {
  if (game.user.isGM) {
    console.log("[SWN Refresh] New day triggered");
    await globalThis.swnr.refreshDay();
  }
});

// Integration with Simple Calendar module if available
Hooks.on("swnr.timeAdvanced", async (advancement) => {
  if (game.user.isGM && advancement.days > 0) {
    console.log("[SWN Refresh] Time advanced by days, triggering refresh");
    await globalThis.swnr.refreshDay();
  }
});

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
