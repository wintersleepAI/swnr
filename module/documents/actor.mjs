/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SWNActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data that isn't
   * handled by the actor's DataModel. Data calculated in this step should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const flags = actorData.flags.swnr || {};
  }

  /**
   *
   * @override
   * Augment the actor's default getRollData() method by appending the data object
   * generated by the its DataModel's getRollData(), or null. This polymorphic
   * approach is useful when you have actors & items that share a parent Document,
   * but have slightly different data preparation needs.
   */
  getRollData() {
    return { ...super.getRollData(), ...(this.system.getRollData?.() ?? null) };
  }

  /**
  * @override
  * Override the standard permission test for an Item.
  * Determine default artwork based on the provided item data.
  * @param {ItemData} itemData  The source item data.
  * @returns {{img: string}}    Candidate item image.
  */
  static getDefaultArtwork(itemData) {
    let itemType = itemData.type;
    if (itemType in CONFIG.SWN.defaultImg) {
      return { img: `${CONFIG.SWN.actorIconPath}/${CONFIG.SWN.defaultImg[itemType]}` };
    } else {
      return { img: this.DEFAULT_ICON };
    }
  }
}
