export const registerSettings = function () {
    // Register any custom system settings here
  
    /**
     * Track the system version upon which point a migration was last applied
     */
    game.settings.register("swnr", "systemMigrationVersion", {
      name: "System Migration Version",
      scope: "world",
      config: false,
      type: String,
      default: "0.0",
    });
  
    game.settings.register("swnr", "useHomebrewLuckSave", {
      name: "swnr.settings.useHomebrewLuckSave",
      hint: "swnr.settings.useHomebrewLuckSaveHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
    });
  
    game.settings.register("swnr", "useRollNPCHD", {
      name: "swnr.settings.useRollNPCHD",
      hint: "swnr.settings.useRollNPCHDHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
    });
  
    game.settings.register("swnr", "addShockMessage", {
      name: "swnr.settings.addShockMessage",
      hint: "swnr.settings.addShockMessageHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
    });

    // TODO wsAI : not used currently
    // game.settings.register("swnr", "showTempAttrMod", {
    //   name: "swnr.settings.showTempAttrMod",
    //   hint: "swnr.settings.showTempAttrModHint",
    //   scope: "world",
    //   config: true,
    //   type: Boolean,
    //   default: true,
    // });
  
    game.settings.register("swnr", "attrRoll", {
      name: "swnr.settings.attrRoll",
      hint: "swnr.settings.attrRollHint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        // If choices are defined, the resulting setting will be a select menu
        // TODO wsAI : not used currently
        // "none": game.i18n.localize("swnr.settings.attrRollNo"),
        "d20": game.i18n.localize("swnr.settings.attrRolld20"),
        // "2d6": game.i18n.localize("swnr.settings.attrRoll2d6"),
        // "d20under": game.i18n.localize("swnr.settings.attrRollUnder"),
        // "d20underEqual": game.i18n.localize("swnr.settings.attrRollUnderEqual"),
      },
      default: "d20", // The default value for the setting
      onChange: (value) => {
        // A callback function which triggers when the setting is changed
      },
    });
  
    game.settings.register("swnr", "attackRoll", {
      name: "swnr.settings.attackRoll",
      hint: "swnr.settings.attackRollHint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        // If choices are defined, the resulting setting will be a select menu
        "d20": "d20",
        "2d6": "2d6",
      },
      default: "d20", // The default value for the setting
    });
  
    //CWN Settings
    game.settings.register("swnr", "useTrauma", {
      name: "swnr.settings.useTrauma",
      hint: "swnr.settings.useTraumaHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
    });
  
    game.settings.register("swnr", "useCWNArmor", {
      name: "swnr.settings.useCWNArmor",
      hint: "swnr.settings.useCWNArmorHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
    });
  
    game.settings.register("swnr", "useCWNCyber", {
      name: "swnr.settings.useCWNCyber",
      hint: "swnr.settings.useCWNCyberHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
    });
  
    game.settings.register("swnr", "search", {
      name: "swnr.settings.search",
      hint: "swnr.settings.searchHint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        swnOnly: "Defined SWN Compendium Only",
        cwnOnly: "Defined CWN Compendium Only",
        swnCWN: "Defined SWN AND SWN Compendium",
        search: "Compendium with the matching type exclusively",
      },
      default: "swnOnly", // The default value for the setting
      onChange: (value) => {
        // A callback function which triggers when the setting is changed
      },
    });
};
  
export const getGameSettings = function () {
  let settings = {
    systemMigrationVersion: game.settings.get("swnr", "systemMigrationVersion"),
    useHomebrewLuckSave: game.settings.get("swnr", "useHomebrewLuckSave"),
    useRollNPCHD: game.settings.get("swnr", "useRollNPCHD"),
    addShockMessage: game.settings.get("swnr", "addShockMessage"),
    //showTempAttrMod: game.settings.get("swnr", "showTempAttrMod"),
    attrRoll: game.settings.get("swnr", "attrRoll"),
    attackRoll: game.settings.get("swnr", "attackRoll"),
    useTrauma: game.settings.get("swnr", "useTrauma"),
    useCWNArmor: game.settings.get("swnr", "useCWNArmor"),
    useCWNCyber: game.settings.get("swnr", "useCWNCyber"),
    search: game.settings.get("swnr", "search"),
  };
  return settings;
};
