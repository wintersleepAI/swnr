/**
 * Language Provider for Polyglot module integration
 * Provides language information for SWNR actors to the Polyglot module
 */
export class SWNRLanguageProvider {
  /**
   * @param {string} id - The provider ID (e.g., "system.swnr")
   */
  constructor(id) {
    this.id = id;
    // Polyglot expects a settings property - empty object means no additional settings
    this.settings = {};
    // Polyglot expects a languages property - populated during initialization
    this.languages = {};
    // Flag to indicate we don't need to wait for ready hook
    this.requiresReady = false;
  }

  /**
   * Called by Polyglot during init hook
   * Used to perform initial setup
   */
  init() {
    // Initial setup - languages will be populated in i18nInit
  }

  /**
   * Called by Polyglot during i18n initialization
   * Used to set up any localization-dependent properties
   */
  i18nInit() {
    // Populate languages during initialization
    this.languages = this.getLanguages();
  }

  /**
   * Called by Polyglot during setup hook
   * Used to perform any setup that requires game data
   */
  setup() {
    // Refresh languages in case settings changed
    this.languages = this.getLanguages();
  }

  /**
   * Called by Polyglot during ready hook
   * Used to perform any final initialization after all systems are ready
   */
  ready() {
    // Final refresh of languages
    this.languages = this.getLanguages();
  }

  /**
   * Returns filtered users (required by Polyglot)
   * @param {Array} ownedActors - Array of owned actors
   * @returns {Array} Filtered users
   */
  filterUsers(ownedActors) {
    return game.users.players.filter((u) => u.hasRole(CONST.USER_ROLES.PLAYER));
  }

  /**
   * Get languages for an actor
   * @param {Actor} actor - The actor to get languages for
   * @returns {Array<Set<string>>} Array of two Sets: [knownLanguages, literateLanguages]
   */
  getUserLanguages(actor) {
    const knownLanguages = new Set();
    const literateLanguages = new Set();

    if (!actor) return [knownLanguages, literateLanguages];

    // Both characters and NPCs have system.languages array field
    const languages = actor.system?.languages || [];

    // Add all languages to both known and literate
    // SWNR doesn't distinguish between spoken and written
    for (const lang of languages) {
      if (lang && typeof lang === 'string') {
        knownLanguages.add(lang);
        literateLanguages.add(lang);
      }
    }

    return [knownLanguages, literateLanguages];
  }

  /**
   * Get all available languages in the world
   * @returns {Object} Object mapping language codes to language objects with label and font
   */
  getLanguages() {
    // Safely get language list with fallback
    let languageList = [];
    try {
      languageList = game.settings.get("swnr", "parsedLanguageList") || [];
      console.log("SWNR Language Provider | Raw language list:", languageList);
    } catch (error) {
      console.warn("SWNR Language Provider | Could not get language list:", error);
    }

    // Return as object with language objects containing label and font properties
    const languages = {};
    for (const lang of languageList) {
      if (lang && typeof lang === 'string') {
        languages[lang] = {
          label: lang,
          font: "default" // Reference the font key from our fonts getter
        };
      }
    }

    // Always include "Common" as fallback if no languages configured
    if (Object.keys(languages).length === 0) {
      languages["Common"] = {
        label: "Common",
        font: "default"
      };
    }

    console.log("SWNR Language Provider | Returning languages:", languages);
    return languages;
  }

  /**
   * Get the default language for the system
   * @returns {string} The default language code
   */
  getSystemDefaultLanguage() {
    const languageList = game.settings.get("swnr", "parsedLanguageList") || [];

    // Return first language in list, or "Common" if none configured
    return languageList[0] || "Common";
  }

  /**
   * Get conditions for understanding languages
   * This is called to determine if an actor can understand a message
   * @param {Actor} actor - The actor
   * @param {string} lang - The language to check
   * @returns {boolean} Whether the actor understands this language
   */
  conditions(actor, lang) {
    const [knownLanguages, literateLanguages] = this.getUserLanguages(actor);
    return knownLanguages.has(lang);
  }

  /**
   * Add a language (used by Polyglot's language management)
   * SWNR manages languages through actor sheets, so this is a no-op
   * @param {string} lang - Language to add
   */
  addLanguage(lang) {
    // Languages are managed through SWNR settings and actor sheets
    // Polyglot calls this for its own language management
  }

  /**
   * Remove a language (used by Polyglot's language management)
   * SWNR manages languages through actor sheets, so this is a no-op
   * @param {string} lang - Language to remove
   */
  removeLanguage(lang) {
    // Languages are managed through SWNR settings and actor sheets
    // Polyglot calls this for its own language management
  }

  /**
   * Get language font (for script rendering)
   * @param {string} lang - Language code
   * @returns {string} Font name
   */
  getLanguageFont(lang) {
    // Return the default font key that matches our fonts getter
    return "default";
  }

  /**
   * Load languages (called during initialization)
   * @returns {Object} Languages object
   */
  loadLanguages() {
    this.languages = this.getLanguages();
    return this.languages;
  }

  /**
   * Reload languages (called when settings change)
   * @returns {Object} Languages object
   */
  reloadLanguages() {
    this.languages = this.getLanguages();
    return this.languages;
  }

  /**
   * Get default language
   * @returns {string} Default language code
   */
  get defaultLanguage() {
    return this.getSystemDefaultLanguage();
  }

  /**
   * Get fonts object (for script rendering)
   * @returns {Object} Font definitions for Polyglot
   */
  get fonts() {
    return {
      "default": {
        fontFamily: "Thorass",
        alphabeticOnly: false,
        logographical: false
      }
    };
  }

  /**
   * Get alphabets object (for script rendering)
   * @returns {Object} Empty object - SWNR uses default alphabets
   */
  get alphabets() {
    return {};
  }

  /**
   * Get default font
   * @returns {string|undefined} Default font name
   */
  get defaultFont() {
    return undefined;
  }
}
