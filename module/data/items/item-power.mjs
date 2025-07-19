import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNPower extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Power',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.subType = new fields.StringField({
      choices: ["psychic", "art", "adept", "spell", "mutation"],
      initial: "psychic"
    });
    schema.source = SWNShared.requiredString("");
    schema.resourceName = new fields.StringField({
      choices: ["Effort", "Slots", "Points", "Strain", "Uses"],
      initial: "Effort"
    });
    schema.subResource = new fields.StringField();
    schema.resourceCost = new fields.NumberField({ initial: 1 });
    schema.sharedResource = new fields.BooleanField({ initial: true });
    schema.internalResource = new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 1 })
    });
    schema.resourceLength = new fields.StringField({
      choices: ["commit", "scene", "day", "rest", "user"],
      initial: "scene"
    });
    schema.userResourceLength = new fields.StringField({
      choices: ["commit", "scene", "day", "rest", "user"]
    });
    schema.level =  new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
      max: CONFIG.SWN.maxPowerLevel,
      
    });
    schema.leveledResource = new fields.BooleanField({ initial: false });
    schema.prepared = new fields.BooleanField({initial: false});
    schema.strainCost = new fields.NumberField({ initial: 0 });
    schema.uses = new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 1 })
    });
    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
    return schema;
  }

  resourceKey() {
    return `${this.resourceName}:${this.subResource || ""}`;
  }

  /**
   * Use this power, spending resources with mutex protection
   * @param {Object} options - Usage options
   * @param {boolean} options.skipCost - Skip resource cost (for GM usage)
   * @returns {Promise<Object>} Usage result with success/failure info
   */
  async use(options = {}) {
    const item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      const message = "Cannot use power without an actor";
      ui.notifications?.error(message);
      return { success: false, reason: "no-actor", message };
    }

    const actorId = actor.id;
    const poolMutex = CONFIG.SWN.poolMutex;
    
    // Acquire mutex lock for this actor
    if (poolMutex.has(actorId)) {
      const message = "Power usage in progress for this actor";
      ui.notifications?.warn(message);
      return { success: false, reason: "mutex-locked", message };
    }

    poolMutex.set(actorId, Date.now());
    console.log(`[SWN Mutex] Acquired lock for actor ${actorId}`);

    try {
      return await this._performUse(options);
    } catch (error) {
      console.error(`[SWN Power] Error during power use:`, error);
      return { 
        success: false, 
        reason: "error", 
        message: `Power usage failed: ${error.message}` 
      };
    } finally {
      // Always release the mutex
      poolMutex.delete(actorId);
      console.log(`[SWN Mutex] Released lock for actor ${actorId}`);
    }
  }

  /**
   * Internal method to perform the actual power usage
   * @param {Object} options - Usage options
   * @returns {Promise<Object>} Usage result
   */
  async _performUse(options = {}) {
    const item = this.parent;
    const actor = item.actor;
    const { skipCost = false } = options;

    // Skip cost validation if this is a passive ability
    if (this.resourceName === "" || skipCost) {
      return await this._executePassivePower();
    }

    // Validate and spend resources
    const resourceKey = this.resourceKey();
    const currentPools = foundry.utils.deepClone(actor.system.pools || {});
    
    // Auto-seed missing pool if needed
    if (!currentPools[resourceKey]) {
      currentPools[resourceKey] = {
        value: 0,
        max: 0,
        cadence: this.resourceLength
      };
    }

    const pool = currentPools[resourceKey];
    const costToSpend = this.resourceCost || 0;

    // Check if we have enough resources
    if (pool.value < costToSpend) {
      const message = `Insufficient ${this.resourceName}: ${pool.value}/${pool.max} available, ${costToSpend} required`;
      ui.notifications?.warn(message);
      return { 
        success: false, 
        reason: "insufficient-resources", 
        message,
        poolsBefore: currentPools,
        poolsAfter: currentPools
      };
    }

    // Calculate new pool values
    const poolsAfter = foundry.utils.deepClone(currentPools);
    poolsAfter[resourceKey].value -= costToSpend;

    // Handle internal resource increment if not shared
    if (!this.sharedResource && this.internalResource) {
      const newInternalValue = this.internalResource.value + costToSpend;
      if (newInternalValue > this.internalResource.max) {
        const message = `Internal resource limit exceeded: ${newInternalValue}/${this.internalResource.max}`;
        ui.notifications?.warn(message);
        return { 
          success: false, 
          reason: "internal-limit-exceeded", 
          message,
          poolsBefore: currentPools,
          poolsAfter: currentPools
        };
      }
    }

    // Apply strain cost if any
    if (this.strainCost > 0) {
      const currentStrain = actor.system.systemStrain?.value || 0;
      const newStrain = currentStrain + this.strainCost;
      await actor.update({ "system.systemStrain.value": newStrain });
    }

    // Update actor pools
    await actor.update({ "system.pools": poolsAfter });

    // Update internal resource if applicable
    if (!this.sharedResource && this.internalResource) {
      const newInternalValue = this.internalResource.value + costToSpend;
      await item.update({ "system.internalResource.value": newInternalValue });
    }

    // Execute power effect and create chat message
    const result = await this._executePowerEffect();
    
    return {
      success: true,
      resourceSpent: costToSpend,
      strainApplied: this.strainCost,
      poolsBefore: currentPools,
      poolsAfter: poolsAfter,
      ...result
    };
  }

  /**
   * Execute passive power (no resource cost)
   */
  async _executePassivePower() {
    const result = await this._executePowerEffect();
    return {
      success: true,
      passive: true,
      ...result
    };
  }

  /**
   * Execute the actual power effect and create chat card
   */
  async _executePowerEffect() {
    const item = this.parent;
    const actor = item.actor;

    // Roll if power has a roll formula
    let powerRoll = null;
    if (this.roll) {
      powerRoll = new Roll(this.roll);
      await powerRoll.roll();
    }

    // Create enhanced chat card
    const chatData = await this._createPowerChatCard(powerRoll);
    const chatMessage = await getDocumentClass("ChatMessage").create(chatData);

    return {
      powerRoll,
      chatMessage
    };
  }

  /**
   * Create enhanced chat card with resource information
   */
  async _createPowerChatCard(powerRoll = null) {
    const item = this.parent;
    const actor = item.actor;
    const rollMode = game.settings.get("core", "rollMode");

    const templateData = {
      actor: actor,
      power: item,
      powerRoll: powerRoll ? await powerRoll.render() : null,
      resourceSpent: this.resourceCost || 0,
      resourceName: this.resourceName,
      resourceKey: this.resourceKey(),
      strainCost: this.strainCost || 0,
      isPassive: this.resourceName === ""
    };

    const template = "systems/swnr/templates/chat/power-usage.hbs";
    const chatContent = await foundry.applications.handlebars.renderTemplate(template, templateData);
    
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: chatContent,
      roll: powerRoll ? JSON.stringify(powerRoll) : null
    };

    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    return chatData;
  }

  async doRoll(_shiftKey = false) {
    const item = this.parent;
    const actor = item.actor;
    if (!actor) {
      const message = `Called power.roll on item without an actor.`;
      ui.notifications?.error(message);
      new Error(message);
      return;
    }
    const powerRoll = new Roll(this.roll ? this.roll : "0");
    await powerRoll.roll();
    const dialogData = {
      actor: actor,
      power: item,
      powerRoll: await powerRoll.render(),
    };
    const rollMode = game.settings.get("core", "rollMode");

    const template = "systems/swnr/templates/chat/power-roll.hbs";
    const chatContent = await foundry.applications.handlebars.renderTemplate(template, dialogData);
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
      content: chatContent,
      roll: JSON.stringify(powerRoll)
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }
}
