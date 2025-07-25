import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { SWNBaseSheet } from './base-sheet.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNFactionSheet extends SWNBaseSheet {
  static _expandedDescriptions = {};

  constructor(options = {}) {
    super(options);
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
      toggleProperty: this._toggleProperty,
      roll: this._onRoll,
      createBase: this._onAddBase,
      editTag: this._onEditTag,
      removeTag: this._onRemoveTag,
      selectTag: this._onSelectTag,
      editLog: this._onEditLog,
      removeLog: this._onRemoveLog,
      removeAllLogs: this._onRemoveAllLogs,
      toggleItemDescription: this._onToggleItemDescription,
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
      template: 'systems/swnr/templates/actor/faction/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    description: {
      template: 'systems/swnr/templates/actor/description.hbs',
    },
    assets: {
      template: 'systems/swnr/templates/actor/faction/assets.hbs',
    },
    tags: {
      template: 'systems/swnr/templates/actor/faction/tags.hbs',
    },
    logs: {
      template: 'systems/swnr/templates/actor/faction/logs.hbs',
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.defaultTab = 'description';
    
    // Not all parts always render
    options.parts = ['header', 'tabs', 'description'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    
    options.parts.push('assets', 'tags', 'logs');
    options.defaultTab = 'assets';
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
      // Add expanded descriptions state for item description toggle functionality
      expandedDescriptions: SWNFactionSheet._expandedDescriptions,
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context.tab = context.tabs[partId];
    switch (partId) {
      case 'description':
        // Enrich description info for display
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
  _getTabs(parts, defaultTab = 'description') {
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
        case 'description':
          tab.id = 'description';
          tab.label += 'Description';
          break;
        case 'assets':
          tab.id = 'assets';
          tab.label += 'Assets';
          break;
        case 'tags':
          tab.id = 'tags';
          tab.label += 'Tags';
          break;
        case 'logs':
          tab.id = 'logs';
          tab.label += 'Logs';
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
    // this sheet does with assets
    
    const assets = {
      [CONFIG.SWN.assetCategories.force]: [],
      [CONFIG.SWN.assetCategories.wealth]: [],
      [CONFIG.SWN.assetCategories.cunning]: []
    }
    
    for (let i of this.document.items) {
      if (i.type !== 'asset') {
        continue;
      }
      
      switch (i.system.category) {
        case "force":
          assets[CONFIG.SWN.assetCategories.force].push(i);
          break;
        case "wealth":
          assets[CONFIG.SWN.assetCategories.wealth].push(i);
          break;
        case "cunning":
          assets[CONFIG.SWN.assetCategories.cunning].push(i);
          break;
      }
    }    
    
    context.assets = assets;
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

  /**************
   *
   *   ACTIONS
   *
   **************/
  
  static async _onAddBase(event, target){
    const category = target.dataset?.category;
    
    const _createBase = async (_event, button, _html) => {
      const hp = parseInt(button.form.elements.hp.value);
      if (isNaN(hp)) {
        ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
        return;
      }
      
      await this.actor.system.addBase(category, hp)
    }
    
    await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("swnr.sheet.faction.addBaseDialog.title") },
      content: `<p>${game.i18n.localize("swnr.sheet.faction.addBaseDialog.content")}</p>`
      + `<form></form><label>${game.i18n.localize("swnr.sheet.faction.addBaseDialog.label")}</label>`
      + `<input type="text" name="hp"></form>`,
      modal: false,
      rejectClose: false,
      ok: {
        callback: _createBase,
        icon: 'fas fa-check',
        label: game.i18n.localize("swnr.sheet.faction.addBaseDialog.confirm")
      }
    })
    
  }
  
  static async _onEditTag(event, target) {
    //TODO: localize and add edit
    const index = parseInt(target.dataset?.index);
    const editMode = !isNaN(index);
    const tag = editMode ? this.actor.system.tags[index] : null;
    
    const title = editMode
      ? game.i18n.localize("swnr.sheet.faction.editTag")
      : game.i18n.localize("swnr.sheet.faction.addTagCustom");
    
    const dialogData = {
      name: tag?.name ?? "",
      desc: tag?.desc ?? "",
      effect: tag?.effect ?? "",
    }
    const template = "systems/swnr/templates/dialogs/edit-faction-tag.hbs";
    const html = await renderTemplate(template, dialogData);
    
    const _modifyTags = async (_event, button, _html) => {
      const name = button.form.elements.tagName.value;
      const desc = button.form.elements.tagDesc.value;
      const effect = button.form.elements.tagEffect.value;
      
      if (editMode){
        await this.actor.system.editTag({name, desc, effect}, index);
      }else{
        await this.actor.system.addTag({name, desc, effect});
      }
    }
    
    await foundry.applications.api.DialogV2.wait({
      window: {
        title: title
      },
      position: {
        width: 500
      },
      content: html, 
      modal: true,
      rejectClose: false,
      buttons: [
          {
            label: title, 
            callback: _modifyTags
          }
      ],
    })
  }
  
  static async _onRemoveTag(event, target) {
    const tagIndex = parseInt(target.dataset?.index);

    if (isNaN(tagIndex)) {
      ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
      return;
    }
    
    const removeTag = async () => await this.actor.system.removeTag(tagIndex);
    
    const tag = this.actor.system.getTag(tagIndex);
    
    await this._promptDelete(event, tag.name, this.actor.name, removeTag);
  }
  
  static async _onSelectTag(event, target){
    const title = game.i18n.localize("swnr.sheet.faction.addTag");
    
    const dialogData = {
      tags: CONFIG.SWN.factionTags
    }
    const template = "systems/swnr/templates/dialogs/select-faction-tag.hbs";
    const html = await renderTemplate(template, dialogData);
    
    const _modifyTags = async (_event, button, _html) => {
      const selectedTagIndex = parseInt(button.form.elements.selectedTag.value);
      
      if (isNaN(selectedTagIndex)) {
        return;
      }
      
      const selectedTag = CONFIG.SWN.factionTags[selectedTagIndex];
      await this.actor.system.addTag(selectedTag);
    }
    
    const _addListener = (event,  dialog) => {
      dialog.querySelector("#selectedTag")
          .addEventListener("change", (event) => {
            const value = event.target.value;
            dialog.querySelector(".tag-list .tag-details:not(.hidden)")
                ?.classList?.add("hidden");
            dialog.querySelector(`.tag-list .tag-${value}`)
                ?.classList?.remove("hidden");
          });
    }

    await foundry.applications.api.DialogV2.wait({
      window: {
        title: title
      },
      position: {
        width: 500
      },
      content: html,
      modal: true,
      rejectClose: false,
      buttons: [
          {
            label: title, 
            callback: _modifyTags
          }
      ],
      render: _addListener
    })
  }
  
  // TODO: Add inline rolls to logs
  static async _onEditLog(event, target) {
    const index = parseInt(target.dataset?.index);
    const editMode = !isNaN(index);
    const log = editMode ? this.actor.system.log[index] : null;

    const title = editMode
        ? game.i18n.localize("swnr.sheet.faction.editLog")
        : game.i18n.localize("swnr.sheet.faction.addLog");
    
    const _modifyLogs = async (_event, button, _html) => {
      const logText = button.form.logText.value;
      
      if (editMode) {
        await this.actor.system.editLog(logText, index);
      } else {
        await this.actor.system.addLog(logText);
      }
    }
    
    await foundry.applications.api.DialogV2.prompt({
      window: {
        title: title,
      },
      position: {
        width: 500
      },
      modal: false,
      content: `<label for="logText">${game.i18n.localize("swnr.sheet.faction.editLogDialog.label")}</label>`
          +`<textarea name="logText" id="logText">${log ?? ""}</textarea>`,
      ok: {
        callback: _modifyLogs,
        label: title
      }
    })
  }
  
  static async _onRemoveLog(event, target) {
    const logIndex = parseInt(target.dataset?.index);

    if (isNaN(logIndex)) {
      ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
      return;
    }
    
    const removeLog = async () => await this.actor.system.removeLog(logIndex);

    await this._promptDelete(
        event, 
        game.i18n.localize("swnr.sheet.faction.log"),
        this.actor.name,
        removeLog
    );
  }
  
  static async _onRemoveAllLogs(event, target){
    const removeLogs = async () => this.actor.system.removeAllLogs();
    
    await this._promptDelete(
        event, 
        game.i18n.localize("swnr.sheet.faction.allLogs"),
        this.actor.name,
        removeLogs
    )
  }

  /** Helper Functions */

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

    // Toggle the expanded state
    if (SWNFactionSheet._expandedDescriptions[itemId]) {
      delete SWNFactionSheet._expandedDescriptions[itemId];
    } else {
      SWNFactionSheet._expandedDescriptions[itemId] = true;
    }

    // Find and toggle the description row
    const itemRow = target.closest('.item[data-item-id]');
    if (!itemRow) return;

    const descriptionRow = itemRow.nextElementSibling;
    if (descriptionRow && descriptionRow.classList.contains('item-description')) {
      const isExpanded = SWNFactionSheet._expandedDescriptions[itemId];
      descriptionRow.style.display = isExpanded ? 'block' : 'none';
    }
  }

}
