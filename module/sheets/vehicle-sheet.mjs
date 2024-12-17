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
      resourceCreate: this._onResourceCreate
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
        options.parts.push('ship','effects');
        options.defaultTab = 'ship';
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
      tabs: this._getTabs(options.parts),
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
    // TODO copy from actor-sheet.mjs
    console.log("TODO: Implement _preparePartContext");//TODO
    switch (partId) {
      case 'ship':
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
async _onAddCurrency(event, target) {
  // Stop propagation
  event.preventDefault();
  event.stopPropagation();

  // get any useful params
  const currencyType = $(event.currentTarget).data("creditType");

  // load html variable data for dialog
  const template = "systems/swnr/templates/dialogs/add-currency.html";
  const data = {};
  const html = await renderTemplate(template, data);
  this.popUpDialog?.close();
  
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
      data: {
        [currencyType]: this.actor.data.data[currencyType] + parseInt(await amount)
      }
    });
  }
}

async _onResourceName(event, target) {
  event.preventDefault();
  event.stopPropagation();
  const value = target?.value;
  const resourceType = $(event.currentTarget).data("rlType");
  const idx = $(event.currentTarget).parents(".item").data("rlIdx");
  const resourceList = duplicate(this.actor.data.data.cargoCarried);
  resourceList[idx][resourceType] = value;
  await this.actor.update({ "data.cargoCarried": resourceList });
}

async _onResourceDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();
  const idx = $(event.currentTarget).parents(".item").data("rlIdx");
  const resourceList = duplicate(this.actor.data.data.cargoCarried);
  resourceList.splice(idx, 1);
  await this.actor.update({ "data.cargoCarried": resourceList });
}

async _onResourceCreate(event, target) {
  event.preventDefault();
  // console.log("Changing HP Max", this.actor);
  let resourceList = this.actor.data.data.cargoCarried;
  if (!resourceList) {
    resourceList = [];
  }
  resourceList.push({ name: "Cargo X", value: 0, max: 1 });
  await this.actor.update({
    "data.cargoCarried": resourceList,
  });
}

async _onPayment(event, target) {
  return this._onPay(event, "payment");
}

async _onMaintenance(event, target) {
  return this._onPay(event, "maintenance");
}

