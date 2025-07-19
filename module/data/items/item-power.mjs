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
      choices: ["commit", "scene", "day"],
      initial: "scene"
    });
    schema.userResourceLength = new fields.StringField({
      choices: ["commit", "scene", "day"]
    });
    schema.level =  new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: CONFIG.SWN.maxPowerLevel,
      
    });
    schema.leveledResource = new fields.BooleanField({ initial: false });
    schema.prepared = new fields.BooleanField({initial: false});
    schema.strainCost = new fields.NumberField({ initial: 0 });
    schema.uses = new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 1 })
    });

    // Multi-cost consumption system - expandable array
    schema.consumptions = new fields.ArrayField(new fields.SchemaField({
      type: new fields.StringField({
        choices: Object.keys(CONFIG.SWN.consumptionTypes),
        initial: "none"
      }),
      usesCost: new fields.NumberField({ initial: 1, min: 0 }),
      cadence: new fields.StringField({
        choices: Object.keys(CONFIG.SWN.consumptionCadences),
        initial: "day"
      }),
      itemId: new fields.StringField({ initial: "" }),
      uses: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 1, min: 0 })
      })
    }), { initial: [] });

    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    return schema;
  }

  resourceKey() {
    return `${this.resourceName}:${this.subResource || ""}`;
  }

  /**
   * Check if this power has any additional consumption configured
   * @returns {boolean} True if power has consumption beyond primary cost
   */
  hasConsumption() {
    return this.consumptions && this.consumptions.length > 0 && 
           this.consumptions.some(c => c.type !== "none");
  }

  /**
   * Get array of active consumption configurations
   * @returns {Array} Array of consumption objects that are not "none"
   */
  getConsumptions() {
    if (!this.consumptions) return [];
    return this.consumptions.filter(c => c.type !== "none");
  }

  /**
   * Add a new consumption entry
   * @param {Object} consumption - Consumption configuration
   * @returns {Promise} Update promise
   */
  async addConsumption(consumption = {}) {
    const newConsumption = {
      type: consumption.type || "none",
      usesCost: consumption.usesCost || 1,
      cadence: consumption.cadence || "day",
      itemId: consumption.itemId || "",
      uses: consumption.uses || { value: 0, max: 1 }
    };
    
    const consumptions = [...(this.consumptions || []), newConsumption];
    return await this.parent.update({ "system.consumptions": consumptions });
  }

  /**
   * Remove a consumption entry by index
   * @param {number} index - Index to remove
   * @returns {Promise} Update promise
   */
  async removeConsumption(index) {
    const consumptions = [...(this.consumptions || [])];
    consumptions.splice(index, 1);
    return await this.parent.update({ "system.consumptions": consumptions });
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

    // Check if we have enough available resources (not committed)
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

    // Commit effort instead of spending it
    const poolsAfter = foundry.utils.deepClone(currentPools);
    
    // Add commitment to effort tracking
    const currentCommitments = foundry.utils.deepClone(actor.system.effortCommitments || {});
    if (!currentCommitments[resourceKey]) {
      currentCommitments[resourceKey] = [];
    }
    
    // Create commitment record
    const commitment = {
      powerId: item.id,
      powerName: item.name,
      amount: costToSpend,
      duration: this.resourceLength || "scene", // Use the power's resource duration
      timestamp: Date.now()
    };
    
    currentCommitments[resourceKey].push(commitment);
    
    // Update available effort (recalculate based on commitments)
    const totalCommitted = currentCommitments[resourceKey].reduce((sum, c) => sum + c.amount, 0);
    poolsAfter[resourceKey].value = Math.max(0, poolsAfter[resourceKey].max - totalCommitted);
    poolsAfter[resourceKey].committed = totalCommitted;
    poolsAfter[resourceKey].commitments = currentCommitments[resourceKey];

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

    // Process additional consumption types
    const consumptionResults = [];
    if (this.hasConsumption()) {
      const consumptions = this.getConsumptions();
      for (let i = 0; i < consumptions.length; i++) {
        const consumes = consumptions[i];
        const result = await this._processConsumption(actor, consumes, options, i);
        if (!result.success) {
          // Consumption failed - return early without applying any changes
          ui.notifications?.warn(result.message || "Consumption failed");
          return {
            success: false,
            reason: result.reason,
            message: result.message,
            poolsBefore: currentPools,
            poolsAfter: currentPools,
            consumptionFailure: result
          };
        }
        consumptionResults.push(result);
      }
    }

    // Apply strain cost if any
    if (this.strainCost > 0) {
      const currentStrain = actor.system.systemStrain?.value || 0;
      const newStrain = currentStrain + this.strainCost;
      await actor.update({ "system.systemStrain.value": newStrain });
    }

    // Update actor pools and effort commitments
    await actor.update({ 
      "system.pools": poolsAfter,
      "system.effortCommitments": currentCommitments
    });

    // Update internal resource if applicable
    if (!this.sharedResource && this.internalResource) {
      const newInternalValue = this.internalResource.value + costToSpend;
      await item.update({ "system.internalResource.value": newInternalValue });
    }

    // Execute power effect and create chat message
    const result = await this._executePowerEffect(consumptionResults);
    
    return {
      success: true,
      resourceSpent: costToSpend,
      strainApplied: this.strainCost,
      poolsBefore: currentPools,
      poolsAfter: poolsAfter,
      consumptions: consumptionResults,
      ...result
    };
  }

  /**
   * Execute passive power (no resource cost)
   */
  async _executePassivePower() {
    const result = await this._executePowerEffect([]);
    return {
      success: true,
      passive: true,
      ...result
    };
  }

  /**
   * Execute the actual power effect and create chat card
   */
  async _executePowerEffect(consumptionResults = []) {
    const item = this.parent;
    const actor = item.actor;

    // Roll if power has a roll formula
    let powerRoll = null;
    if (this.roll) {
      powerRoll = new Roll(this.roll);
      await powerRoll.roll();
    }

    // Create enhanced chat card
    const chatData = await this._createPowerChatCard(powerRoll, consumptionResults);
    const chatMessage = await getDocumentClass("ChatMessage").create(chatData);

    return {
      powerRoll,
      chatMessage
    };
  }

  /**
   * Create enhanced chat card with resource information
   */
  async _createPowerChatCard(powerRoll = null, consumptionResults = []) {
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
      isPassive: this.resourceName === "",
      consumptions: consumptionResults
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

  /**
   * Process a single consumption requirement
   * @param {Actor} actor - The actor using the power
   * @param {Object} consumes - The consumption configuration
   * @param {Object} options - Usage options
   * @param {number} consumptionIndex - Index in consumptions array
   * @returns {Promise<Object>} Consumption result
   */
  async _processConsumption(actor, consumes, options, consumptionIndex = -1) {
    switch (consumes.type) {
      case "sourceEffort":
        return await this._processSourceEffort(actor, consumes);
      case "spellPoints":
        return await this._processSpellPoints(actor, consumes);
      case "systemStrain":
        return await this._processSystemStrain(actor, consumes);
      case "consumableItem":
        return await this._processConsumableItem(actor, consumes);
      case "uses":
        return await this._processInternalUses(consumes, consumptionIndex);
      default:
        return { success: true, type: consumes.type };
    }
  }

  /**
   * Process source-based effort consumption
   */
  async _processSourceEffort(actor, consumes) {
    const source = this.parent.system.source || "";
    const poolKey = `Effort:${source}`;
    const pools = actor.system.pools || {};
    const pool = pools[poolKey];
    
    if (!pool || pool.value < consumes.usesCost) {
      return { 
        success: false, 
        reason: "insufficient-source-effort",
        message: `Insufficient source effort: ${pool?.value || 0}/${pool?.max || 0} available, ${consumes.usesCost} required`,
        poolKey,
        required: consumes.usesCost,
        available: pool?.value || 0
      };
    }
    
    // Create effort commitment if cadence is commit
    if (consumes.cadence === "commit") {
      const commitments = foundry.utils.deepClone(actor.system.effortCommitments || {});
      if (!commitments[poolKey]) commitments[poolKey] = [];
      
      commitments[poolKey].push({
        powerId: this.parent.id,
        powerName: this.parent.name,
        amount: consumes.usesCost,
        duration: consumes.cadence,
        timestamp: Date.now(),
        consumption: true
      });
      
      await actor.update({ "system.effortCommitments": commitments });
      
      // Update pool value
      const newValue = Math.max(0, pool.max - commitments[poolKey].reduce((sum, c) => sum + c.amount, 0));
      await actor.update({ [`system.pools.${poolKey}.value`]: newValue });
    } else {
      // Direct spending for scene/day cadence
      await actor.update({ [`system.pools.${poolKey}.value`]: pool.value - consumes.usesCost });
    }
    
    return { 
      success: true, 
      type: "sourceEffort",
      poolKey,
      spent: consumes.usesCost,
      cadence: consumes.cadence
    };
  }

  /**
   * Process spell points consumption
   */
  async _processSpellPoints(actor, consumes) {
    const poolKey = "Points:Spell";
    const pools = actor.system.pools || {};
    const pool = pools[poolKey];
    
    if (!pool || pool.value < consumes.usesCost) {
      return { 
        success: false, 
        reason: "insufficient-spell-points",
        message: `Insufficient spell points: ${pool?.value || 0}/${pool?.max || 0} available, ${consumes.usesCost} required`,
        poolKey,
        required: consumes.usesCost,
        available: pool?.value || 0
      };
    }
    
    await actor.update({ [`system.pools.${poolKey}.value`]: pool.value - consumes.usesCost });
    
    return { 
      success: true, 
      type: "spellPoints",
      poolKey,
      spent: consumes.usesCost
    };
  }

  /**
   * Process system strain consumption
   */
  async _processSystemStrain(actor, consumes) {
    const currentStrain = actor.system.systemStrain?.value || 0;
    const newStrain = currentStrain + consumes.usesCost;
    
    await actor.update({ "system.systemStrain.value": newStrain });
    
    return { 
      success: true, 
      type: "systemStrain",
      spent: consumes.usesCost,
      newTotal: newStrain
    };
  }

  /**
   * Process consumable item consumption
   */
  async _processConsumableItem(actor, consumes) {
    const item = actor.items.get(consumes.itemId);
    if (!item) {
      return { 
        success: false, 
        reason: "item-not-found",
        message: `Required item not found: ${consumes.itemId}`,
        itemId: consumes.itemId
      };
    }
    
    if (!item.system.uses || item.system.uses.value < consumes.usesCost) {
      return {
        success: false,
        reason: "insufficient-item-uses",
        message: `Insufficient ${item.name} uses: ${item.system.uses?.value || 0} available, ${consumes.usesCost} required`,
        itemName: item.name,
        required: consumes.usesCost,
        available: item.system.uses?.value || 0
      };
    }
    
    // Consume the item uses
    for (let i = 0; i < consumes.usesCost; i++) {
      await item.system.removeOneUse();
    }
    
    return { 
      success: true, 
      type: "consumableItem",
      itemName: item.name,
      spent: consumes.usesCost
    };
  }

  /**
   * Process internal power uses consumption
   */
  async _processInternalUses(consumes, consumptionIndex = -1) {
    if (consumes.uses.value <= 0) {
      return {
        success: false,
        reason: "no-uses-remaining",
        message: `No uses remaining: 0/${consumes.uses.max}`,
        maxUses: consumes.uses.max
      };
    }
    
    const newValue = consumes.uses.value - 1;
    
    // Update the consumption entry in the array
    await this.parent.update({
      [`system.consumptions.${consumptionIndex}.uses.value`]: newValue
    });
    
    return { 
      success: true, 
      type: "uses",
      spent: 1,
      remaining: newValue,
      max: consumes.uses.max
    };
  }
}
