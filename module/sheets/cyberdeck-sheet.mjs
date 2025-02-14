import { getGameSettings } from '../helpers/register-settings.mjs';
import { headerFieldWidget, groupFieldWidget } from '../helpers/handlebar.mjs';

import { SWNBaseSheet } from './base-sheet.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNCyberdeckSheet extends SWNBaseSheet {
  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'actor'],
    position: {
      width: 800,
      height: 1000,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      hackerDelete: this._onHackerDelete,
      hackerRoll: this._onHackerRoll,
      runProgram: this._onActivateProgram,
      refreshAccess: this._onRefreshAccess,
      refreshShielding: this._onRefreshShielding
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
      template: 'systems/swnr/templates/actor/cyberdeck/cyberdeckHeader.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    programs: {
      template: 'systems/swnr/templates/actor/cyberdeck/programs.hbs'
    },
    // FRAGMENTS
    programList: {
      template: 'systems/swnr/templates/actor/fragments/programs-list.hbs'
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    //wsai adding to allow setting default tab
    options.defaultTab = 'programs';

    // Not all parts always render
    options.parts = ['header', 'tabs'];
    // Don't show the other tabs if only limited view
    if (this.document.limited){ 
      return;
    }
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'cyberdeck':
        options.parts.push('programs');
        options.defaultTab = 'programs';
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
      case 'programs':
        context.tab = context.tabs[partId];
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
  _getTabs(parts, defaultTab = 'programs') {
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
        case 'programs':
          tab.id = 'programs';
          tab.label += 'Programs';
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
    const hacker = this.actor.system.getHacker();

    const programs = this.actor.items.filter(
      (item) => item.type === "program"
    );

    const activePrograms = programs.filter(
      (item) => item.system.type === "running"
    );

    const verbs = programs.filter(
      (item) => item.system.type === "verb"
    );

    const subjects = programs.filter(
      (item) => item.system.type === "subject"
    );

    const datafiles = programs.filter(
      (item) => item.system.type === "datafile"
    );

    const access = {
      value: 0,
      max: 0,
    };

    if (hacker && (hacker.type == "character" || hacker.type == "npc")) {
      access.max =
        hacker.system.access.max + this.actor.system.bonusAccess;
      access.value =
        hacker.system.access.value + this.actor.system.bonusAccess;
    }

    return foundry.utils.mergeObject(context, {
      itemTypes: this.actor.itemTypes,
      activePrograms: activePrograms,
      verbs: verbs,
      subjects: subjects,
      datafiles: datafiles,
      hacker: hacker,
      access: access
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
    super._onRender(context, options);

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  static async _onHackerRoll(event, target) {
    event.preventDefault();
    const actorId = this.actor.system.hackerId;
    const crewActor = game.actors?.get(actorId);
    if (!crewActor) {
      ui.notifications?.error(`Hacker no longer exists`);
      return;
    }
    const skills = crewActor.itemTypes.skill;
    const isChar = crewActor.type == "character" ? true : false;
    const dialogData = {
      actor: crewActor,
      skills: skills,
      isChar,
    };
    const template = "systems/swnr/templates/dialogs/roll-skill-crew.hbs";
    const html = await renderTemplate(template, dialogData);

    const _rollForm = async (_event, button, html) => {
      const rollMode = game.settings.get("core", "rollMode");
      const dice = button.form.elements.dicepool.value;
      const modifier = parseInt(
        button.form.elements.modifier?.value
      ) || 0;
      const skillId = button.form.elements.skill?.value;
      const skill = crewActor.getEmbeddedDocument(
        "Item",
        skillId
      );
      const useNPCSkillBonus = button.form.elements.useNPCSkillBonus?.checked
        ? true : false;
      const npcSkillBonus =
        useNPCSkillBonus && crewActor.type == "npc"
          ? crewActor.system.skillBonus
          : 0;
      const skillBonus = skill ? skill.system.rank : npcSkillBonus;
      const statName = button.form.elements.stat
        ?.value;
      const stat = crewActor.system["stats"]?.[statName] || {
        mod: 0,
      };
      const formula = `${dice} + @stat + @skillBonus + @modifier`;
      const roll = new Roll(formula, {
        skillBonus,
        modifier,
        stat: stat.mod,
      });
      const skillName = skill ? skill.name : "No Skill";
      const statNameDisply = statName
        ? game.i18n.localize("swnr.stat.short." + statName)
        : "No Stat";
      const title = `${game.i18n.localize(
        "swnr.chat.skillCheck"
      )}: ${statNameDisply}/${skillName}`;
      await roll.roll({ async: true });
      roll.toMessage(
        {
          speaker: { alias: crewActor.name },
          flavor: title,
        },
        { rollMode }
      );
    };

    const d = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.format("swnr.dialog.skillRoll", {
          actorName: crewActor?.name,
        })
      },
      content: html,
      modal: true,
      rejectClose: false,
      ok: {
        label: game.i18n.localize("swnr.chat.roll"),
        callback: _rollForm,
      },
    });
  }

  static async _onHackerDelete(event, target) {
    const actorId = this.actor.system.hackerId;

    if (actorId) {
      await this.actor.update({
        "system.hackerId": null
      });
      await this.actor.update({
        "system.hacker": ""
      });
      let actor = game.actors?.get(actorId);
      if (
        actor &&
        this.id &&
        (actor.type === "character" || actor.type === "npc")
      ) {
        const cyberdeck = actor.system.cyberdecks;
        const idx = cyberdeck.indexOf(this.id);
        if (idx != -1) {
          cyberdeck.splice(idx, 1);
          await actor.update({
            "system.cyberdecks": cyberdeck,
          });
        }
      }
      ui.notifications?.info(
        `Removed hacker from ${this.actor.name}. Manually remove the cyberdeck from the hacker's sheet`
      );
    } else {
      ui.notifications?.error("hacker not found");
    }
  }

  static async _onActivateProgram(event, target) {
    event.preventDefault();
    if (this.actor.system.cpu.value < 1) {
      ui.notifications?.error("Not enough CPU to activate program.");
      return;
    }
    const sheetData = await this._prepareItems({});
    const a = this.context;
    let verbOptions = "";
    let subjectOptions = "";
    for (const verb of sheetData.verbs) {
      verbOptions += `<option value="${verb.id}">${verb.name}</option>`;
    }
    for (const subject of sheetData.subjects) {
      subjectOptions += `<option value="${subject.id}">${subject.name}</option>`;
    }

    if (!sheetData.verbs.length || !sheetData.subjects.length) {
      ui.notifications?.error("No verbs or subjects found");
      return;
    }

    const formContent = `<form>
    <div class="form-group">
      <label>Verb:</label>
      <select name="verbId"
        class="px-1.5 border border-gray-800 bg-gray-400 bg-opacity-75 placeholder-blue-800 placeholder-opacity-75 rounded-md">
        ${verbOptions}
      </select>
      <label>Subject:</label>
      <select name="subjectId"
        class="px-1.5 border border-gray-800 bg-gray-400 bg-opacity-75 placeholder-blue-800 placeholder-opacity-75 rounded-md">
        ${subjectOptions}
      </select>
    </div>
    </form>`;

    const _activateForm = async (html) => {
      const form = html[0].querySelector("form");
      const verbID = (form.querySelector('[name="verbId"]'))
        ?.value;
      const subID = (form.querySelector('[name="subjectId"]'))
        ?.value;
      if (!verbID || !subID) {
        ui.notifications?.error("Verb or Subject not selected");
        return;
      }
      const verb = sheetData.verbs.find((item) => item.id === verbID);
      const subject = sheetData.subjects.find((item) => item.id === subID);
      if (!verb || !subject) {
        ui.notifications?.error("Verb or Subject not found");
        return;
      }

      if (
        verb.system.target &&
          verb.system.target.indexOf(subject.system.target) === -1
      ) {
        ui.notifications?.error(
          "Verb and Subject are incompatible (target and type does not match)"
        );
        return;
      }
      let skillCheckMod = 0;
      if (verb.system.skillCheckMod) {
        skillCheckMod += verb.system.skillCheckMod;
      }
      if (subject.system.skillCheckMod) {
        skillCheckMod += subject.system.skillCheckMod;
      }
      const newProgram = {
        name: `${verb.name} ${subject.name}`,
        type: `program`,
        img: verb.img,
        system: {
          type: "running",
          cost: verb.system.cost,
          accessCost: verb.system.accessCost,
          useAffects: verb.system.useAffects,
          selfTerminating: verb.system.selfTerminating,
          skillCheckMod: skillCheckMod,
        },
      };

      const docs = await this.actor.createEmbeddedDocuments(
        "Item",
        [newProgram],
        {}
      );
      const program = docs[0];
      if (!program) {
        ui.notifications?.error("Failed to create program");
        return;
      }

      // Consume access
      if (sheetData.hacker) {
        let access = 0;
        if (sheetData.hacker.type == "character") {
          access = sheetData.hacker.system.access.value;
          access -= program.system.accessCost;
        } else if (sheetData.hacker.type == "npc") {
          access = sheetData.hacker.system.access.value;
          access -= program.system.accessCost;
        }
        await sheetData.hacker.update({
          "system.access.value": access,
        });
        if ((access + this.actor.system.bonusAccess) <= 0) {
          ui.notifications?.info("Hacker has no access left");
        }
      }

      // Roll skill / create button
      program.roll();

      if (program.system.selfTerminating) {
        program.delete();
      } else {
        // await this.actor.update({
        //   "data.cpu.value": this.actor.system.cpu.value - 1,
        // });
      }

      this.render();
    };

    new Dialog({
      title: game.i18n.localize("swnr.sheet.cyberdeck.run"),
      content: formContent,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: `Run`,
          callback: _activateForm,
        },
      },
      default: "Run",
    }).render(true);
  }
  

  static async _onRefreshShielding(event, target) {
    event.preventDefault();
    const oldShielding = this.actor.system.health.value;
    const maxShielding = this.actor.system.health.max;

    ui.notifications?.info(
      `Refreshing shielding from ${oldShielding} to ${maxShielding} (reminder 15 minutes to pass)`
    );
    await this.actor.update({
      "system.health.value": maxShielding,
    });
  }

  static async _onRefreshAccess(event, target) {
    event.preventDefault();
    const hacker = this.actor.system.getHacker();
    if (hacker) {
      const maxAccess = hacker.system.access.max;
      const newAccessDisplay = maxAccess + this.actor.system.bonusAccess;
      const oldAccess =
        hacker.system.access.value + this.actor.system.bonusAccess;
      ui.notifications?.info(
        `Refreshing access from ${oldAccess} to ${newAccessDisplay} (reminder after 1 hour reprogramming, once per day)`
      );
      await hacker.update({
        "system.access.value": maxAccess,
      });
      await this.actor.update({});
    } else {
      ui.notifications?.error("No hacker found");
    }
    this.render();
  }


  /**************
   *
   *   ACTIONS
   *
   **************/

  /** Helper Functions */

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param {DragEvent} event            The concluding DragEvent which contains drop data
     * @param {object} data                The data transfer extracted from the event
     * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
     *                                     not permitted.
     * @protected
     */
  async _onDropActor(_event, data) {
    // Check ownership of the current actor
    if (!this.actor.isOwner) return false;

    // Retrieve the Actor UUID from the data
    const uuid = data.uuid;

    // Ensure the UUID exists
    if (!uuid) {
      console.error("No UUID found in the dropped data");
      return false;
    }

    if (this.actor.system.hackerId) {
      //only one hacker allowed
      ui.notifications?.error("Cyberdeck already has a hacker");
      return;
    }

    try {
      // Retrieve the actor document using the UUID
      const droppedActor = await fromUuid(uuid);

      // Check if the retrieved document is an Actor
      if (!droppedActor || !droppedActor instanceof Actor) {
        console.error("The dropped data is not an actor.");
        return false;
      }

      // Check if the refreived document is a Character or NPC.
      if (droppedActor.type != 'character' && droppedActor.type != 'npc') {
        ui.notifications?.error("The dropped/added hacker is not a character or an npc.");
        return false;
      }
      const droppedActorId = droppedActor.id;
      await this.actor.update({ "system.hackerId": droppedActorId });
      const cyberdecks = droppedActor.system.cyberdecks;
      if (this.id && cyberdecks.indexOf(this.id) === -1) {
        cyberdecks.push(this.actor.id);
        await droppedActor.update({
          "system.cyberdecks": cyberdecks,
        });
      }

      const itemName = this.actor.name;
      droppedActor.createEmbeddedDocuments(
        "Item",
        [
          {
            name: itemName,
            type: "item",
            img: "systems/swnr/assets/icons/cyberdeck.png",
            system: {
              encumbrance: this.actor.system.encumberance,
              quantity: 1,
              cost: this.actor.system.cost,
            },
          },
        ],
        {}
      );
      ui.notifications?.info(
        `Created a cyberdeck item "${itemName}" on ${droppedActor.name}'s sheet`
      );

    } catch (err) {
      console.error("Error retrieving actor from UUID:", err);
    }
  }


  // All in base

}