async _onPay(event, paymentType) {
  // if a new payment type is added this function needs to be refactored
  let shipPool = this.actor.data.data.creditPool;
  const paymentAmount = 
    paymentType == "payment"
      ? this.actor.data.data.paymentAmount
      : this.actor.data.data.maintenanceCost;
  // Assume its payment and change if maintenance

  const lastPayDate =
    paymentType == "payment"
      ? this.actor.data.data.lastPayment
      : this.actor.data.data.lastMaintenance;
  const monthSchedule =
    paymentType == "payment"
      ? this.actor.data.data.paymentMonths
      : this.actor.data.data.maintenanceMonths;

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

async _onHullChange(event, target) {
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

async _onRepair(event, target) {
  event.preventDefault();
  const data = this.actor.data.data;
  const hpToFix = data.health.max - data.health.value;
  const hpCosts = hpToFix * 1000;
  const shipInventory = this.actor.items.filter(
    (i) =>
      i.type === "shipDefense" ||
      i.type === "shipWeapon" ||
      i.type === "shipFitting"
  );

  const disabledParts = shipInventory.filter(
    (i) => i.data.data.broken == true && i.data.data.destroyed == false
  );
  const shipClass = this.actor.data.data.shipClass;

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
    const itemCost = item.data.data.costMultiplier
      ? item.data.data.cost * multiplier
      : item.data.data.cost;
    disabledCosts += itemCost;
    itemsToFix.push(`${item.name} (${itemCost})`);
    eitems.push({ _id: item.id, data: { broken: false } });
  }
  if (eitems.length > 0) {
    await this.actor.updateEmbeddedDocuments("Item", eitems);
  }
  const fullRepairCost = disabledCosts * 0.25;
  const totalCost = hpCosts + fullRepairCost;
  await this.actor.update({ "data.health.value": data.health.max });
  if (totalCost > 0) {
    const itemList = itemsToFix.join("<br>");
    const content = `<h3>Ship Repaired</h3><b>Estimated Total Cost: ${totalCost}</b><br>HP points: ${hpToFix} cost: ${hpCosts}<br>Full Repair Costs: ${fullRepairCost} (25%/item cost). <br><br> Items Repaired (item full cost):<br> ${itemList} `;
    const chatData = {
      content: content,
    };
    ChatMessage.create(chatData);
  }
}

async _onTravel(event, target) {
  event.preventDefault();
  if (this.actor.data.data.spikeDrive.value <= 0) {
    ui.notifications?.error("Drive disabled.");
    return;
  }
  // TODO localize
  new Dialog({
    title: "Travel Days (Use life support)",
    content: `
        <form>
          <div class="form-group">
            <label>Days of Travel</label>
            <input type='text' name='inputField'></input>
          </div>
        </form>`,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Travel`,
      },
    },
    default: "yes",
    close: (html) => {
      const form = html[0].querySelector("form");
      const days = form.querySelector('[name="inputField"]')?.value;
      if (days && days != "") {
        const nDays = Number(days);
        if (nDays) {
          this.actor.useDaysOfLifeSupport(nDays);
          if (game.modules?.get("foundryvtt-simple-calendar")?.active) {
            this.actor.moveTime(nDays);
          }
        }
      }
    },
  }).render(true);
}


async _onCrewNPCRoll(event, target) {
  event.preventDefault();
  // Roll skill, show name, skill, attr if != ""
  const rollMode = game.settings.get("core", "rollMode");
  const formula = `2d6 + @npcCrewSkill`;
  const npcCrewSkill = this.actor.data.data.crewSkillBonus
    ? this.actor.data.data.crewSkillBonus
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

async _setCaptSupport(dept) {
  const deptSupport = this.actor.data.data.supportingDept
    ? this.actor.data.data.supportingDept
    : "";
  if (dept == deptSupport) {
    return;
  }
  if (deptSupport != "") {
    ui.notifications?.error("Department is already supported. Error.");
  }
  await this.actor.update({
    "data.supportingDept": dept,
  });
}

async _onShipAction(event, target) {
  event.preventDefault();
  const actionName = event.target?.value;
  if (actionName === "") {
    return;
  }
  const action = ACTIONS[actionName];
  if (!action) {
    ui.notifications?.error("There was an error in looking up your action");
    return;
  }
  const actionTitle = action.title ? action.title : actionName;
  let cp = this.actor.data.data.commandPoints;
  const actionsTaken = this.actor.data.data.actionsTaken
    ? this.actor.data.data.actionsTaken
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
    if (this.actor.data.data.roleOrder) {
      // we may have set an order prior
      roleOrder = this.actor.data.data.roleOrder;
    } else {
      // get the default list
      for (const role in this.actor.data.data.roles) {
        roleOrder.push(role);
      }
    }
    for (const role of roleOrder) {
      let roleName = "";
      if (this.actor.data.data.roles[role]) {
        const roleActor = game.actors?.get(this.actor.data.data.roles[role]);
        if (roleActor && roleActor.name) {
          roleName = ` (${roleActor.name})`;
        }
      }
      depts += `<div class="border p-2 flex border-black role-order" data-role="${role}" data-role-name="${roleName}"><a><i class="fas fa-sort"></i></a>${role}${roleName}</div>`;
    }
    const dialogTemplate = `
    <div class="flex flex-col -m-2 p-2 pb-4 space-y-2">
      <h1> Order Departments/Roles </h1>
      <div class="flex flexrow">
          <div id="deptOrder">
          ${depts}
          </div>
      </div>
      <script>
      var el = document.getElementById('deptOrder');
      var sortable = Sortable.create(el);
      </script>
    </div>
    `;
    new Dialog(
      {
        title: "Set Order",
        content: dialogTemplate,
        buttons: {
          setOrder: {
            label: "Set Order",
            callback: async (html) => {
              const order = html.find("#deptOrder");
              const orderArr = [];
              order.children(".role-order").each(function () {
                orderArr.push($(this).data("role"));
              });
              if (orderArr.length > 0) {
                await this.actor.update({ data: { roleOrder: orderArr } });
              }
            },
          },
          close: {
            label: "Close",
          },
        },
        default: "setOrder",
      },
      { classes: ["swnr"] }
    ).render(true);
    return;
  } else if (actionName == "endRound") {
    // endRound action is special. clear and reset.
    const newCp = this.actor.data.data.npcCommandPoints
      ? this.actor.data.data.npcCommandPoints
      : 0;
    let actionsText =
      actionsTaken.length > 0 ? `Actions: <ul>` : "No actions.";

    if (actionsTaken.length > 0) {
      for (const act of actionsTaken) {
        const actTitle =
          ACTIONS[act] && ACTIONS[act].title ? ACTIONS[act].title : act;
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
  let supportingDept = this.actor.data.data.supportingDept;
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
  const order = this.actor.data.data.roleOrder
    ? ` (${this.actor.data.data.roleOrder.join(",")})`
    : "";
  if (action.skill) {
    // this action needs a skill roll
    let skillLevel = -1;
    let attrMod = 0;
    let attrName = "";
    let dicePool = "2d6";

    if (action.dept) {
      let foundActor = false; // might not be anyone in this dept/role
      if (this.actor.data.data.roles[action.dept] != "") {
        const defaultActor = game.actors?.get(
          this.actor.data.data.roles[action.dept]
        );
        if (defaultActor) {
          foundActor = true;
          if (defaultActor.type == "character") {
            for (const skill of defaultActor.itemTypes.skill) {
              if (action.skill == skill.data.name) {
                skillLevel = skill.data.data["rank"];
                dicePool =
                  skill.data.data["pool"] && skill.data.data["pool"] != "ask"
                    ? skill.data.data["pool"]
                    : "2d6";
              }
            }
            let tempMod = -2;
            if (action.attr) {
              // Find the attribute with the highest mod
              for (const attr of action.attr) {
                if (
                  defaultActor.data.data.stats[attr] &&
                  defaultActor.data.data.stats[attr].mod > tempMod
                ) {
                  tempMod = defaultActor.data.data.stats[attr].mod;
                  const key = `swnr.stat.short.${attr}`;
                  attrName = `${game.i18n.localize(key)}\\`;
                }
              }
              attrMod = tempMod;
            }
          }
          if (defaultActor.type == "npc") {
            skillLevel = defaultActor.data.data.skillBonus;
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
        skillLevel = this.actor.data.data.crewSkillBonus
          ? this.actor.data.data.crewSkillBonus
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
    "data.commandPoints": cp,
    "data.actionsTaken": actionsTaken,
    "data.supportingDept": supportingDept,
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
