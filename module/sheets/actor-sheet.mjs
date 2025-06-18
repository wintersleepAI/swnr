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
  constructor(options = {}) {
    super(options);
  }

  // Private properties
  #toggleLock = false;

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
      toggleLock: this._toggleLock,
      rollStats: this._onRollStats,
      toggleSection: this._toggleSection,
      reactionRoll: this._onReactionRoll,
      moraleRoll: this._onMoraleRoll,
      resourceCreate: this._onResourceCreate,
      resourceDelete: this._onResourceDelete,
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
        // ws AI removing skills for now: ,'skills'
        options.parts.push('combat', 'features', 'gear', 'powers', 'effects');
        options.defaultTab = 'combat';
        break;
      case 'npc':
        options.parts.push('npc', 'gear', 'effects');
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
      // Append to powers.
      else if (i.type === 'power') {
        if (i.system.level != undefined) {
          powers[i.system.level].push(i);
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
    let update = { system: { effort: { scene: 0 } } };
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
    await armor.update({ system: { use: !use } });
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

  static async _onAddUse(event, target) { 
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item.type === "item" && item.system.uses.consumable !== "none") {
      const uses = item.system.uses;
      if (uses.value == 0 && item.system.uses.keepEmpty && item.system.uses.emptyQuantity > 0) {
        // If keepEmpty is true, just set to 1
        await item.update({ "system.uses.value": 1, "system.uses.emptyQuantity": item.system.uses.emptyQuantity - 1, "system.quantity": item.system.quantity + 1 });
        ui.notifications?.info(
          `Removing an empty ${item.name} and adding uses.`
        );
      } else if (uses.value < uses.max) {
        await item.update({ "system.uses.value": uses.value + 1 });
      } 

    } else {
      console.warn("Cannot add uses to non-item/gear type");
    }
  }

  static async _onRemoveUse(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item.type === "item" && item.system.uses.consumable !== "none") {
      const uses = item.system.uses;
      if (uses.value > 1) {
        await item.update({ "system.uses.value": uses.value - 1 });
      } else if (uses.value == 1) {
        let newUses = 0;
        if (item.quantity > 1) {
          // If quantity is greater than 1, just reduce the quantity
          newUses = item.system.uses.max;
        }
        // Uses up the item
        if  (item.system.uses.keepEmpty) {
          // If keepEmpty is true, just set to 0
          const emptyQuantity = item.system.uses.emptyQuantity || 0;
          await item.update({ "system.uses.value": newUses, "system.uses.emptyQuantity": emptyQuantity+1, "system.quantity": item.system.quantity - 1  });
          ui.notifications?.info(
            `Removing a use and adding an empty ${item.name}.`
          );
        } else {
          if (item.system.quantity > 1) {
            // If quantity is greater than 1, just reduce the quantity
            await item.update({ "system.quantity": item.system.quantity - 1,  "system.uses.value": newUses });
          } else {
            // If quantity is 1, delete the item
            ui.notifications?.info(
              `Removing item ${item.name} as it has no uses left and it does not keep empties.`
            );
            await item.delete();
          }
        }
      }
    } else {
      console.warn("Cannot remove uses from non-item/gear type");
    }
  }
}
