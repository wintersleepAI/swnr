import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { SWNBaseSheet } from './base-sheet.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SWNFactionSheet extends SWNBaseSheet {
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
      addCustomTag: this._onAddCustomTag,
      removeTag: this._onRemoveTag,
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
    
    options.parts.push('assets', 'tags');
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
    
    const _proceed = await foundry.applications.api.DialogV2.prompt({
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
  
  static async _onAddCustomTag(event, target) {
    const tags = this.actor.system.tags;
    tags.push({
      name: `Tag ${tags.length}`,
      desc: "test description",
      effect: "test effect"
    })
    await this.actor.update({ "system.tags": tags})
  }
  
  static async _onRemoveTag(event, target) {
    const tagIndex = parseInt(target.dataset?.index);

    if (isNaN(tagIndex)) {
      ui.notifications?.error(game.i18n.localize("swnr.InvalidNumber"));
      return;
    }
    
    const newTags = this.actor.system.tags.toSpliced(tagIndex, 1);
    await this.actor.update({ "system.tags": newTags });
  }

  /** Helper Functions */


}
