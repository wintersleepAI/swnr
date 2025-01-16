import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { getGameSettings } from '../helpers/register-settings.mjs';
import { headerFieldWidget, groupFieldWidget } from '../helpers/handlebar.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNVehicleSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'actor','vehicle'],
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
      creditsChange: this._onAddCurrency,
      resourceDelete: this._onResourceDelete,
      resourceCreate: this._onResourceCreate,
      crewDelete: this._onCrewDelete,
      crewRoll: this._onCrewRoll,
      crewShow: this._onCrewShow
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
    biography: {
      template: 'systems/swnr/templates/actor/biography.hbs',
    },
    ship: {
      template: 'systems/swnr/templates/actor/vehicle/ship.hbs',
    },
    vehicle: {
      template: 'systems/swnr/templates/actor/vehicle/vehicle.hbs',
    },
    drone: {
      template: 'systems/swnr/templates/actor/vehicle/drone.hbs',
    },
    mech: {
      template: 'systems/swnr/templates/actor/vehicle/mech.hbs',
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
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.defaultTab= 'biography';

    // Not all parts always render
    options.parts = ['header', 'tabs', 'biography'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'mech':
        options.parts.push('mech','effects');
        options.defaultTab = 'mech';
        break;
      case 'ship':
        options.parts.push('shipCombat','ship','shipCrew','shipCargo','effects');
        options.defaultTab = 'shipCombat';
        break;
      case 'drone':
        options.parts.push('drone','effects');
        options.defaultTab = 'drone';
        break;
      case 'vehicle':
        options.parts.push('vehicle','effects');
        options.defaultTab = 'vehicle';
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
      crewArray: crewArray,
      actions: CONFIG.SWN.shipActions
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    // TODO copy from actor-sheet.mjs
    console.log("TODO: Implement _preparePartContext");//TODO
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
  _getTabs(parts, defaultTab = 'biography') {
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
        case 'drone':
          tab.id = 'drone';
          tab.label += 'Drone';
          break;
        case 'mech':
          tab.id = 'mech';
          tab.label += 'Mech';
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
    console.log("TODO: Implement _prepareItems");//TODO
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

    
    this.element.querySelectorAll("[name='shipActions']").forEach((d) => 
      d.addEventListener('change', this._onShipAction.bind(this)));
    this.element.querySelectorAll("[name='data.shipHullType']").forEach((d) => 
      d.addEventListener('change', this._onHullChange.bind(this)));
    this.element.querySelectorAll(".resource-list-val").forEach((d) => 
      d.addEventListener('change', this._onResourceName.bind(this)));
  }

  /**************
   *
   *   CONFIG.SWN.shipActions
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
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
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
  _onDragOver(event, target) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event, target) {
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
          { system: {
            crewMembers: crewMembers,
            crew: { current: crewCount }
          }
        });
      }
    } else {
      //Single pilot vehicle
      ui.notifications.error("TODO");
    }
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

  // Add Currency to selected type
static async _onAddCurrency(event, target) {
  // Stop propagation
  event.preventDefault();
  event.stopPropagation();

  // get any useful params
  const currencyType = target.dataset.creditType

  // load html variable data for dialog
  const template = "systems/swnr/templates/dialogs/add-currency.hbs";
  const data = {};
  const html = await renderTemplate(template, data);

  
  // show a dialog prompting for amount of change to add
  const amount = await new Promise((resolve) => {
    new ValidatedDialog({
      title: game.i18n.localize("swnr.AddCurrency"),
      content: html,
      buttons: {
        one: {
          label: "Add",
          callback: (html) => resolve(html.find('[name="amount"]').val()),
        },
        two: {
          label: "Cancel",
          callback: () => resolve("0"),
        },
      },
      default: "one",
      close: () => resolve("0")
    },{
      classes: ["swnr"]
    }).render(true);
  });

  // If it's not super easily parsable as a number
  if (isNaN(parseInt(await amount))) {
    ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
    return;
  }

  // if the amount is 0, or the cancel button was hit
  if (parseInt(amount) == 0) {
    // we can return silently in this case
    return;
  } else {
    // this is our valid input scenario
    await this.actor.update({
      system: {
        [currencyType]: this.actor.system[currencyType] + parseInt(await amount)
      }
    });
  }
}

async _onResourceName(event, target) {
  event.preventDefault();
  event.stopPropagation();
  const value = target?.value;
  const resourceType = target.dataset.rlType
  const idx = $(event.currentTarget).parents(".item").data("rlIdx");
  const resourceList = duplicate(this.actor.system.cargoCarried);
  resourceList[idx][resourceType] = value;
  await this.actor.update({ "system.cargoCarried": resourceList });
}

static async _onResourceDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();
  const idx = $(event.currentTarget).parents(".item").data("rlIdx");
  const resourceList = duplicate(this.actor.system.cargoCarried);
  resourceList.splice(idx, 1);
  await this.actor.update({ "system.cargoCarried": resourceList });
}

static async _onResourceCreate(event, target) {
  event.preventDefault();
  // console.log("Changing HP Max", this.actor);
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
      let roles = {...this.actor.system.roles};
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

static async _onCrewShow(event, target) {
  event.preventDefault();
  const actorId = target.dataset.crewId;
  const crewActor = game.actors?.get(actorId);
  crewActor?.sheet?.render(true);
}

static async _onCrewRoll(event, target) {
  event.preventDefault();
  const actorId = target.dataset.crewId;
  const crewActor = game.actors?.get(actorId);
  if (!crewActor) {
    ui.notifications?.error(`Crew no longer exists`);
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
    const useNPCSkillBonus =  button.form.elements.useNPCSkillBonus?.checked
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
    window: { title: game.i18n.format("swnr.dialog.skillRoll", {
      actorName: crewActor?.name,
    })},
    content: html,
    modal: true,
    rejectClose: false,
    ok: {
      label: game.i18n.localize("swnr.chat.roll"),
      callback: _rollForm,
    },
  });
}

static async _onPayment(event, target) {
  return this._onPay(event, "payment");
}

static async _onMaintenance(event, target) {
  return this._onPay(event, "maintenance");
}

static async _onPay(event, paymentType) {
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
      data: {
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
      data: {
        creditPool: shipPool,
        lastMaintenance: {
          year: dateObject.getFullYear(),
          month: dateObject.getMonth() + 1,
          day: dateObject.getDate(),
        },
      },
    });
  }
  this.actor.setScheduledDate(dateObject, paymentType);
}

async _onHullChange(event) {
  const targetHull = event.target?.value;

  if (targetHull) {
    const d = new Dialog({
      title: "Apply Default Stats",
      content: `<p>Do you want to apply the default stats for a ${targetHull}?</p><b>This will change your current and max values for HP, cost, armor, AC, mass, power, hardpoints, hull type, speed, life support (60*max crew), and crew.</b>`,
      buttons: {
        yes: {
          icon: '<i class="fas fa-check"></i>',
          label: "Yes",
          callback: () => this.actor.applyDefaulStats(targetHull),
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "No",
          callback: () => {
            console.log("Doing Nothing ");
          },
        },
      },
      default: "no",
    });
    d.render(true);
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

static _onCalcCost(event, target) {
  event.preventDefault();
  const hullType = this.actor.system.shipHullType;
  const d = new Dialog({
    title: "Calc Costs",
    content: `Do you want to calculate the cost based on your fittings and the hull ${hullType}`,
    buttons: {
      yesnomaint: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes, but leave maintenance alone",
        callback: () => {
          this.actor.calcCost(false);
        },
      },
      yes: {
        icon: '<i class="fas fa-times"></i>',
        label: "Yes, and calculate maintence costs as 5%",
        callback: () => {
          this.actor.calcCost(true);
        },
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
        callback: () => {
          console.log("Doing nothing");
        },
      },
    },
    default: "no",
  });
  d.render(true);
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
  await roll.roll({ async: true });
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
  _handleDragEnter(event){
    let ele = event.target.closest(".item-row");
    if(ele) $(ele).addClass('over')
  }
  
  _handleDragLeave(event) {
    let ele = event.target.closest(".item-row");
    if(ele) $(ele).removeClass('over')
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
      window: { title: "Set Order"},
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
              ui.notifications?.error("Duplicate role found");
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
          await roll.roll({ async: true });
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
        await roll.roll({ async: true });
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
