import { ContainerHelper } from '../helpers/container-helper.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SWNItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Override the standard permission test for an Item.
   * Determine default artwork based on the provided item data.
   * @param {ItemData} itemData  The source item data.
   * @returns {{img: string}}    Candidate item image.
   */
  static getDefaultArtwork(itemData) {
    let itemType = itemData.type;
    if (itemType in CONFIG.SWN.defaultImg) {
      return { img: `${CONFIG.SWN.itemIconPath}/${CONFIG.SWN.defaultImg[itemType]}` };
    } else {
      return { img: this.DEFAULT_ICON };
    }
  }
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(event) {
    const item = this;
    // hack check do roll for items that have roll attribute 
    if (typeof this.system.doRoll == "function" ){
      this.system.doRoll(event?.shiftKey);
      return;
    }
    
    // If the item has a roll function, call it and return.
    if (typeof this.system.roll == "function" ){
      this.system.roll(event?.shiftKey);
      return;
    }

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    let label = `[${item.type}] ${item.name}`;
    let description = item.system.description ?? '';
    if (game.settings.get("swnr", "useAWNGearCondition")) {
      let conditionLabel = game.i18n.localize(`swnr.sheet.gear.condition.${item.system.condition}`);
      label = `${label} (Condition: ${conditionLabel})`;
      description = `${description} <br>Condition: ${conditionLabel}`;
      if (item.system.condition != 'perfect') {
        let conditionDetails = game.i18n.localize(`swnr.sheet.gear.conditionDetails.${item.system.condition}`);
        description = `${description} ${conditionDetails}`;
        description = `${description} (modifiers not automatically applied)`;
      }
    }
    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: description,
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      if (description && description.length > 0) {
        label = `${label} ${description}`;
      }
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  /**
   * Handle item updates, particularly for container location changes
   * @param {object} changed - The change data
   * @param {object} options - Update options
   * @param {string} userId - The user performing the update
   * @override
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    // If this is a container and its location is changing, update contained items
    if (this.system.container?.isContainer && changed.system?.location) {
      const newLocation = changed.system.location;
      const currentLocation = this.system.location;
      
      if (newLocation !== currentLocation) {
        await ContainerHelper.updateContainedItemsLocation(this, newLocation);
      }
    }
  }
}
