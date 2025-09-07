import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { getGameSettings } from '../helpers/register-settings.mjs';
import { headerFieldWidget, groupFieldWidget } from '../helpers/handlebar.mjs';
import { initSkills, initCompendSkills, calcMod } from '../helpers/utils.mjs';
import { SWNBaseSheet } from './base-sheet.mjs';


const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNActorSheet extends SWNBaseSheet {
  // Private properties
  #toggleLock = false;
  static #expandedDescriptions = {};
  static #expandedPoolTempModifiers = {};

  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'actor'],
    position: {
      width: 780,
      height: 800,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      reload: this._onReload,
      creditChange: this._onCreditChange,
      addUse: this._onAddUse,
      removeUse: this._onRemoveUse,
      rest: this._onRest,
      scene: this._onScene,
      rollSave: this._onRollSave,
      loadSkills: this._loadSkills,
      rollSkill: this._onSkillRoll,
      skillUp: this._onSkillUp,
      hitDice: this._onHitDice,
      toggleArmor: this._toggleArmor,
      toggleContainer: this._toggleContainer,
      toggleLock: this._toggleLock,
      toggleItemDescription: this._onToggleItemDescription,
      rollStats: this._onRollStats,
      toggleSection: this._toggleSection,
      reactionRoll: this._onReactionRoll,
      moraleRoll: this._onMoraleRoll,
      resourceCreate: this._onResourceCreate,
      resourceDelete: this._onResourceDelete,
      releaseCommitment: this._onReleaseCommitment,
      resetPowerUses: this._onResetPowerUses,
      togglePoolTempModifiers: this._onTogglePoolTempModifiers,
      addLanguage: this._onAddLanguage,
      removeLanguage: this._onRemoveLanguage,
      toggleLanguageAdd: this._onToggleLanguageAdd,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/swnr/templates/actor/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    features: {
      template: 'systems/swnr/templates/actor/features.hbs',
    },
    biography: {
      template: 'systems/swnr/templates/actor/biography.hbs',
    },
    gear: {
      template: 'systems/swnr/templates/actor/gear.hbs',
    },
    powers: {
      template: 'systems/swnr/templates/actor/powers.hbs',
    },
    effects: {
      template: 'systems/swnr/templates/actor/effects.hbs',
    },
    combat: {
      template: 'systems/swnr/templates/actor/combat.hbs',
    },
    npc: {
      template: 'systems/swnr/templates/actor/npc.hbs',
    },
    skills: {
      template: 'systems/swnr/templates/actor/skills.hbs',
    },
    // FRAGMENTS
    itemsList: {
      template: 'systems/swnr/templates/actor/fragments/items-list.hbs',
    },
    consumablesList: {
      template: 'systems/swnr/templates/actor/fragments/consumable-list.hbs',
    },
    poolsDisplay: {
      template: 'systems/swnr/templates/actor/fragments/pools-display.hbs',
    },
    skillFrag: {
      template: 'systems/swnr/templates/actor/fragments/skill.hbs',
    },
    cyberList: {
      template: 'systems/swnr/templates/actor/fragments/cyberware-list.hbs',
    },
    compactWeaponList: {
      template: 'systems/swnr/templates/actor/fragments/compact-weapon-list.hbs',
    },
    compactArmorList: {
      template: 'systems/swnr/templates/actor/fragments/compact-armor-list.hbs',
    },
    compactAbilitiesList: {
      template: 'systems/swnr/templates/actor/fragments/compact-abilities-list.hbs',
    },
    compactCarriedList: {
      template: 'systems/swnr/templates/actor/fragments/compact-carried-list.hbs',
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    //wsai adding to allow setting default tab
    options.defaultTab = 'gear';

    // Not all parts always render
    options.parts = ['header', 'tabs', 'biography'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'character':
        // Check if any power toggles are enabled to show powers tab
        const showAnyPowerType = this.document.system.tweak.showPsychic || 
                                this.document.system.tweak.showArts || 
                                this.document.system.tweak.showSpells || 
                                this.document.system.tweak.showAdept || 
                                this.document.system.tweak.showMutation ||
                                this.document.system.tweak.showCyberware;
        
        // Base tabs for characters
        options.parts.push('combat', 'features', 'gear');
        
        // Only add powers tab if any power type toggles are enabled
        if (showAnyPowerType) {
          options.parts.push('powers');
        }
        
        options.parts.push('effects');
        options.defaultTab = 'combat';
        break;
      case 'npc':
        options.parts.push('npc', 'features', 'powers', 'gear', 'effects');
        options.defaultTab = 'npc';
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.SWN
      config: CONFIG.SWN,
      tabs: this._getTabs(options.parts, options.defaultTab),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      gameSettings: getGameSettings(),
      headerWidget: headerFieldWidget.bind(this),
      groupWidget: groupFieldWidget.bind(this),
      // Add expanded descriptions state for item description toggle functionality
      expandedDescriptions: SWNActorSheet.#expandedDescriptions,
      expandedPoolTempModifiers: SWNActorSheet.#expandedPoolTempModifiers,

    };

    // Ensure shared fragments are preloaded regardless of which parts render
    await loadTemplates([
      'systems/swnr/templates/actor/fragments/pools-display.hbs'
    ]);

    // Offloading context prep to a helper function
    this._prepareItems(context);
    
    // Prepare pool data for display
    this._preparePools(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'features':
      case 'combat':
      case 'skills':
      case 'powers':
      case 'npc':
      case 'gear':
        context.tab = context.tabs[partId];
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        // Enrich biography info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedBiography = await TextEditor.enrichHTML(
          this.actor.system.biography,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        // Add available languages for character language selection
        if (this.actor.type === 'character') {
          context.availableLanguages = game.settings.get("swnr", "parsedLanguageList") || [];
        }
        break;
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts, defaultTab = 'gear') {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = defaultTab;
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: 'sheet-body',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'SWN.Actor.Tabs.',
      };
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'biography':
          tab.id = 'biography';
          tab.label += 'Biography';
          break;
        case 'features':
          tab.id = 'features';
          tab.label += 'Features';
          break;
        case 'gear':
          tab.id = 'gear';
          tab.label += 'Gear';
          break;
        case 'combat':
          tab.id = 'combat';
          tab.label += 'Combat';
          break;
        case 'npc':
          tab.id = 'npc';
          tab.label += 'NPC';
          break;
        case 'skills':
          tab.id = 'skills';
          tab.label += 'Skills';
          break;
        case 'powers':
          tab.id = 'powers';
          tab.label += 'Powers';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    // You can just use `this.document.itemTypes` instead
    // if you don't need to subdivide a given type like
    // this sheet does with powers
    const items = [];
    const features = [];
    const cyberware = [];
    const powersByType = {
      psychic: {},
      art: {},
      adept: {},
      spell: {},
      mutation: {}
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      // Append to gear.
      if (i.type === 'item') {
        items.push(i);
      }
      else if (i.type === 'armor') {
        items.push(i);
      }
      else if (i.type === 'weapon') {
        items.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      else if (i.type === 'cyberware') {
        cyberware.push(i);
      }
      // Append to powers by type and level.
      else if (i.type === 'power') {
        const powerType = i.system.subType || 'psychic';
        const powerLevel = i.system.level || 0;
        
        // Add hasPrepCosts property to the power item
        i.hasPrepCosts = i.system.consumptions?.some(c => c.timing === "preparation") || false;
        
        // Initialize type structure if needed
        if (!powersByType[powerType]) {
          powersByType[powerType] = {};
        }
        
        // For arts and mutations, create a flat list (no level grouping)
        if (powerType === 'art' || powerType === 'mutation') {
          if (!powersByType[powerType]['flat']) {
            powersByType[powerType]['flat'] = [];
          }
          powersByType[powerType]['flat'].push(i);
        } else {
          // For other power types, group by level
          if (!powersByType[powerType][powerLevel]) {
            powersByType[powerType][powerLevel] = [];
          }
          powersByType[powerType][powerLevel].push(i);
        }
      }
    }

    // Sort powers within each level
    for (const powerType of Object.values(powersByType)) {
      for (const levelArray of Object.values(powerType)) {
        levelArray.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      }
    }

    // Prepare powers for template - include all power types regardless of whether they have powers
    const powers = powersByType;

    // Sort then assign
    context.items = items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.features = features.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.powers = powers;
    // Sort cyberware by type, with none first
    context.cyberware = cyberware.sort((a, b) => {
      if (a.system.type === "none" && b.system.type !== "none") return -1; // a comes first
      if (b.system.type === "none" && a.system.type !== "none") return 1;  // b comes first

      if ((a.system.type || 0) < (b.system.type || 0)) { return -1; }
      if ((a.system.type || 0) > (b.system.type || 0)) { return 1; }
      return 0;
    });

    if (this.actor.type === "npc") {
      const abilities = []
      for (let i of this.document.items) {
        if (i.type === 'power' || i.type === 'feature' || i.type === 'cyberware') {
          abilities.push(i);
        }
      }
      context.abilities = abilities;
    }
  }

  /**
   * Refresh pools by cadence type - delegates to helper for consistency
   * Used only for non-character actors (NPCs, etc.)
   * @param {string} cadence - The cadence type to refresh ('scene', 'day')
   */
  async _refreshPoolsByCadence(cadence) {
    // Delegate to orchestrator for NPCs and other non-character actors
    await globalThis.swnr.utils.refreshActor({ actor: this.actor, cadence });
    this.render(false);
  }

  /**
   * Prepare pool data for display in the sheet
   * @param {Object} context - The context object being prepared
   */
  _preparePools(context) {
    const pools = this.actor.system.pools || {};
    const poolGroups = {};
    
    // Group pools by resource name
    for (const [poolKey, poolData] of Object.entries(pools)) {
      const [resourceName, subResource] = poolKey.split(':');
      
      if (!poolGroups[resourceName]) {
        poolGroups[resourceName] = {
          resourceName,
          pools: []
        };
      }
      
      // Coerce potentially malformed values to safe numbers
      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const value = toNum(poolData.value);
      const max = toNum(poolData.max);
      const committed = toNum(poolData.committed);
      const tempCommit = toNum(poolData.tempCommit);
      const tempScene = toNum(poolData.tempScene);
      const tempDay = toNum(poolData.tempDay);

      const poolInfo = {
        key: poolKey,
        subResource: subResource || "Default",
        current: value,
        max: max,
        cadence: poolData.cadence,
        committed,
        commitments: poolData.commitments || [],
        tempCommit,
        tempScene,
        tempDay,
        percentage: max > 0 ? Math.round((value / max) * 100) : 0,
        isEmpty: value === 0,
        isFull: value >= max,
        isLow: max > 0 && (value / max) < 0.25,
        hasCommitments: committed > 0
      };
      
      poolGroups[resourceName].pools.push(poolInfo);
    }
    
    // Sort pools within each group by subResource
    for (const group of Object.values(poolGroups)) {
      group.pools.sort((a, b) => {
        // Put "Default" first, then sort alphabetically
        if (a.subResource === "Default" && b.subResource !== "Default") return -1;
        if (b.subResource === "Default" && a.subResource !== "Default") return 1;
        return a.subResource.localeCompare(b.subResource);
      });
    }
    
    // Convert to array and sort by resource name
    const poolGroupsArray = Object.values(poolGroups).sort((a, b) => 
      a.resourceName.localeCompare(b.resourceName)
    );
    
    context.poolGroups = poolGroupsArray;
    context.hasAnyPools = poolGroupsArray.length > 0;
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.

    // NOTE that 'click' events should just be actions like roll, rest, etc.
    this.element.querySelectorAll(".location-selector").forEach((d) =>
      d.addEventListener('change', this._onLocationChange.bind(this)));

    this.element.querySelectorAll(".resource-list-val").forEach((d) =>
      d.addEventListener('change', this._onResourceChange.bind(this)));

    this.element.querySelectorAll(".power-prepared-icon").forEach((d) =>
      d.addEventListener('click', this._onPowerPreparedToggle.bind(this)));

    // Handle temp modifier inputs (header and powers)
    this.element.querySelectorAll('.pool-temp-modifier[data-path]')
      .forEach((el) => {
        el.addEventListener('change', this._onPoolTempModifierChange.bind(this));
      });

    // Toggle lock related elements after render depending on the lock state
    this.element?.querySelectorAll(".lock-icon").forEach((d) => {
      d.style.display = this.#toggleLock ? "none" : "inline";
    });
    this.element?.querySelectorAll(".lock-toggle").forEach((d) => {
      d.style.display = this.#toggleLock ? "inline" : "none";
    });
  }

  /**************
   * Listener Events
   ************/

  /**
   * Change an embedded item's location
   * @param {*} event 
   */
  async _onLocationChange(event) {
    const value = event.target.value;
    const id = event.target.dataset.itemId;
    await this.actor.items.get(id).update({ "system.location": value });
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle clickable rolls.
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRest(event, _target) {
    event.preventDefault();
    if (this.actor.type === "character") {
      const rest = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("swnr.sheet.rest-title") },
        content: game.i18n.localize("swnr.sheet.rest-desc"),
        rejectClose: false,
        modal: true,
        buttons: [
          {
            icon: 'fas fa-check',
            label: "Yes",
            action: "normal",
          },
          {
            icon: 'fas fa-check',
            label: "Yes, but no HP",
            action: "no_hp",
          },
          {
            icon: 'fas fa-times',
            label: "No",
            action: "no",
          },
        ]
      })
      if (rest === "no") {
        return;
      }
      const isFrail = rest === "no_hp" ? true : false;
      
      // Delegate to refresh orchestrator (handles HP/strain + pools)
      await globalThis.swnr.utils.refreshActor({ actor: this.actor, cadence: 'day', frail: isFrail });
    } else if (this.actor.type === "npc") {
      await globalThis.swnr.utils.refreshActor({ actor: this.actor, cadence: 'day' });
    }
    await this._resetSoak();
  }


  static async _onScene(event, _target) {
    event.preventDefault();
    
    await globalThis.swnr.utils.refreshActor({ actor: this.actor, cadence: 'scene' });
    this._resetSoak();
  }


  static async _onHitDice(event, _target) {
    event.preventDefault();
    if (typeof this.actor.system.rollHitDice === 'function') {
      this.actor.system.rollHitDice(true);
      if (this.actor.type === "npc") {
        await this.actor.update({ "system.health_max_modified": 1 });
      }
    } else {
      console.log("Hit dice rolls are only for PCs/NPCs");
    }

  }

  /**
   * Change handler for temp modifier inputs that don't participate in form submit
   */
  async _onPoolTempModifierChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const path = input.dataset.path; // e.g., system.pools.Effort:Default.tempScene
    if (!path) return;

    const poolBadge = input.closest('.pool-badge[data-pool-key]');
    const poolKey = poolBadge?.dataset.poolKey || path.match(/system\.pools\.(.+?)\.(tempCommit|tempScene|tempDay)/)?.[1];
    if (!poolKey) return;

    const pools = this.actor.system.pools || {};
    const pool = pools[poolKey];
    if (!pool) {
      await this.actor.update({ [path]: Number(input.value) || 0 });
      return;
    }

    // Parse new and old values
    const newFieldVal = Number(input.value);
    const safeNewFieldVal = Number.isFinite(newFieldVal) ? newFieldVal : 0;

    const oldCommit = Number(pool.tempCommit) || 0;
    const oldScene = Number(pool.tempScene) || 0;
    const oldDay = Number(pool.tempDay) || 0;
    const oldTempSum = oldCommit + oldScene + oldDay;

    const fieldMatch = path.match(/\.((tempCommit|tempScene|tempDay))$/);
    const fieldKey = fieldMatch ? fieldMatch[1] : null;
    const oldFieldVal = fieldKey ? (Number(pool[fieldKey]) || 0) : 0;

    const newTempSum = oldTempSum - oldFieldVal + safeNewFieldVal;

    // Derive baseMax from current max minus current temp sum
    const currentMax = Number(pool.max) || 0;
    const baseMax = Math.max(0, currentMax - oldTempSum);
    const newMax = Math.max(0, baseMax + newTempSum);

    // Adjust current value by delta temp; clamp to newMax
    const delta = newTempSum - oldTempSum;
    const currentVal = Number(pool.value) || 0;
    const newVal = Math.max(0, Math.min(currentVal + delta, newMax));

    const updates = {
      [path]: safeNewFieldVal,
      [`system.pools.${poolKey}.value`]: newVal,
      [`system.pools.${poolKey}.max`]: newMax
    };

    await this.actor.update(updates);
  }

  async _resetSoak() {
    if (game.settings.get("swnr", "useCWNArmor")) {
      if (this.actor.type == "npc") {
        const maxSoak = this.actor.system.baseSoakTotal.max;
        await this.actor.update({
          "system.baseSoakTotal.value": maxSoak,
        });
      }

      const armorWithSoak = (
        this.actor.items.filter(
          (i) =>
            i.type === "armor" &&
            i.system.soak.value < i.system.soak.max
        )
      );
      for (const armor of armorWithSoak) {
        const soak = armor.system.soak.max;
        await armor.update({
          "system.soak.value": soak,
        });
      }
    }
  }

  /**
   * Skill roll
   */
  static async _onSkillRoll(event, target) {
    event.preventDefault();
    const skillID = target.dataset.itemId;
    const skill = this.actor.items.get(skillID);
    skill.roll(event.shiftKey);
  }

  static async _onSkillUp(event, target) {
    event.preventDefault();

    const skillID = target.dataset.itemId;
    const skill = this.actor.items.get(skillID);
    const rank = skill.system.rank;
    if (rank > 0) {
      const lvl = this.actor.system.level.value;
      if (rank == 1 && lvl < 3) {
        ui.notifications?.error(
          "Must be at least level 3 (edit manually to override)"
        );
        return;
      } else if (rank == 2 && lvl < 6) {
        ui.notifications?.error(
          "Must be at least level 6 (edit manually to override)"
        );
        return;
      } else if (rank == 3 && lvl < 9) {
        ui.notifications?.error(
          "Must be at least level 9 (edit manually to override)"
        );
        return;
      } else if (rank > 3) {
        ui.notifications?.error("Cannot auto-level above 4");
        return;
      }
    }
    const skillCost = rank + 2;
    const isPsy =
      skill.system.source.toLocaleLowerCase() ===
        game.i18n.localize("swnr.skills.labels.psionic").toLocaleLowerCase()
        ? true
        : false;
    const skillPointsAvail = isPsy
      ? this.actor.system.unspentPsySkillPoints +
      this.actor.system.unspentSkillPoints
      : this.actor.system.unspentSkillPoints;
    if (skillCost > skillPointsAvail) {
      ui.notifications?.error(
        `Not enough skill points. Have: ${skillPointsAvail}, need: ${skillCost}`
      );
      return;
    } else if (isNaN(skillPointsAvail)) {
      ui.notifications?.error(`Skill points not set`);
      return;
    }
    await skill.update({ "system.rank": rank + 1 });
    if (isPsy) {
      const newPsySkillPoints = Math.max(
        0,
        this.actor.system.unspentPsySkillPoints - skillCost
      );
      let newSkillPoints = this.actor.system.unspentSkillPoints;
      if (skillCost > this.actor.system.unspentPsySkillPoints) {
        //Not enough psySkillPoints, dip into regular
        newSkillPoints -=
          skillCost - this.actor.system.unspentPsySkillPoints;
      }
      await this.actor.update({
        "system.unspentSkillPoints": newSkillPoints,
        "system.unspentPsySkillPoints": newPsySkillPoints,
      });
      ui.notifications?.info(
        `Removed ${skillCost} from unspent skills, with at least one psychic skill point`
      );
    } else {
      const newSkillPoints =
        this.actor.system.unspentSkillPoints - skillCost;
      await this.actor.update({ "system.unspentSkillPoints": newSkillPoints });
      ui.notifications?.info(`Removed ${skillCost} skill points`);
    }
  }

  static async _toggleArmor(event, target) {
    event.preventDefault();
    const armorID = target.dataset.itemId;
    const armor = this.actor.items.get(armorID);
    const use = armor.system.use;
    await armor.update({ system: { use: !use } });
  }

  /**
   * Toggle container open/closed state
   * @this SWNActorSheet
   */
  static async _toggleContainer(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const isOpen = item.system.container.isOpen;
    await item.update({ "system.container.isOpen": !isOpen });
  }

  /**
  * @this SWNActorSheet
  */
  static async _toggleLock(event, _target) {
    event.preventDefault();
    this.#toggleLock = !this.#toggleLock;
    this.element.querySelectorAll(".lock-icon").forEach((d) => {
      d.style.display = this.#toggleLock ? "none" : "inline";
    });
    this.element.querySelectorAll(".lock-toggle").forEach((d) => {
      d.style.display = this.#toggleLock ? "inline" : "none";
    });
  }

  static async _toggleSection(event, target) {
    event.preventDefault();
    const elem = target.dataset.section; //= target.dataset.section === "open" ? "closed" : "open";
    this.element.querySelector("#" + elem).style.display = this.element.querySelector("#" + elem).style.display === "none" ? "" : "none";
    this.element.querySelector("#" + elem + "-toggle").innerHTML = this.element.querySelector("#" + elem + "-toggle").innerHTML === "▼" ? "▲" : "▼";
  }

  /**
   * Load skills roll button
   */
  static async _loadSkills(event, target) {
    event.preventDefault();
    const _addSkills = async (_event, button, html) => {
      const skillList = button.form.elements.skillList.value;
      const extra = button.form.elements.extra?.value;
      if (!skillList && !extra) return;
      if (skillList && skillList === "compendiumList") {
        await initCompendSkills(this.actor);
      } else {
        await initSkills(this.actor, skillList);
      }
      if (extra)
        await initSkills(this.actor, extra);
      return;
    };
    const template = "systems/swnr/templates/dialogs/add-bulk-skills.hbs";
    const content = await renderTemplate(template, {});

    const _resp = await foundry.applications.api.DialogV2.prompt(
      {
        window: {
          title: game.i18n.format("swnr.dialog.add-bulk-skills",
            { actor: this.actor.name }
          )
        },
        content,
        modal: true,
        rejectClose: false,
        ok:
        {
          action: "addSkills",
          label: game.i18n.localize("swnr.dialog.add-skills"),
          callback: _addSkills,
        },
      }
    );
  }

  static async _onRollStats(event, _target) {
    event.preventDefault();
    const dice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("swnr.chat.statRoll", { name: this.actor.name }) },
      content: game.i18n.localize("swnr.dialog.statMethod"),
      modal: true,
      buttons: [
        {
          icon: 'fas fa-dice-d20',
          label: "3d6",
          action: "3d6",
        },
        {
          icon: 'fas fa-dice-d20',
          label: "4d6kh3",
          action: "4d6kh3",
        },
      ],
    });
    if (!dice) {
      return;
    }
    const formula = new Array(6).fill(dice).join("+");
    const roll = new Roll(formula);
    await roll.roll();
    const stats = {};
    ["str", "dex", "con", "int", "wis", "cha"].map((k, i) => {
      stats[k] = {
        dice: roll.dice[i].results,
        base: roll.dice[i].total,
        boost: 0,
        mod: calcMod(roll.dice[i].total),
        bonus: 0,
        total: 0,
        temp: 0,
      };
    });
    // TODO wsAI should we use this?
    //calculateStats(stats);
    const data = {
      actor: this.actor,
      stats,
      totalMod: Object.values(stats).reduce((s, v) => {
        return s + v.mod;
      }, 0),
    };
    const chatContent = await renderTemplate(
      "systems/swnr/templates/chat/stat-block.hbs",
      data
    );
    const chatMessage = getDocumentClass("ChatMessage");
    chatMessage.create(
      {
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        roll: JSON.stringify(roll.toJSON()),
        content: chatContent
      }
    );
  }

  static async _onRollSave(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
    const saveType = dataset.saveType;
    this.actor.system.rollSave(saveType);
  }

  static async _onReactionRoll(event, _target) {
    event.preventDefault();
    if (this.actor.type !== "npc") {
      return;
    }
    function defineResult(
      text,
      range
    ) {
      return {
        text: game.i18n.localize("swnr.npc.reaction." + text),
        type: 0,
        range,
        flags: { swnr: { type: text.toLocaleLowerCase() } },
        weight: 1 + range[1] - range[0],
        _id: text.toLocaleLowerCase().padEnd(16, "0"),
      };
    }
    const tableResults = [
      defineResult("hostile", [2, 2]),
      defineResult("negative", [3, 5]),
      defineResult("neutral", [6, 8]),
      defineResult("positive", [9, 11]),
      defineResult("friendly", [12, 12]),
    ];

    const rollTable = (await RollTable.create(
      {
        name: "NPC Reaction",
        description: " ", //todo: spice this up
        formula: "2d6",
        results: tableResults,
      },
      { temporary: true }
    ));

    const { results } = await rollTable.draw();

    await this.actor.update({
      "system.reaction": results[0].id?.split("0")[0],
    });
  }

  static async _onMoraleRoll(event, _target) {
    event.preventDefault();
    if (this.actor.type === "npc") {
      this.actor.system.rollMorale();
    } else {
      console.log("Morale rolls are only for NPCs");
    }
  }

  static async _onResourceCreate(event, _target) {
    event.preventDefault();
    let resourceList = this.actor.system.tweak.resourceList;
    if (!resourceList) {
      resourceList = [];
    }
    resourceList.push({ name: "Resource X", value: 0, max: 1 });
    await this.actor.update({
      "system.tweak.resourceList": resourceList,
    });
  }

  /**
   * Handle pool management button clicks
   * @param {Event} event   The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   */

  static async _onResourceDelete(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
    const idx = dataset.rlIdx;
    const resourceList = duplicate(this.actor.system.tweak.resourceList);
    resourceList.splice(idx, 1);
    await this.actor.update({ "system.tweak.resourceList": resourceList });
  }

  async _onResourceChange(event) {
    event.preventDefault();
    const value = event.target?.value;
    const resourceType = $(event.currentTarget).data("rlType");
    const idx = $(event.currentTarget).parents(".item").data("rlIdx");
    const resourceList = duplicate(this.actor.system.tweak.resourceList);
    resourceList[idx][resourceType] = value;
    await this.actor.update({ "system.tweak.resourceList": resourceList });
  }

  /**
   * Handle power prepared icon clicks
   * @param {Event} event The click event
   */
  async _onPowerPreparedToggle(event) {
    event.preventDefault();
    
    // Only handle if editable
    if (!this.isEditable) return;
    
    const icon = event.target;
    const itemId = icon.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item || item.type !== "power") {
      ui.notifications?.error("Power not found");
      return;
    }

    const power = item.system;
    const currentlyPrepared = power.prepared;
    
    try {
      if (!currentlyPrepared) {
        // Prepare the power
        const result = await power.prepare();
        if (!result.success) {
          ui.notifications?.warn(result.message || "Failed to prepare power");
          return;
        }
        ui.notifications?.info(`${item.name} prepared successfully`);
      } else {
        // Unprepare the power
        const result = await power.unprepare();
        if (!result.success) {
          ui.notifications?.warn(result.message || "Failed to unprepare power");
          return;
        }
        ui.notifications?.info(`${item.name} unprepared successfully`);
      }
      
      // Update icon classes immediately for visual feedback
      if (!currentlyPrepared) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.title = "Prepared";
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.title = "Not Prepared";
      }
      
    } catch (error) {
      console.error("Error handling power preparation:", error);
      ui.notifications?.error("An error occurred while changing power preparation");
    }
  }

  static async _onAddUse(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item.type === "item" && item.system.uses.consumable !== "none") {
      item.system.addOneUse();
    }
  }

  static async _onRemoveUse(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item.type === "item" && item.system.uses.consumable !== "none") {
      item.system.removeOneUse();
    }
  }

  /**
   * Handle manual release of committed effort
   * @param {Event} event   The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   */
  static async _onReleaseCommitment(event, target) {
    event.preventDefault();
    const poolKey = target.dataset.poolKey;
    const powerId = target.dataset.powerId;
    
    if (!poolKey || !powerId) {
      ui.notifications?.error("Missing pool or power ID for commitment release");
      return;
    }
    
    const actor = this.actor;
    const commitments = actor.system.effortCommitments || {};
    const poolCommitments = commitments[poolKey] || [];
    
    // Find and remove the specific commitment
    const commitmentIndex = poolCommitments.findIndex(c => c.powerId === powerId);
    if (commitmentIndex === -1) {
      ui.notifications?.warn("Could not find commitment to release");
      return;
    }
    
    const releasedCommitment = poolCommitments[commitmentIndex];
    poolCommitments.splice(commitmentIndex, 1);
    
    // Update actor with released commitment
    const newCommitments = { ...commitments };
    newCommitments[poolKey] = poolCommitments;
    
    // Recalculate pool availability
    const pools = actor.system.pools || {};
    const pool = pools[poolKey];
    if (pool) {
      const totalCommitted = poolCommitments.reduce((sum, c) => sum + c.amount, 0);
      const newValue = Math.min(pool.max, pool.value + releasedCommitment.amount);
      
      await actor.update({
        "system.effortCommitments": newCommitments,
        [`system.pools.${poolKey}.value`]: newValue,
        [`system.pools.${poolKey}.committed`]: totalCommitted,
        [`system.pools.${poolKey}.commitments`]: poolCommitments
      });
      
      // Create chat message for release
      const chatMessage = getDocumentClass("ChatMessage");
      chatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: `<div class="effort-release">
          <h3><i class="fas fa-unlock"></i> ${game.i18n.localize("swnr.pools.commitment.released")}</h3>
          <p><strong>${releasedCommitment.powerName}:</strong> ${releasedCommitment.amount} ${poolKey} effort released</p>
        </div>`
      });
      
      ui.notifications?.info(`Released ${releasedCommitment.amount} effort from ${releasedCommitment.powerName}`);
    }
  }

  /**
   * Reset power consumption uses to maximum
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   * @returns {Promise<void>}
   * @static
   */
  static async _onResetPowerUses(event, target) {
    event.preventDefault();
    
    // If target is the icon inside the button, get the button element
    const button = target.closest('.reset-power-uses') || target;
    const itemId = button.dataset.itemId;
    const consumptionIndex = parseInt(button.dataset.consumptionIndex);
    
    if (!itemId || consumptionIndex === undefined || isNaN(consumptionIndex)) {
      ui.notifications?.error("Missing item ID or consumption index for power uses reset");
      return;
    }
    
    const actor = this.actor;
    const item = actor.items.get(itemId);
    
    if (!item || item.type !== 'power') {
      ui.notifications?.error("Could not find power item for uses reset");
      return;
    }
    
    const consumptions = foundry.utils.deepClone(item.system.consumptions);
    const consumption = consumptions[consumptionIndex];
    
    if (!consumption || consumption.type !== 'uses') {
      ui.notifications?.error("Invalid consumption data for uses reset");
      return;
    }
    
    // Reset the uses to maximum
    const oldValue = consumption.uses.value;
    consumption.uses.value = consumption.uses.max;
    
    // Update the item
    await item.update({ "system.consumptions": consumptions });
    
    // Create chat message for reset
    const chatMessage = getDocumentClass("ChatMessage");
    chatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `<div class="power-uses-reset">
        <h3><i class="fas fa-undo"></i> Power Uses Reset</h3>
        <p><strong>${item.name}:</strong> Uses reset from ${oldValue}/${consumption.uses.max} to ${consumption.uses.max}/${consumption.uses.max}</p>
      </div>`
    });
    
    ui.notifications?.info(`Reset ${item.name} uses to maximum`);
  }

  /**
   * Toggle the display of an item's description
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   * @returns {Promise<void>}
   * @static
   */
  static async _onToggleItemDescription(event, target) {
    event.preventDefault();
    
    const itemId = target.dataset.itemId || target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;

    // Toggle the expanded state (using object instead of Set)
    if (SWNActorSheet.#expandedDescriptions[itemId]) {
      delete SWNActorSheet.#expandedDescriptions[itemId];
    } else {
      SWNActorSheet.#expandedDescriptions[itemId] = true;
    }

    // Find and toggle the description row
    const itemRow = target.closest('.item[data-item-id]');
    if (!itemRow) return;

    const descriptionRow = itemRow.nextElementSibling;
    if (descriptionRow && descriptionRow.classList.contains('item-description')) {
      const isExpanded = SWNActorSheet.#expandedDescriptions[itemId];
      descriptionRow.style.display = isExpanded ? 'block' : 'none';
    }
  }

  /**
   * Handle toggling pool temp modifiers visibility
   * @param {Event} event - The originating click event
   * @param {HTMLElement} target - The clicked element
   */
  static async _onTogglePoolTempModifiers(event, target) {
    event.preventDefault();
    
    const poolKey = target.dataset.poolKey || target.closest('[data-pool-key]')?.dataset.poolKey;
    if (!poolKey) return;

    // Toggle the expanded state
    if (SWNActorSheet.#expandedPoolTempModifiers[poolKey]) {
      delete SWNActorSheet.#expandedPoolTempModifiers[poolKey];
    } else {
      SWNActorSheet.#expandedPoolTempModifiers[poolKey] = true;
    }

    // Update all matching badges (header and powers) to keep UI in sync
    const isCollapsed = !!SWNActorSheet.#expandedPoolTempModifiers[poolKey];
    const badges = this.element.querySelectorAll(`.pool-badge[data-pool-key="${CSS.escape(poolKey)}"]`);
    badges.forEach((poolBadge) => {
      poolBadge.classList.toggle('collapsed', isCollapsed);
      poolBadge.classList.toggle('expanded', !isCollapsed);

      // Update caret direction: down when collapsed, up when expanded
      const chevron = poolBadge.querySelector('.pool-toggle-button i');
      if (chevron) {
        chevron.classList.toggle('fa-chevron-up', !isCollapsed);
        chevron.classList.toggle('fa-chevron-down', isCollapsed);
        chevron.classList.remove('fa-chevron-right', 'fa-chevron-left');
      }
    });
  }

  /**
   * Handle adding a language to the character
   * @param {Event} event - The originating click event
   * @param {HTMLElement} target - The clicked element
   * @private
   */
  static async _onAddLanguage(event, target) {
    event.preventDefault();
    
    try {
      const container = target.closest('.language-add-container');
      if (!container) {
        console.error("Language add container not found");
        return;
      }
      
      const languageSelect = container.querySelector('.language-select');
      if (!languageSelect) {
        console.error("Language select not found");
        return;
      }
      
      const selectedLanguage = languageSelect.value;
      
      if (!selectedLanguage || selectedLanguage === "") {
        ui.notifications.warn("Please select a language to add.");
        return;
      }
      
      const currentLanguages = [...(this.actor.system.languages || [])];
      
      if (!currentLanguages.includes(selectedLanguage)) {
        currentLanguages.push(selectedLanguage);
        await this.actor.update({ "system.languages": currentLanguages });
        
        // Reset the select and hide the add section
        languageSelect.value = "";
        const addSection = container.closest('#language-add-section');
        if (addSection) {
          addSection.style.display = 'none';
        }
        
        ui.notifications.info(`Added language: ${selectedLanguage}`);
      } else {
        ui.notifications.warn(`${selectedLanguage} is already known by this character.`);
      }
    } catch (error) {
      console.error("Error adding language:", error);
      ui.notifications.error("Error adding language. Check console for details.");
    }
  }

  /**
   * Handle removing a language from the character
   * @param {Event} event - The originating click event  
   * @param {HTMLElement} target - The clicked element
   * @private
   */
  static async _onRemoveLanguage(event, target) {
    event.preventDefault();
    
    const languageIndex = parseInt(target.dataset.langIndex);
    
    if (isNaN(languageIndex)) return;
    
    const currentLanguages = [...(this.actor.system.languages || [])];
    if (languageIndex >= 0 && languageIndex < currentLanguages.length) {
      const removedLanguage = currentLanguages[languageIndex];
      currentLanguages.splice(languageIndex, 1);
      await this.actor.update({ "system.languages": currentLanguages });
      
      ui.notifications.info(`Removed language: ${removedLanguage}`);
    }
  }

  /**
   * Handle toggling the language add section
   * @param {Event} event - The originating click event
   * @param {HTMLElement} target - The clicked element
   * @private
   */
  static async _onToggleLanguageAdd(event, target) {
    event.preventDefault();
    
    const addSection = target.closest('.languages-section').querySelector('#language-add-section');
    if (addSection) {
      const isVisible = addSection.style.display !== 'none';
      addSection.style.display = isVisible ? 'none' : 'block';
      
      // Reset the select when showing
      if (!isVisible) {
        const select = addSection.querySelector('.language-select');
        if (select) {
          select.value = "";
        }
      }
    }
  }

}
