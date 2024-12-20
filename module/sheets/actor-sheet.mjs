import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { getGameSettings } from '../helpers/register-settings.mjs';
import { headerFieldWidget, groupFieldWidget } from '../helpers/handlebar.mjs';
import { initSkills, initCompendSkills, calcMod } from '../helpers/utils.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'actor'],
    position: {
      width: 760,
      height: 800,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      rest: this._onRest,
      scene: this._onScene,
      rollSave: this._onRollSave,
      loadSkills: this._loadSkills,
      rollSkill: this._onSkillRoll,
      skillUp: this._onSkillUp,
      hitDice: this._onHitDice,
      toggleArmor: this._toggleArmor,
      toggleLock: this._toggleLock,
      rollStats: this._onRollStats,
      toggleSection: this._toggleSection,
      reactionRoll: this._onReactionRoll,
      moraleRoll: this._onMoraleRoll,
      creditChange: this._onCreditChange,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
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
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    //wsai adding to allow setting default tab
    options.defaultTab= 'gear';

    // Not all parts always render
    options.parts = ['header', 'tabs', 'biography'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'character':
        // ws AI removing skills for now: ,'skills'
        options.parts.push('combat','features', 'gear', 'powers', 'effects');
        options.defaultTab = 'combat';
        break;
      case 'npc':
        options.parts.push('npc','gear', 'effects');
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

    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

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
    const powers = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      // Append to gear.
      if (i.type === 'item') {
        items.push(i);
      } 
      else if (i.type === 'armor') {
        items.push(i); //TODO fix to new array
      }
      else if (i.type === 'weapon') {
        items.push(i); //TODO fix to new array
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      else if (i.type === 'cyberware') {  
        cyberware.push(i);
      }
      // Append to powers.
      else if (i.type === 'power') {
        if (i.system.powerLevel != undefined) {
          powers[i.system.powerLevel].push(i);
        }
      }
    }

    for (const s of Object.values(powers)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

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
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.#disableOverrides();

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.

    // NOTE that 'click' events should just be actions like roll, rest, etc.
    this.element.querySelectorAll(".location-selector").forEach((d) => 
      d.addEventListener('change', this._onLocationChange.bind(this)));

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
   * Handle changing a Document's image.
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in powers.hbs, with `data-system.power-level`
      // which turns into the dataKey 'system.powerLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }

    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

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
      const systemData = this.actor.system
      const newStrain = Math.max(systemData.systemStrain.value - 1, 0);
      const newHP = isFrail
        ? systemData.health.value
        : Math.min(systemData.health.value + systemData.level.value, systemData.health.max);
      await this.actor.update({
        system: {
          systemStrain: { value: newStrain },
          health: { value: newHP },
          effort: { scene: 0, day: 0 },
          tweak: {
            extraEffort: {
              scene: 0,
              day: 0,
            },
          },
        },
      });
    } else if (this.actor.type === "npc") {
      const newHP = this.actor.system.health.max;
      await this.actor.update({
        system: {
          health: { value: newHP },
          effort: { scene: 0, day: 0 }
        },
      });
    }
    await this._resetSoak();
  }


  static async _onScene(event, _target) {
    event.preventDefault();
    let update = { system: { effort: { scene: 0 }}};
    if (this.actor.type === "character") {
      update["tweak.extraEffort.scene"] = 0;
    } 
    await this.actor.update(update);
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
    await armor.update({ system: { use: !use }});
  }

  static async _toggleLock(event, _target) {
    event.preventDefault();
    this.element.querySelectorAll(".lock-toggle").forEach((d) => {
      d.style.display = d.style.display === "none" ? "inline" : "none";
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
          )   }, 
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

  /**
   * Handle clickable rolls.
   *
   * @this SWNActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls.
    switch (dataset.rollType) {
      case 'item':
        const item = this._getEmbeddedDocument(target);
        if (item) return item.roll();
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[stat] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  static async _onRollStats(event, _target) {
    event.preventDefault();
    const dice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("swnr.chat.statRoll", {name: this.actor.name}) },
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
    await roll.roll({ async: true });
    const stats= {};
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
        content: chatContent,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
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

  static async _onCreditChange(event, target) {
    event.preventDefault();
    const currencyType = target.dataset.creditType;
    const _doAdd = async (_event, button, _html) => {
      const amount = button.form.elements.amount.value;
      if (isNaN(parseInt(amount))) {
        ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
        return;
      }
      const newAmount = this.actor.system.credits[currencyType] + parseInt(amount);
      await this.actor.update({
        system: {
          credits: {
            [currencyType]: newAmount,
          },
        },
      });
    };

    const description = game.i18n.format("swnr.dialog.addCurrency", { type: currencyType });
    const proceed = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Proceed" },
      content: `<p>${description}</p> <input type="number" name="amount">`,
      modal: false,
      rejectClose: false,
      ok: {
        callback: _doAdd,
      }
    });
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const docRow = event.currentTarget.closest('li');
    if ('link' in event.target.dataset) return;

    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid)
      return this._onSortItem(event, item);

    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments('Item', itemData);
  }

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
   * @param {Event} event
   * @param {Item} item
   * @private
   */
  _onSortItem(event, item) {
    // Get the drag source and drop target
    const items = this.actor.items;
    const dropTarget = event.target.closest('[data-item-id]');
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (item.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && siblingId !== item.id)
        siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(item, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments('Item', updateData);
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop(d);
    });
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }
}
