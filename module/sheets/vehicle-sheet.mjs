import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { getGameSettings } from '../helpers/register-settings.mjs';
import { headerFieldWidget, groupFieldWidget, groupFieldWidgetDupe} from '../helpers/handlebar.mjs';
import { SWNBaseSheet } from './base-sheet.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNVehicleSheet extends SWNBaseSheet {
  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'actor', 'vehicle'],
    position: {
      width: 760,
      height: 700,
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
      travel: this._onTravel,
      spike: this._onSpike,
      refuel: this._onRefuel,
      crisis: this._onCrisis,
      failure: this._onSysFailure,
      repair: this._onRepair,
      sensor: this._onSensor,
      calcCost: this._onCalcCost,
      makePayment: this._onPayment,
      npcCrewRoll: this._onCrewNPCRoll,
      payMaintenance: this._onMaintenance,
      resourceDelete: this._onResourceDelete,
      resourceCreate: this._onResourceCreate,
      crewDelete: this._onCrewDelete,
      crewRoll: this._onCrewRoll,
      crewShow: this._onCrewShow,
      pilotRoll: this._onPilotRoll,
      pilotDelete: this._onPilotDelete,
      pilotShow: this._onPilotShow,
      toggle: this._onToggleVehicleStatus,
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
      template: 'systems/swnr/templates/actor/vehicle/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    effects: {
      template: 'systems/swnr/templates/actor/effects.hbs',
    },
    features: {
      template: 'systems/swnr/templates/actor/features.hbs',
    },
    notes: {
      template: 'systems/swnr/templates/actor/vehicle/notes.hbs',
    },
    ship: {
      template: 'systems/swnr/templates/actor/vehicle/ship.hbs',
    },
    shipCrew: {
      template: 'systems/swnr/templates/actor/vehicle/ship-crew.hbs',
    },
    crewList: {
      template: 'systems/swnr/templates/actor/fragments/crew-list.hbs',
    },
    shipCombat: {
      template: 'systems/swnr/templates/actor/vehicle/ship-combat.hbs',
    },
    shipCargo: {
      template: 'systems/swnr/templates/actor/vehicle/ship-cargo.hbs',
    },
    carriedGear: {
      template: 'systems/swnr/templates/actor/fragments/compact-carried-list.hbs'
    },
    vehicleWeapons: {
      template: 'systems/swnr/templates/actor/fragments/vehicle-weapon-table.hbs'
    },
    vehicleFittings: {
      template: 'systems/swnr/templates/actor/fragments/vehicle-fitting-table.hbs'
    },
    vehicleDefense: {
      template: 'systems/swnr/templates/actor/fragments/vehicle-defense-table.hbs'
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.defaultTab = 'notes';

    // Not all parts always render
    options.parts = ['header', 'tabs', 'notes'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'mech':
        options.parts.push('shipCombat', 'effects');
        options.defaultTab = 'shipCombat';
        break;
      case 'ship':
        options.parts.push('shipCombat', 'ship', 'shipCrew', 'shipCargo', 'effects');
        options.defaultTab = 'shipCombat';
        break;
      case 'drone':
      case 'vehicle':
        options.parts.push('shipCombat', 'effects');
        options.defaultTab = 'shipCombat';
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    let crewArray = [];
    if (this.actor.system.crewMembers) {
      for (let crew of this.actor.system.crewMembers) {
        let actor = game.actors.get(crew);
        if (actor) {
          crewArray.push(actor);
        }
      }
    }
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
      groupWidgetDupe: groupFieldWidgetDupe.bind(this),
      crewArray: crewArray,
      actions: CONFIG.SWN.shipActions
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'ship':
      case 'shipCrew':
      case 'shipCombat':
      case 'shipCargo':
      case 'vehicle':
      case 'drone':
      case 'mech':
        context.tab = context.tabs[partId];
        break;
      case 'notes':
        context.tab = context.tabs[partId];
        // Enrich notes info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.actor.system.description,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );

        context.enrichedMods = await TextEditor.enrichHTML(
          this.actor.system.mods,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          });
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
   * @param {string} defaultTab The name of the default tab to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts, defaultTab = 'notes') {
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
        case 'notes':
          tab.id = 'notes';
          tab.label += 'VehicleNotes';
          break;
        case 'features':
          tab.id = 'features';
          tab.label += 'Features';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          break;
        case 'ship':
          tab.id = 'ship';
          tab.label += 'Ship';
          break;
        case 'shipCrew':
          tab.id = 'shipCrew';
          tab.label += 'Crew';
          break;
        case 'shipCargo':
          tab.id = 'shipCargo';
          tab.label += 'Cargo';
          break;
        case 'shipCombat':
          tab.id = 'shipCombat';
          tab.label += 'Combat';
          break;
        case 'vehicle':
          tab.id = 'vehicle';
          tab.label += 'Vehicle';
          break;
        case 'combatNotes':
          tab.id = 'combatNotes';
          tab.label += 'CombatNotes';
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
    // this sheet does with spells

    // Union regular weapons and ship weapons for vehicles, drones, and mechs
    let allWeapons = [];
    for (const i of this.document.itemTypes.shipWeapon) {
      allWeapons.push(i);
    }
    if (this.actor.type == "vehicle" || this.actor.type == "drone" || this.actor.type == "mech") {
      for (const i of this.document.itemTypes.weapon) {
        allWeapons.push(i);
      }
    }
    context.allWeapons = allWeapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
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


    this.element.querySelectorAll("[name='shipActions']").forEach((d) =>
      d.addEventListener('change', this._onShipAction.bind(this)));
    this.element.querySelectorAll(".resource-list-val").forEach((d) =>
      d.addEventListener('change', this._onResourceName.bind(this)));

    // For hull changes
    this.element.querySelectorAll("[name='system.shipHullType']").forEach((d) =>
      d.addEventListener('change', this._onHullChange.bind(this)));
    this.element.querySelectorAll("[name='system.model']").forEach((d) =>
      d.addEventListener('change', this._onHullChange.bind(this)));

  }



  /** Helper Functions */




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
    //dropped actor
    let actor = fromUuidSync(data.uuid);
    // Only allow dropping of npc or character actors
    if (actor.type !== 'npc' && actor.type !== 'character') {
      ui.notifications.error("Only NPC or Character actors can be dropped onto vehicle.");
      return false;
    }
    const actorId = actor.id;
    if (this.actor.type === 'ship' || this.actor.type === 'vehicle') {
      //Multi-crew vehicle
      let crewMembers = this.actor.system.crewMembers;
      if (crewMembers.indexOf(actorId) == -1) {
        crewMembers.push(actorId);
        let crewCount = this.actor.system.crew.current + 1;
        await this.actor.update(
          {
            system: {
              crewMembers: crewMembers,
              crew: { current: crewCount }
            }
          });
      }
    } else {
      //Single pilot vehicle
      let crewMembers = this.actor.system.crewMembers;
      if (crewMembers.length > 0) {
        // TODO allow shift to force remove/overwrite
        ui.notifications.warn(`${this.actor.name} already has a pilot. Remove first`);
        return false;
      }
      crewMembers.push(actorId);
      let crewCount = 1
      await this.actor.update(
        {
          system: {
            crewMembers: crewMembers,
            crew: { current: crewCount }
          }
        });

      // if drone add to pilot's inventory
      if (this.actor.type === 'drone') {

        const itemName = this.actor.name;
        actor.createEmbeddedDocuments(
          "Item",
          [
            {
              name: itemName,
              type: "item",
              img: "systems/swnr/assets/icons/drone.png",
              system: {
                encumbrance: this.actor.system.enc,
                quantity: 1,
                cost: this.actor.system.cost,
              },
            },
          ],
          {}
        );
        ui.notifications?.info(
          `Created a drone item "${itemName}" on ${actor.name}'s sheet`
        );
      }
    }
  }

  /* -------------------------------------------- */


  async _onResourceName(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const value = event.target?.value;
    const resourceType = event.target.dataset.rlType
    const idx = event.target.dataset.rlIdx;
    const resourceList = duplicate(this.actor.system.cargoCarried);
    resourceList[idx][resourceType] = value;
    await this.actor.update({ "system.cargoCarried": resourceList });
  }

  static async _onResourceDelete(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const idx = target.dataset.idx;
    const resourceList = duplicate(this.actor.system.cargoCarried);
    resourceList.splice(idx, 1);
    await this.actor.update({ "system.cargoCarried": resourceList });
  }

  static async _onResourceCreate(event, target) {
    event.preventDefault();
    let resourceList = this.actor.system.cargoCarried;
    if (!resourceList) {
      resourceList = [];
    }
    resourceList.push({ name: "Cargo X", value: 0, max: 1 });
    await this.actor.update({
      "system.cargoCarried": resourceList,
    });
  }

  static async _onCrewDelete(event, target) {
    event.preventDefault();
    const actorId = target.dataset.crewId;
    let crewMembers = this.actor.system.crewMembers;
    //Only remove if there
    const idx = crewMembers.indexOf(actorId);
    if (idx == -1) {
      ui.notifications?.error("Crew member not found");
    } else {
      crewMembers.splice(idx, 1);
      let crew = this.actor.system.crew.current;
      crew -= 1;
      if (this.actor.system.roles) {
        let roles = { ...this.actor.system.roles };
        if (roles.captain == actorId) {
          roles.captain = null;
        }
        if (roles.comms == actorId) {
          roles.comms = null;
        }
        if (roles.engineering == actorId) {
          roles.engineering = null;
        }
        if (roles.gunnery == actorId) {
          roles.gunnery = null;
        }
        if (roles.bridge == actorId) {
          roles.bridge = null;
        }
        await this.actor.update({
          "system.crew.current": crew,
          "system.crewMembers": crewMembers,
          "system.roles": roles,
        });
      } else {
        await this.actor.update({
          "system.crew.current": crew,
          "system.crewMembers": crewMembers,
        });
        if (this.actor.type == "drone") {
          ui.notifications.info("Check character sheet for removing drone");
        }
      }
    }
  }

  static async _onToggleVehicleStatus(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    const item = this._getEmbeddedDocument(target);
    const flipping = dataset.toggle;
    if (flipping == undefined || flipping == "") {
      ui.notifications.error("Toggle status not found");
      return;
    }
    // check if flipping is juryRigged, broken, destroyed
    if (flipping == "juryRigged" || flipping == "broken" || flipping == "destroyed") {
      let juryRigged = false;
      let broken = false;
      let destroyed = false;
      switch (dataset.toggle) {
        case 'juryRigged':
          juryRigged = !item.system.juryRigged;
          break;
        case 'broken':
          broken = !item.system.broken;
          break;
        case 'destroyed':
          destroyed = !item.system.destroyed;
          break;
      }
      await item.update({
        system: {
          broken: broken,
          destroyed: destroyed,
          juryRigged: juryRigged,
        }
      });
    } else {
      ui.notifications.error("unknown toggle status");
    }
  }

  static async _onCrewShow(event, target) {
    event.preventDefault();
    const actorId = target.dataset.crewId;
    const crewActor = game.actors?.get(actorId);
    crewActor?.sheet?.render(true);
  }

  async crewRoll(crewActor) {
    const skills = crewActor.itemTypes.skill;
    const isChar = crewActor.type == "character" ? true : false;
    const dialogData = {
      actor: crewActor,
      skills: skills,
      isChar,
      pool: CONFIG.SWN.pool,
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
      await roll.roll();
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

  static async _onCrewRoll(event, target) {
    event.preventDefault();
    const actorId = target.dataset.crewId;
    const crewActor = game.actors?.get(actorId);
    if (!crewActor) {
      ui.notifications?.error(`Crew no longer exists`);
      return;
    }
    this.crewRoll(crewActor);
  }

  static async _onPilotShow(event, _target) {
    event.preventDefault();
    const crewMembers = this.actor.system.crewMembers;
    if (crewMembers.length == 0) {
      return;
    }
    const actorId = crewMembers[0];
    const crewActor = game.actors?.get(actorId);
    crewActor?.sheet?.render(true);
  }

  static async _onPilotRoll(event, _target) {
    event.preventDefault();
    const crewMembers = this.actor.system.crewMembers;
    if (crewMembers.length == 0) {
      ui.notifications?.error(`No pilot to roll for`);
      return;
    }
    const pilotId = this.actor.system.crewMembers[0];
    const pilotActor = game.actors?.get(pilotId);
    if (!pilotActor) {
      ui.notifications?.error(`Pilot no longer exists`);
      return;
    }
    this.crewRoll(pilotActor);
  }

  static async _onPilotDelete(event, _target) {
    event.preventDefault();
    const crewMembers = this.actor.system.crewMembers;
    if (crewMembers.length == 0) {
      ui.notifications?.error(`No pilot to remove`);
      return;
    }
    if (this.actor.type == "drone") {
      // TODO remove drone from pilot's inventory
      ui.notifications?.info("Manually remove drone from pilot's inventory");
    }
    await this.actor.update({
      "system.crew.current": 1,
      "system.crewMembers": [],
    });
  }

  static async _onPayment(event, target) {
    return this._onPay(event, "payment");
  }

  static async _onMaintenance(event, target) {
    return this._onPay(event, "maintenance");
  }

  async _onPay(event, paymentType) {
    // if a new payment type is added this function needs to be refactored
    let shipPool = this.actor.system.creditPool;
    const paymentAmount =
      paymentType == "payment"
        ? this.actor.system.paymentAmount
        : this.actor.system.maintenanceCost;
    // Assume its payment and change if maintenance

    const lastPayDate =
      paymentType == "payment"
        ? this.actor.system.lastPayment
        : this.actor.system.lastMaintenance;
    const monthSchedule =
      paymentType == "payment"
        ? this.actor.system.paymentMonths
        : this.actor.system.maintenanceMonths;

    if (paymentAmount > shipPool) {
      ui.notifications?.error(
        `Not enough money in the pool for paying ${paymentAmount} for ${paymentType}`
      );
      return;
    }
    shipPool -= paymentAmount;
    const dateObject = new Date(
      lastPayDate.year,
      lastPayDate.month - 1,
      lastPayDate.day
    );
    dateObject.setMonth(dateObject.getMonth() + monthSchedule);
    if (paymentType == "payment") {
      await this.actor.update({
        system: {
          creditPool: shipPool,
          lastPayment: {
            year: dateObject.getFullYear(),
            month: dateObject.getMonth() + 1,
            day: dateObject.getDate(),
          },
        },
      });
    } else {
      await this.actor.update({
        system: {
          creditPool: shipPool,
          lastMaintenance: {
            year: dateObject.getFullYear(),
            month: dateObject.getMonth() + 1,
            day: dateObject.getDate(),
          },
        },
      });
    }
    this.actor.system.setScheduledDate(dateObject, paymentType);
  }

  async _onHullChange(event) {
    const targetHull = event.target?.value;
    if (this.actor.type == "mech" || this.actor.type == "vehicle") {
      // Not supported as mech is deluxe. 
      // TODO vehicle types in CWN or AWN to use?
      return;
    }

    if (targetHull) {
      const d = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Apply Default Stats" },
        content: `<p>Do you want to apply the default stats for a ${targetHull}?</p><b>This will change your current and max values for stats like HP, cost, armor, AC, mass, power, hardpoints, hull type, speed, life support (60*max crew), and crew.</b>`,
        modal: true,
      });

      if (!d) return;
      let hullData = CONFIG.SWN.HullData;
      if (this.actor.type == "drone") {
        hullData = CONFIG.SWN.DroneModelsData;
      }
      if (hullData[targetHull]) {
        await this.actor.update(hullData[targetHull]);
      } else {
        console.log("hull type not found " + targetHull);
      }
    }
  }

  static async _onRepair(event, target) {
    event.preventDefault();
    const data = this.actor.system;
    const hpToFix = data.health.max - data.health.value;
    const hpCosts = hpToFix * 1000;
    const shipInventory = this.actor.items.filter(
      (i) =>
        i.type === "shipDefense" ||
        i.type === "shipWeapon" ||
        i.type === "shipFitting"
    );

    const disabledParts = shipInventory.filter(
      (i) => i.system.broken == true && i.system.destroyed == false
    );
    const shipClass = this.actor.system.shipClass;

    let multiplier = 1;
    if (shipClass == "frigate") {
      multiplier = 10;
    } else if (shipClass == "cruiser") {
      multiplier = 25;
    } else if (shipClass == "capital") {
      multiplier = 100;
    }

    let disabledCosts = 0;
    const itemsToFix = [];
    const eitems = [];
    for (let i = 0; i < disabledParts.length; i++) {
      const item = disabledParts[i];
      const itemCost = item.system.costMultiplier
        ? item.system.cost * multiplier
        : item.system.cost;
      disabledCosts += itemCost;
      itemsToFix.push(`${item.name} (${itemCost})`);
      eitems.push({ _id: item.id, data: { broken: false } });
    }
    if (eitems.length > 0) {
      await this.actor.updateEmbeddedDocuments("Item", eitems);
    }
    const fullRepairCost = disabledCosts * 0.25;
    const totalCost = hpCosts + fullRepairCost;
    await this.actor.update({ "system.health.value": data.health.max });
    if (totalCost > 0) {
      const itemList = itemsToFix.join("<br>");
      const content = `<h3>Ship Repaired</h3><b>Estimated Total Cost: ${totalCost}</b><br>HP points: ${hpToFix} cost: ${hpCosts}<br>Full Repair Costs: ${fullRepairCost} (25%/item cost). <br><br> Items Repaired (item full cost):<br> ${itemList} `;
      const chatData = {
        content: content,
      };
      ChatMessage.create(chatData);
    } else {
      ui.notifications.info("Nothing to repair");
    }
  }

  static async _onTravel(event, _target) {
    event.preventDefault();
    if (this.actor.type != "ship") {
      ui.notifications?.error("Only ships can travel.");
    };
    if (this.actor.system.spikeDrive.value <= 0) {
      ui.notifications?.error("Drive disabled.");
      return;
    }
    // TODO localize
    const _doTravel = async (_event, button, _html) => {
      const days = button.form.elements.amount.value;
      if (isNaN(parseInt(days))) {
        ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
        return;
      }
      if (days && days != "") {
        const nDays = Number(days);
        if (nDays) {
          this.actor.system.useDaysOfLifeSupport(nDays);
          if (game.modules?.get("foundryvtt-simple-calendar")?.active) {
            this.actor.moveTime(nDays);
          }
        }
      }
    }

    const _proceed = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Travel Days (Use life support)" },
      content: `<label>Days of Travel</label><input type='text' name='amount'></input>`,
      modal: false,
      rejectClose: false,
      ok: {
        callback: _doTravel,
        icon: 'fas fa-check',
        label: 'Travel',
      }
    });
  }

  static async _onSensor(event, _target) {
    event.preventDefault();
    let defaultCommId = this.actor.system.roles.comms;
    let defaultComm = null;
    if (defaultCommId) {
      const _temp = game.actors?.get(defaultCommId);
      if (_temp && (_temp.type == "character" || _temp.type == "npc")) {
        defaultComm = _temp;
      }
    }
    const crewArray = [];
    if (this.actor.system.crewMembers) {
      for (let i = 0; i < this.actor.system.crewMembers.length; i++) {
        const cId = this.actor.system.crewMembers[i];
        const crewMember = game.actors?.get(cId);
        if (
          crewMember &&
          (crewMember.type == "character" || crewMember.type == "npc")
        ) {
          crewArray.push(crewMember);
        }
      }
    }
    const title = game.i18n.format("swnr.dialog.sensorRoll", {
      actorName: this.actor?.name,
    });

    if (defaultComm == null && crewArray.length > 0) {
      //There is no pilot. Use first crew as default
      defaultComm = crewArray[0];
      defaultCommId = crewArray[0].id;
    }
    if (defaultComm?.type == "npc" && crewArray.length > 0) {
      //See if we have a non NPC to set as pilot to get skills and attr
      for (const char of crewArray) {
        if (char.type == "character") {
          defaultComm = char;
          defaultCommId = char.id;
          break;
        }
      }
    }
    const dialogData = {
      actor: this.actor.system,
      defaultSkill1: "Program",
      defaultSkill2: "Tech/Astronautic",
      defaultStat: "int",
      comm: defaultComm,
      commId: defaultCommId,
      crewArray: crewArray,
    };

    const template = "systems/swnr/templates/dialogs/roll-sensor.hbs";
    const html = renderTemplate(template, dialogData);
    const _rollForm = async (_event, button, _html) => {
      const mod = parseInt(
        button.form.elements.modifier?.value
      ) || 0;
      const actorId = button.form.elements.commId.value;
      const rollingActor = actorId ? game.actors?.get(actorId) : null;
      const dice = button.form.elements.dicepool.value;
      const skillName = button.form.elements.skill.value;
      const statName = button.form.elements.stat.value;
      const targetModifier = parseInt(
        button.form.elements.targetModifier?.value
      ) || 0;
      const observerModifier = parseInt(
        button.form.elements.observerModifier?.value
      ) || 0;
      const rollingAs = button.form.elements.rollingAs.value;
      if (
        rollingAs != "observer" &&
        rollingAs != "target" &&
        rollingAs != "single"
      ) {
        ui.notifications?.error("Error with rolling as ");
        return;
      }
      const rollType = button.form.elements.rollType.value;
      if (
        rollType != "roll" &&
        rollType != "gmroll" &&
        rollType != "blindroll"
      ) {
        ui.notifications?.error("Error with roll type");
        return;
      }

      let skillMod = 0;
      let statMod = 0;
      let actorName = "";
      if (rollingActor) {
        if (skillName) {
          // We need to look up by name
          console.log("looking for skill", skillName); //TODO remove
          for (const skill of rollingActor.itemTypes.skill) {
            if (skillName == skill.name) {
              skillMod =
                skill.system["rank"] < 0 ? -1 : skill.system["rank"];
            }
          }
        } //end skill
        if (statName) {
          const sm = rollingActor.system["stats"]?.[statName].mod;
          if (sm) {
            console.log("setting stat mod", sm);
            statMod = sm;
          }
        }
        actorName = rollingActor.name;
      }
      this.actor.system.rollSensor(
        actorName,
        targetModifier,
        observerModifier,
        skillMod,
        statMod,
        dice,
        rollingAs,
        rollType
      );
    };


    const _proceed = await foundry.applications.api.DialogV2.prompt({
      window: { title: title },
      content: await html,
      modal: false,
      rejectClose: false,
      ok: {
        label: game.i18n.localize("swnr.chat.roll"),
        callback: _rollForm,
      },
    }
    );

  }

  static async _onSpike(event, target) {
    event.preventDefault();
    if (this.actor.system.fuel.value <= 0) {
      ui.notifications?.error("Out of fuel.");
      return;
    }
    if (this.actor.system.spikeDrive.value <= 0) {
      ui.notifications?.error("Drive disabled.");
      return;
    }
    let defaultPilotId = this.actor.system.roles.bridge;
    let defaultPilot = null;
    if (defaultPilotId) {
      const _temp = game.actors?.get(defaultPilotId);
      if (_temp && (_temp.type == "character" || _temp.type == "npc")) {
        defaultPilot = _temp;
      }
    }
    const crewArray = [];
    if (this.actor.system.crewMembers) {
      for (let i = 0; i < this.actor.system.crewMembers.length; i++) {
        const cId = this.actor.system.crewMembers[i];
        const crewMember = game.actors?.get(cId);
        if (
          crewMember &&
          (crewMember.type == "character" || crewMember.type == "npc")
        ) {
          crewArray.push(crewMember);
        }
      }
    }

    const title = game.i18n.format("swnr.dialog.spikeRoll", {
      actorName: this.actor?.name,
    });

    if (defaultPilot == null && crewArray.length > 0) {
      //There is no pilot. Use first crew as default
      defaultPilot = crewArray[0];
      defaultPilotId = crewArray[0].id;
    }
    if (defaultPilot?.type == "npc" && crewArray.length > 0) {
      //See if we have a non NPC to set as pilot to get skills and attr
      for (const char of crewArray) {
        if (char.type == "character") {
          defaultPilot = char;
          defaultPilotId = char.id;
          break;
        }
      }
    }

    const dialogData = {
      actor: this.actor.system,
      defaultSkill1: "Pilot",
      defaultSkill2: "Navigation",
      defaultStat: "int",
      pilot: defaultPilot,
      pilotId: defaultPilotId,
      crewArray: crewArray,
      baseDifficulty: 7,
    };

    const template = "systems/swnr/templates/dialogs/roll-spike.hbs";
    const html = renderTemplate(template, dialogData);

    const _rollForm = async (_event, button, _html) => {
      const mod = parseInt(
        button.form.elements.modifier?.value
      ) || 0;
      const pilotId = button.form.elements.pilotId.value;
      const pilot = pilotId ? game.actors?.get(pilotId) : null;
      const dice = button.form.elements.dicepool.value;
      const skillName = button.form.elements.skill.value;
      const statName = button.form.elements.stat.value;
      const difficulty = parseInt(
        button.form.elements.difficulty?.value
      ) || 0;
      const travelDays = parseInt(
        button.form.elements.travelDays?.value
      ) || 0;
      let skillMod = 0;
      let statMod = 0;
      let pilotName = "";
      if (pilot) {
        if (skillName) {
          // We need to look up by name
          for (const skill of pilot.itemTypes.skill) {
            if (skillName == skill.name) {
              skillMod =
                skill.system["rank"] < 0 ? -1 : skill.system["rank"];
            }
          }
        } //end skill
        if (statName) {
          const sm = pilot.system["stats"]?.[statName].mod;
          if (sm) {
            console.log("setting stat mod", sm);
            statMod = sm;
          }
        }
        pilotName = pilot.name;
      }
      this.actor.system.rollSpike(
        pilotId,
        pilotName,
        skillMod,
        statMod,
        mod,
        dice,
        difficulty,
        travelDays
      );
    };

    const popUpDialog = await foundry.applications.api.DialogV2.prompt(
      {
        window: { title: title },
        content: await html,
        modal: false,
        rejectClose: false,
        ok: {
          label: game.i18n.localize("swnr.chat.roll"),
          callback: _rollForm,
        },
      }
    );

  }

  static async _onRefuel(event, target) {
    event.preventDefault();
    const data = this.actor.system;
    const daysToRefill = data.lifeSupportDays.max - data.lifeSupportDays.value;
    const fuelToRefill = data.fuel.max - data.fuel.value;
    const lifeCost = daysToRefill * 20;
    const fuelCost = fuelToRefill * 500;
    const totalCost = lifeCost + fuelCost;
    await this.actor.update({
      "system.lifeSupportDays.value": data.lifeSupportDays.max,
      "system.fuel.value": data.fuel.max,
    });
    //ui.notifications?.info("Refuelled");
    const chatData = {
      content: `Refueled. Estimated refuel costs: <b>${totalCost}</b>. <br>${daysToRefill} of life support costs ${lifeCost} (20/day). <br> ${fuelToRefill} jumps cost ${fuelCost} (500/load).`,
    };
    if (totalCost > 0) {
      ChatMessage.create(chatData);
    }
  }

  static _onCrisis(event, target) {
    event.preventDefault();
    this.actor.system.rollCrisis();
  }

  static async _onSysFailure(event, target) {
    event.preventDefault();
    const title = game.i18n.format("swnr.dialog.sysFailure", {
      actorName: this.actor?.name,
    });
    const dialogData = {};
    const template = "systems/swnr/templates/dialogs/roll-ship-failure.hbs";
    const html = renderTemplate(template, dialogData);

    const _rollForm = async (_event, button, html) => {
      const incDrive = button.form.elements.incdrive?.checked
        ? true
        : false;
      const incWpn = button.form.elements.incwpn?.checked
        ? true
        : false;
      const incFit = button.form.elements.incfit?.checked
        ? true
        : false;
      const incDef = button.form.elements.incdef?.checked
        ? true
        : false;
      const whatToRoll = button.form.elements.what.value;

      const sysToInclude = [];
      if (incDrive) {
        sysToInclude.push("drive");
      }
      if (incWpn) {
        sysToInclude.push("wpn");
      }
      if (incFit) {
        sysToInclude.push("fit");
      }
      if (incDef) {
        sysToInclude.push("def");
      }
      this.actor.system.rollSystemFailure(sysToInclude, whatToRoll);
    };

    const popUpDialog = await foundry.applications.api.DialogV2.prompt(
      {
        window: { title: title },
        content: await html,
        modal: false,
        rejectClose: false,
        ok: {
          label: game.i18n.localize("swnr.chat.roll"),
          callback: _rollForm,
        },
      }
    );
  }

  static async _onCalcCost(event, target) {
    event.preventDefault();
    const hullType = this.actor.system.shipHullType;
    const d = await foundry.applications.api.DialogV2.wait({
      window: { title: "Calc Costs" },
      content: `<p>Do you want to calculate the cost based on your fittings and the hull: ${hullType}</p>`,
      rejectClose: false,
      modal: false,
      buttons: [
        {
          icon: 'fas fa-check',
          label: "Yes, but leave maintenance alone",
          action: false
          // callback: (_e, _b, _d) => {
          //   let x = this.actor.calcCost(false);
          //   return x;
          // },
        },
        {
          icon: 'fas fa-times',
          label: "Yes, and calc. maintenance costs as 5%",
          action: true
          // callback: (_e, _b, _d) => {
          //   let m = this.actor.calcCost(true);
          //   return m;
          // },
        },
        {
          icon: 'fas fa-times',
          label: "No",
          action: "no"
          // callback: (_e,_b,_d) => {
          //   console.log("Doing nothing");
          // },
        },
      ]
    });
    if (d == "no") {
      return;
    }
    let maint = this.actor.system.calcCost(d);

  }


  static async _onCrewNPCRoll(event, target) {
    event.preventDefault();
    // Roll skill, show name, skill, attr if != ""
    const rollMode = game.settings.get("core", "rollMode");
    const formula = `2d6 + @npcCrewSkill`;
    const npcCrewSkill = this.actor.system.crewSkillBonus
      ? this.actor.system.crewSkillBonus
      : 0;
    const roll = new Roll(formula, {
      npcCrewSkill,
    });
    await roll.roll();
    const title = `Rolling generic skill with bonus ${npcCrewSkill}`;
    roll.toMessage(
      {
        speaker: ChatMessage.getSpeaker(),
        flavor: title,
      },
      { rollMode }
    );
  }

  static async _setCaptSupport(dept) {
    const deptSupport = this.actor.system.supportingDept
      ? this.actor.system.supportingDept
      : "";
    if (dept == deptSupport) {
      return;
    }
    if (deptSupport != "") {
      ui.notifications?.error("Department is already supported. Error.");
    }
    await this.actor.update({
      "system.supportingDept": dept,
    });
  }

  /* Handles drag-and-drop visual */
  _handleDragEnter(event) {
    let ele = event.target.closest(".item-row");
    if (ele) $(ele).addClass('over')
  }

  _handleDragLeave(event) {
    let ele = event.target.closest(".item-row");
    if (ele) $(ele).removeClass('over')
  }


  async _onShipAction(event) {
    event.preventDefault();
    const actionName = event.target?.value;
    if (actionName === "") {
      return;
    }
    const action = CONFIG.SWN.shipActions[actionName];
    if (!action) {
      ui.notifications?.error("There was an error in looking up your action");
      return;
    }
    const actionTitle = action.title ? action.title : actionName;
    let cp = this.actor.system.commandPoints;
    const actionsTaken = this.actor.system.actionsTaken
      ? this.actor.system.actionsTaken
      : [];
    if (action.limit === "round" && actionsTaken.indexOf(actionName) >= 0) {
      ui.notifications?.info(
        "Already taken the action this round. Did you forget to end the last round?"
      );
      return;
    }
    // Special actions
    if (actionName == "startRound") {
      let depts = ``;
      let roleOrder = [];
      let roles = [];
      if (this.actor.system.roleOrder && this.actor.system.roleOrder.length > 0) {
        // we may have set an order prior
        roleOrder = this.actor.system.roleOrder;
      } else {
        // get the default list
        // to iterate schema      
        // for (const role of Object.keys(this.actor.system.schema.fields.roles.fields)) {
        for (const role of Object.entries(this.actor.system.roles)) {
          roleOrder.push(role[0]);
        }
      }
      if (roleOrder.length == 0) {
        ui.notifications?.error("No roles assigned");
        return;
      }
      let counter = 0;
      for (const role of roleOrder) {
        let roleName = "";
        if (this.actor.system.roles[role]) {
          const roleActor = game.actors?.get(this.actor.system.roles[role]);
          if (roleActor && roleActor.name) {
            roleName = ` (${roleActor.name})`;
          }
        }
        depts += `<div class="border p-2 flex border-black role-order" data-role="${role}" data-role-name="${roleName}"><a><i class="fas fa-sort"></i></a>${role}${roleName}</div>`;
        let capRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        let roleTuple = [role, `${capRole}${roleName}`, counter++];
        roles.push(roleTuple);
      }
      let selectDialog = `
    <div class="flex flex-col">
      <h2> Order Departments/Roles </h2>
      <input type="hidden" id="roleCount" value="${roles.length}">
    `;
      for (let i = 1; i <= roles.length; i++) {
        selectDialog += `<div class="flex flexrow"> ${i}: <select id="role${i}">`;
        for (let j = 0; j < roles.length; j++) {
          let role = roles[j];
          let selected = '';
          if (role[2] == i - 1) {
            selected = 'selected';
          }
          selectDialog += `<option value="${role[0]}" ${selected}>${role[1]}</option>`;
        }
        selectDialog += `</select></div>`;
      }
      selectDialog += `</div>`;
      const sortedDialogTemplate = `
    <div class="flex flex-col">
      <h2> Order Departments/Roles </h2>
      <div class="flex flexrow">
          <div id="deptOrder">
          ${depts}
          </div>
      </div>
      <script>
      console.log("hello");

      var el = document.getElementById('deptOrder');
      console.log(el);
      el.
      el.find('.role-order').each((i, di) {
        console.log(di);
        new Dragster( di );
        li.addEventListener("dragster:enter", ev => this._handleDragEnter(ev) , false);
        li.addEventListener("dragster:leave", ev => this._handleDragLeave(ev) , false);
      });

      // var sortable = Sortable.create(el);
      </script>
    </div>
    `;
      const d = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Set Order" },
        content: selectDialog,
        modal: true,
        rejectClose: false,
        ok: {
          label: "Set Order",
          callback: async (_event, button, html) => {
            let count = button.form.elements.roleCount.value;
            const orderArr = [];
            for (let i = 1; i <= count; i++) {
              const role = button.form.elements[`role${i}`].value;
              if (orderArr.indexOf(role) >= 0) {
                ui.notifications?.error("Duplicate role found. Not setting order.");
                return;
              }
              orderArr.push(role);
            }
            if (orderArr.length > 0) {
              await this.actor.update({ system: { roleOrder: orderArr } });
            }
          }
        }
      });
      return;
    } else if (actionName == "endRound") {
      // endRound action is special. clear and reset.
      const newCp = this.actor.system.npcCommandPoints
        ? this.actor.system.npcCommandPoints
        : 0;
      let actionsText =
        actionsTaken.length > 0 ? `Actions: <ul>` : "No actions.";

      if (actionsTaken.length > 0) {
        for (const act of actionsTaken) {
          const actTitle =
            CONFIG.SWN.shipActions[act] && CONFIG.SWN.shipActions[act].title ? CONFIG.SWN.shipActions[act].title : act;
          actionsText += `<li>${actTitle}</li>`;
        }
        actionsText += "</ul>";
      }
      const chatData = {
        content: `Round ended for ${this.actor.name}. Setting CP to ${newCp}<br>${actionsText}`,
      };
      actionsTaken.length = 0;
      await this.actor.update({
        data: {
          commandPoints: newCp,
          actionsTaken: actionsTaken,
          supportingDept: "",
        },
      });
      event.target.value = "";
      ChatMessage.create(chatData);
      return;
    }
    let actionCp = action.cp ? action.cp : 0;
    let supported = false;
    let supportingDept = this.actor.system.supportingDept;
    if (action.dept && action.dept == supportingDept) {
      // If captain is supporting the department.
      actionCp += 2;
      supported = true;
    }
    // Verify enough CP
    if (actionCp < 0 && cp + actionCp < 0) {
      ui.notifications?.error("Not enough command points");
      return;
    }
    const noteText = action.note ? action.note : "";
    let diffText = action.dc ? `<br>Difficulty:${action.dc}` : "";
    if (action.dc === "opposed") {
      const res = await new Roll("2d6").roll();
      diffText += ` (2d6: ${res.total})`;
    }
    const descText = action.desc ? action.desc : "";
    const order = this.actor.system.roleOrder
      ? ` (${this.actor.system.roleOrder.join(",")})`
      : "";
    if (action.skill) {
      // this action needs a skill roll
      let skillLevel = -1;
      let attrMod = 0;
      let attrName = "";
      let dicePool = "2d6";

      if (action.dept) {
        let foundActor = false; // might not be anyone in this dept/role
        if (this.actor.system.roles[action.dept] != "") {
          const defaultActor = game.actors?.get(
            this.actor.system.roles[action.dept]
          );
          if (defaultActor) {
            foundActor = true;
            if (defaultActor.type == "character") {
              for (const skill of defaultActor.itemTypes.skill) {
                if (action.skill == skill.name) {
                  skillLevel = skill.system["rank"];
                  dicePool =
                    skill.system["pool"] && skill.system["pool"] != "ask"
                      ? skill.system["pool"]
                      : "2d6";
                }
              }
              let tempMod = -2;
              if (action.attr) {
                // Find the attribute with the highest mod
                for (const attr of action.attr) {
                  if (
                    defaultActor.system.stats[attr] &&
                    defaultActor.system.stats[attr].mod > tempMod
                  ) {
                    tempMod = defaultActor.system.stats[attr].mod;
                    const key = `swnr.stat.short.${attr}`;
                    attrName = `${game.i18n.localize(key)}\\`;
                  }
                }
                attrMod = tempMod;
              }
            }
            if (defaultActor.type == "npc") {
              skillLevel = defaultActor.system.skillBonus;
            }
            // Roll skill, show name, skill, attr if != ""
            const rollMode = game.settings.get("core", "rollMode");
            const formula = `${dicePool} + @skillLevel + @attrMod`;
            const roll = new Roll(formula, {
              skillLevel,
              attrMod,
            });
            await roll.roll();
            const title = `<span title="${descText}">Rolling ${actionTitle} ${attrName}${action.skill} for ${defaultActor.name}<br>${noteText}${diffText}</span><br>${order}`;
            roll.toMessage(
              {
                speaker: ChatMessage.getSpeaker(),
                flavor: title,
              },
              { rollMode }
            );
          }
        }
        if (!foundActor) {
          // We are here means there is a skill but we don't know who it is for
          skillLevel = this.actor.system.crewSkillBonus
            ? this.actor.system.crewSkillBonus
            : 0;
          const rollMode = game.settings.get("core", "rollMode");
          const formula = `${dicePool} + @skillLevel`;
          const roll = new Roll(formula, {
            skillLevel,
            attrMod,
          });
          await roll.roll();
          const title = `<span title="${descText}">Rolling ${actionTitle} ${attrName}${action.skill}. No PC/NPC set to role/dept.<br>${noteText}${diffText}</span>`;
          roll.toMessage(
            {
              speaker: ChatMessage.getSpeaker(),
              flavor: title,
            },
            { rollMode }
          );
        }
      }
    } else {
      if (actionName == "supportDept") {
        const d = new Dialog({
          title: "Support Department",
          content:
            "<p>You must choose a department to support (actions are 2 CP cheaper)</p>",
          buttons: {
            bridge: {
              icon: '<i class="fas fa-check"></i>',
              label: "Bridge",
              callback: () => this._setCaptSupport("bridge"),
            },
            comms: {
              icon: '<i class="fas fa-check"></i>',
              label: "Comms",
              callback: () => this._setCaptSupport("comms"),
            },
            engineering: {
              icon: '<i class="fas fa-check"></i>',
              label: "Eng.",
              callback: () => this._setCaptSupport("engineering"),
            },
            gunnery: {
              icon: '<i class="fas fa-check"></i>',
              label: "Gunnery",
              callback: () => this._setCaptSupport("gunnery"),
            },
          },
          default: "bridge",
        });
        d.render(true);
      }
      // there is no skill
      const chatData = {
        content: `<span title="${descText}">${this.actor.name} ${actionTitle}<br><span class="flavor-text message-header" style="font-size:12px;">${noteText}${diffText}</span><br>${order}</span>`,
      };
      ChatMessage.create(chatData);
    }
    // Consume CP
    cp += actionCp;
    actionsTaken.push(actionName);
    if (supported) {
      // one-time action
      supportingDept = "";
    }
    await this.actor.update({
      "system.commandPoints": cp,
      "system.actionsTaken": actionsTaken,
      "system.supportingDept": supportingDept,
    });
    event.target.value = "";
    return;
  }

}
