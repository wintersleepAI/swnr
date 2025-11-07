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

  // Currency Settings----------------------------------------------------------
  // TO add a currency setting, you need to add:
  // Setting here
  // Setting in getGameSettings 
  // Add input to currency-settings.hbs
  // Add field to CurrencyFormModel

  game.settings.register("swnr", "baseCurrencyName", {
    name: "swnr.settings.currency.baseName",
    hint: "swnr.settings.currency.baseNameHint",
    scope: "world",
    config: false, // restrict to menu
    // type: String,
    default: "Credits",
    type: String,
    // Does not seem to work as is.
    // requiresReload: true,
  });

  game.settings.register("swnr", "baseCurrencyEnc", {
    name: "swnr.settings.currency.baseEnc",
    hint: "swnr.settings.currency.baseEncHint",
    scope: "world",
    config: false, // restrict to menu
    // type: String,
    // default: "Credits",
    type: Number,
    default: 0,        // can be used to set up the default structure
    // requiresReload: true,
  });


  for (let i = 0; i < CONFIG.SWN.maxCustomCurrencyTypes; i++) {
    game.settings.register("swnr", `customCurrencyName${i}`, {
      name: `swnr.settings.currency.customName`,
      hint: `swnr.settings.currency.customNameHint`,
      scope: "world",
      config: false, // restrict to menu
      type: String,
      default: "",
    });

    game.settings.register("swnr", `customCurrencyEnc${i}`, {
      name: `swnr.settings.currency.customEnc`,
      hint: `swnr.settings.currency.customEncHint`,
      scope: "world",
      config: false, // restrict to menu
      type: Number,
      default: 0,
    });

    game.settings.register("swnr", `customCurrencyConversionRate${i}`, {
      name: `swnr.settings.currency.customConversionRate`,
      hint: `swnr.settings.currency.customConversionRateHint`,
      scope: "world",
      config: false, // restrict to menu
      type: Number,
      default: 0,
    });
  }
  game.settings.registerMenu("swnr", "currencySettingsMenu", {
    name: "swnr.settings.currency.title",
    label: "swnr.settings.currency.title",      // The text label used in the button
    hint: "swnr.settings.currency.titleHint",
    icon: "fas fa-bars",               // A Font Awesome icon used in the submenu button
    type: CurrencySubmenuApplicationClass,   // A FormApplication subclass, defined at the bottom.
    restricted: true                   // Restrict this submenu to gamemaster only?
  });

  // End Currency Settings----------------------------------------------------------

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
    currency: {
      baseCurrencyName: game.settings.get("swnr", "baseCurrencyName"),
      baseCurrencyEnc: game.settings.get("swnr", "baseCurrencyEnc"),
    }
  };
  for (let i = 0; i < CONFIG.SWN.maxCustomCurrencyTypes; i++) {
    settings.currency[`customCurrencyName${i}`] = game.settings.get("swnr", `customCurrencyName${i}`);
    settings.currency[`customCurrencyEnc${i}`] = game.settings.get("swnr", `customCurrencyEnc${i}`);
    settings.currency[`customCurrencyConversionRate${i}`] = game.settings.get("swnr", `customCurrencyConversionRate${i}`);
  }
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

