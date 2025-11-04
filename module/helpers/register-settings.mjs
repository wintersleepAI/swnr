/**
 * Get predefined language lists based on preset selection
 * @param {string} preset - The preset type ("none", "earth", "wwn", "both")
 * @returns {Array<string>} Array of language names
 */
function getLanguagePresetList(preset) {
  const earthLanguages = [
    "English", "Mandarin Chinese", "Hindi", "Spanish", "French", 
    "Standard Arabic", "Bengali", "Portuguese", "Russian", "Japanese"
  ];
  
  const wwnLanguages = [
    "Trade Cant", "Old Vothian", "Brass Speech", "Emedian", 
    "Thurian", "Anak Speech", "Predecessant", "Preterite"
  ];
  
  switch (preset) {
    case "earth":
      return earthLanguages;
    case "wwn":
      return wwnLanguages;
    case "both":
      return [...earthLanguages, ...wwnLanguages];
    default:
      return [];
  }
}

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

  game.settings.register("swnr", "showAccess", {
    name: "swnr.settings.showAccess",
    hint: "swnr.settings.showAccessHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // game.settings.register("swnr", "search", {
  //   name: "swnr.settings.search",
  //   hint: "swnr.settings.searchHint",
  //   scope: "world",
  //   config: true,
  //   type: String,
  //   choices: {
  //     swnOnly: "Defined SWN Compendium Only",
  //     cwnOnly: "Defined CWN Compendium Only",
  //     swnCWN: "Defined SWN AND CWN Compendium",
  //     search: "Compendium with the matching type exclusively",
  //   },
  //   default: "swnOnly", // The default value for the setting
  //   onChange: (value) => {
  //     // A callback function which triggers when the setting is changed
  //   },
  // });

  //AWN Settings
  game.settings.register("swnr", "useStress", {
    name: "swnr.settings.useStress",
    hint: "swnr.settings.useStressHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("swnr", "useAWNVehicle", {
    name: "swnr.settings.useAWNVehicle",
    hint: "swnr.settings.useAWNVehicle",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("swnr", "useAWNGearCondition", {
    name: "swnr.settings.useAWNGearCondition",
    hint: "swnr.settings.useAWNGearConditionHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Language Settings
  game.settings.register("swnr", "languagePresetSelector", {
    name: "swnr.settings.languagePresetSelector",
    hint: "swnr.settings.languagePresetSelectorHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "none": "swnr.settings.languagePresets.none",
      "earth": "swnr.settings.languagePresets.earth",
      "wwn": "swnr.settings.languagePresets.wwn",
      "both": "swnr.settings.languagePresets.both"
    },
    default: "none"
  });

  game.settings.register("swnr", "availableLanguages", {
    name: "swnr.settings.availableLanguages",
    hint: "swnr.settings.availableLanguagesHint", 
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: (value) => {
      // Parse the language string for use by sheets
      const languageList = value ? value.split(",").map(lang => lang.trim()).filter(lang => lang) : [];
      // Store the parsed list for easy access
      game.settings.set("swnr", "parsedLanguageList", languageList);
    }
  });

  game.settings.register("swnr", "parsedLanguageList", {
    name: "Parsed Language List",
    scope: "world", 
    config: false,
    type: Array,
    default: []
  });

  game.settings.register("swnr", "showTempPoolModifiers", {
    name: "swnr.settings.showTempPoolModifiers",
    hint: "swnr.settings.showTempPoolModifiersHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
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
    useStress: game.settings.get("swnr", "useStress"),
    useAWNVehicle: game.settings.get("swnr", "useAWNVehicle"),
    useAWNGearCondition: game.settings.get("swnr", "useAWNGearCondition"),
    showAccess: game.settings.get("swnr", "showAccess"),
    // search: game.settings.get("swnr", "search"),
    languagePresetSelector: game.settings.get("swnr", "languagePresetSelector"),
    availableLanguages: game.settings.get("swnr", "availableLanguages"),
    parsedLanguageList: game.settings.get("swnr", "parsedLanguageList"),
    showTempPoolModifiers: game.settings.get("swnr", "showTempPoolModifiers"),
  };
  return settings;
};

/**
 * Add a language preset to the available languages list
 * @param {string} preset - The preset type to add
 */
export function addLanguagePreset(preset) {
  const presetLanguages = getLanguagePresetList(preset);
  
  if (presetLanguages.length === 0) {
    ui.notifications.warn("No languages to add from this preset.");
    return;
  }
  
  const currentLanguages = game.settings.get("swnr", "availableLanguages");
  const currentList = currentLanguages ? currentLanguages.split(",").map(lang => lang.trim()).filter(lang => lang) : [];
  
  // Add new languages (avoiding duplicates)
  const newLanguages = presetLanguages.filter(lang => !currentList.includes(lang));
  
  if (newLanguages.length === 0) {
    ui.notifications.info("All languages from this preset are already in your list.");
    return;
  }
  
  const updatedList = [...currentList, ...newLanguages];
  const languageString = updatedList.join(", ");
  
  game.settings.set("swnr", "availableLanguages", languageString);
  ui.notifications.info(`Added ${newLanguages.length} language(s): ${newLanguages.join(", ")}`);
}