/**
 * For more information about FormApplications, see:
 * https://foundryvtt.wiki/en/development/guides/understanding-form-applications
 * https://foundryvtt.wiki/en/development/guides/applicationV2-conversion-guide
 * https://foundryvtt.wiki/en/development/guides/converting-to-appv2
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { fields } = foundry.data;

export class CurrencyFormModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const schema = {
      baseCurrencyName: new fields.StringField({ label: "swnr.settings.currency.baseName", hint: "swnr.settings.currency.baseNameHint", required: true }),
      baseCurrencyEnc: new foundry.data.fields.NumberField({
        label: "swnr.settings.currency.baseEnc",
        hint: "swnr.settings.currency.baseEncHint",
        min: 0, max: 100, step: 1,
        initial: 0, nullable: false
      }),
      // 5 custom currencies
      customCurrencyName0: new fields.StringField({ label: `swnr.settings.currency.customName`, hint: `swnr.settings.currency.customNameHint`, required: false }),
      customCurrencyEnc0: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customEnc`, hint: `swnr.settings.currency.customEncHint`, min: 0, max: 100, step: 1, initial: 0, nullable: false }),
      customCurrencyConversionRate0: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customConversionRate`, hint: `swnr.settings.currency.customConversionRateHint`, min: -100, max: 100, step: 1, initial: 10, nullable: false }),
      customCurrencyName1: new fields.StringField({ label: `swnr.settings.currency.customName`, hint: `swnr.settings.currency.customNameHint`, required: false }),
      customCurrencyEnc1: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customEnc`, hint: `swnr.settings.currency.customEncHint`, min: 0, max: 100, step: 1, initial: 0, nullable: false }),
      customCurrencyConversionRate1: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customConversionRate`, hint: `swnr.settings.currency.customConversionRateHint`, min: -100, max: 100, step: 1, initial: 10, nullable: false }),
      customCurrencyName2: new fields.StringField({ label: `swnr.settings.currency.customName`, hint: `swnr.settings.currency.customNameHint`, required: false }),
      customCurrencyEnc2: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customEnc`, hint: `swnr.settings.currency.customEncHint`, min: 0, max: 100, step: 1, initial: 0, nullable: false }),
      customCurrencyConversionRate2: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customConversionRate`, hint: `swnr.settings.currency.customConversionRateHint`, min: -100, max: 100, step: 1, initial: 10, nullable: false }),
      customCurrencyName3: new fields.StringField({ label: `swnr.settings.currency.customName`, hint: `swnr.settings.currency.customNameHint`, required: false }),
      customCurrencyEnc3: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customEnc`, hint: `swnr.settings.currency.customEncHint`, min: 0, max: 100, step: 1, initial: 0, nullable: false }),
      customCurrencyConversionRate3: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customConversionRate`, hint: `swnr.settings.currency.customConversionRateHint`, min: -100, max: 100, step: 1, initial: 10, nullable: false }),
      customCurrencyName4: new fields.StringField({ label: `swnr.settings.currency.customName`, hint: `swnr.settings.currency.customNameHint`, required: false }),
      customCurrencyEnc4: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customEnc`, hint: `swnr.settings.currency.customEncHint`, min: 0, max: 100, step: 1, initial: 0, nullable: false }),
      customCurrencyConversionRate4: new foundry.data.fields.NumberField({ label: `swnr.settings.currency.customConversionRate`, hint: `swnr.settings.currency.customConversionRateHint`, min: -100, max: 100, step: 1, initial: 10, nullable: false }),
    };

    return schema;
  }
}

class CurrencySubmenuApplicationClass extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "currency-settings-form",
    form: {
      handler: CurrencySubmenuApplicationClass.#onSubmit,
      closeOnSubmit: true,
      submitOnChange: false,
      // closeOnSubmit: true
    },
    position: {
      width: 640,
      height: "auto",
    },
    tag: "form", // The default is "div"
    window: {
      icon: "fas fa-gear", // You can now add an icon to the header
      contentClasses: ["standard-form"],
      title: "swnr.settings.currency.title"
    },
    classes: ['swnr', 'settings-form', 'currency-settings'],

  }

  constructor(data = {}, options = {}) {
    super(options);
    this.model = new CurrencyFormModel(data);  // holds values, validates, etc.
  }

  static PARTS = {
    form: {
      template: "systems/swnr/templates/dialogs/currency-settings.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("select[name=loadPreset]").addEventListener("change", this._onLoadPresetChange.bind(this));
  }
  async _onLoadPresetChange(event) {
    event.preventDefault();
    const value = event.target.value;
    if (value === "none") {
      return;
    }
    ui.notifications.info(`Loading preset: ${value}`);
    //TODO 
    // - Set the base currency name and encumbrance

  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    // context.baseCurrencyName = game.settings.get("swnr", "baseCurrencyName");
    context.settings = getGameSettings();
    // For formInput and formFields helpers
    // Necessary for formInput and formFields helpers
    context.fields = this.model.schema.fields;

    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "Save" },
      { type: "cancel", icon: "fa-solid fa-circle-x", label: "Cancel" }
    ];
    return context;
  }

  // _updateObject(event, formData) {
  //   const data = expandObject(formData);
  //   game.settings.set('swnr', 'baseCurrencyName', data);
  // }

  static async #onSubmit(event, form, formData) {
    if (event.type === "submit") {
      const settings = foundry.utils.expandObject(formData.object);
      for (const [key, value] of Object.entries(settings)) {
        if (key !== "submit" && key !== "cancel" && key !== "loadPreset") {
          await game.settings.set("swnr", key, value);
        }
      }
    }
  }
}