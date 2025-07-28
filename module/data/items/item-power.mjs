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
      choices: CONFIG.SWN.powerSubTypes,
      initial: "psychic"
    });
    schema.source = SWNShared.requiredString("");
    schema.level = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: CONFIG.SWN.maxPowerLevel,
    });
    schema.prepared = new fields.BooleanField({initial: false});

    // Main resource fields for primary resource consumption
    schema.resourceName = new fields.StringField({
      choices: CONFIG.SWN.poolResourceNames,
      initial: null,
      required: false,
      nullable: true
    });
    schema.subResource = new fields.StringField({
      initial: null,
      required: false,
      nullable: true
    });

    // Resource consumption now handled entirely through consumption array

    // Multi-cost consumption system - expandable array
    schema.consumptions = new fields.ArrayField(new fields.SchemaField({
      type: new fields.StringField({
        choices: Object.keys(CONFIG.SWN.consumptionTypes),
        initial: "none"
      }),
      // Resource pool fields (for poolResource type)
      resourceName: new fields.StringField({
        choices: CONFIG.SWN.poolResourceNames,
        initial: null,
        required: false,
        nullable: true
      }),
      subResource: new fields.StringField({
        initial: null,
        required: false,
        nullable: true
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
      }),
      // When true, this cost is paid during preparation (not shown in chat)
      // When false, this cost is paid during casting (shown in chat, normal behavior)
      spendOnPrep: new fields.BooleanField({ initial: false })
    }), { initial: [] });

    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    return schema;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Ensure all consumption entries have complete data structures
    if (this.consumptions) {
      this.consumptions.forEach(consumption => {
        // Ensure uses object exists with proper defaults
        if (!consumption.uses || typeof consumption.uses !== 'object') {
          consumption.uses = { value: 0, max: 1 };
        }
        if (typeof consumption.uses.value !== 'number') {
          consumption.uses.value = 0;
        }
        if (typeof consumption.uses.max !== 'number') {
          consumption.uses.max = 1;
        }
        
        // Ensure other properties have defaults
        if (!consumption.itemId) {
          consumption.itemId = "";
        }
        if (!consumption.usesCost || typeof consumption.usesCost !== 'number') {
          consumption.usesCost = 1;
        }
        if (!consumption.cadence) {
          consumption.cadence = "day";
        }
        if (typeof consumption.spendOnPrep !== 'boolean') {
          consumption.spendOnPrep = false; // Default to casting cost
        }
      });
    }
  }

  /**
   * Helper to generate pool key from resourceName and subResource
   * @param {string} resourceName - Resource name (e.g., "Effort")
   * @param {string} subResource - Sub-resource (e.g., "Psychic")
   * @returns {string} Pool key in format "ResourceName:SubResource"
   */
  _getPoolKey(resourceName, subResource) {
    if (!resourceName) return "";
    return `${resourceName}:${subResource || ""}`;
  }

  /**
   * Get the resource key for this power's primary resource consumption
   * @returns {string} Pool key in format "ResourceName:SubResource"
   */
  resourceKey() {
    return this._getPoolKey(this.resourceName, this.subResource);
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

    // Skip cost validation if skipCost is true or no consumptions defined
    if (skipCost || !this.hasConsumption()) {
      return await this._executePassivePower();
    }

    // Process only casting consumption types (spendOnPrep: false)
    const consumptionResults = [];
    const allConsumptions = this.getConsumptions();
    const castingConsumptions = allConsumptions.filter(c => !c.spendOnPrep);
    
    // First pass: validate all casting consumption requirements
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (consumes.spendOnPrep) continue; // Skip preparation costs during casting
      
      const validation = await this._validateConsumption(actor, consumes, i);
      if (!validation.valid) {
        ui.notifications?.warn(validation.message || "Consumption requirements not met");
        return {
          success: false,
          reason: validation.reason,
          message: validation.message,
          consumptionFailure: validation
        };
      }
    }
    
    // Second pass: apply all casting consumption costs
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (consumes.spendOnPrep) continue; // Skip preparation costs during casting
      
      const result = await this._processConsumption(actor, consumes, options, i);
      if (!result.success) {
        // This shouldn't happen since we validated first, but safety check
        ui.notifications?.warn(result.message || "Consumption processing failed");
        return {
          success: false,
          reason: result.reason,
          message: result.message,
          consumptionFailure: result
        };
      }
      consumptionResults.push(result);
    }

    // Execute power effect and create chat message
    const result = await this._executePowerEffect(consumptionResults);
    
    return {
      success: true,
      consumptionResults: consumptionResults,
      powerRoll: result.powerRoll,
      chatMessage: result.chatMessage
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
   * Perform power usage without creating chat message (for chat updates)
   */
  async _performUseForChatUpdate(targetActor = null, options = {}) {
    const item = this.parent;
    const actor = targetActor || item.actor;
    const { skipCost = false } = options;

    // Skip cost validation if skipCost is true or no consumptions defined
    if (skipCost || !this.hasConsumption()) {
      // Don't roll dice for passive powers in chat updates
      return {
        success: true,
        passive: true,
        consumptionResults: [],
        powerRoll: null
      };
    }

    // Process only casting consumption types (spendOnPrep: false)
    const consumptionResults = [];
    const allConsumptions = this.getConsumptions();
    
    // First pass: validate all casting consumption requirements
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (consumes.spendOnPrep) continue; // Skip preparation costs during casting
      
      const validation = await this._validateConsumption(actor, consumes, i);
      if (!validation.valid) {
        ui.notifications?.warn(validation.message || "Consumption requirements not met");
        return {
          success: false,
          reason: "insufficient-resources",
          message: validation.message
        };
      }
    }

    // Second pass: apply casting consumption
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (consumes.spendOnPrep) continue; // Skip preparation costs during casting
      
      const result = await this._processConsumption(actor, consumes, options, i);
      if (!result.success) {
        ui.notifications?.warn(result.message || "Consumption processing failed");
        return {
          success: false,
          reason: result.reason,
          message: result.message,
          consumptionFailure: result
        };
      }
      consumptionResults.push(result);
    }

    // Don't roll dice - chat handler will preserve existing roll
    return {
      success: true,
      consumptionResults: consumptionResults,
      powerRoll: null
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

    // Calculate strain cost from consumption results
    const totalStrainCost = consumptionResults
      .filter(r => r.type === "systemStrain")
      .reduce((sum, r) => sum + (r.spent || 0), 0);

    // Check if power has casting costs (spendOnPrep: false)
    const castingConsumptions = this.getConsumptions().filter(c => !c.spendOnPrep);
    const hasCastingCosts = castingConsumptions.length > 0;
    
    const templateData = {
      actor: actor,
      power: item,
      powerRoll: powerRoll ? await powerRoll.render() : null,
      strainCost: totalStrainCost,
      isPassive: !hasCastingCosts,
      consumptions: consumptionResults // Only contains casting costs due to filtering in use()
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
    // Check if power has casting costs (spendOnPrep: false)
    const castingConsumptions = this.getConsumptions().filter(c => !c.spendOnPrep);
    const hasCastingCosts = castingConsumptions.length > 0;
    
    const dialogData = {
      actor: actor,
      power: item,
      powerRoll: await powerRoll.render(),
      strainCost: 0,
      isPassive: !hasCastingCosts,
      consumptions: [] // Empty for initial state - shows "Spend Resources" button if has casting costs
    };
    const rollMode = game.settings.get("core", "rollMode");

    const template = "systems/swnr/templates/chat/power-usage.hbs";
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
   * @override
   * @param {SWNRPower} item
   * @param {SWNRActor} actor
   */
  static onApply(item, actor) {
    const parentEffort = item.system.effort;
    if (parentEffort.value && ["commit", "scene", "day"].includes(parentEffort.cadence)) {
      actor.system.addEffort(parentEffort, item);
    }
  }

  /**
   * @override
   * @param {SWNRPower} item
   * @param {SWNRActor} actor
   */
  static onUnapply(item, actor) {
    const parentEffort = item.system.effort;
    if (parentEffort.value && ["commit", "scene", "day"].includes(parentEffort.cadence)) {
      actor.system.removeEffort(parentEffort, item);
    }
  }

  /**
   * Validate a single consumption requirement without applying changes
   * @param {Actor} actor - The actor using the power
   * @param {Object} consumes - Consumption configuration
   * @param {number} consumptionIndex - Index in consumptions array
   * @returns {Promise<Object>} Validation result
   */
  async _validateConsumption(actor, consumes, consumptionIndex = 0) {
    switch (consumes.type) {
      case "poolResource":
        const poolKey = this._getPoolKey(consumes.resourceName, consumes.subResource);
        if (!poolKey) {
          return { 
            valid: false, 
            reason: "no-resource-configured",
            message: "Pool resource consumption requires resourceName to be configured"
          };
        }
        const pools = actor.system.pools || {};
        const pool = pools[poolKey];
        
        if (!pool || pool.value < consumes.usesCost) {
          return { 
            valid: false, 
            reason: "insufficient-source-effort",
            message: `Insufficient source effort: ${pool?.value || 0}/${pool?.max || 0} available, ${consumes.usesCost} required`
          };
        }
        return { valid: true };
        
      case "systemStrain":
        // System strain can always be applied (no maximum check needed)
        return { valid: true };
        
      case "consumableItem":
        if (!consumes.itemId) {
          return { valid: false, reason: "no-item-selected", message: "No consumable item selected" };
        }
        
        const consumableItem = actor.items.get(consumes.itemId);
        if (!consumableItem) {
          return { valid: false, reason: "item-not-found", message: "Consumable item not found in inventory" };
        }
        
        const itemUses = consumableItem.system.uses;
        if (!itemUses || itemUses.value < consumes.usesCost) {
          return { 
            valid: false, 
            reason: "insufficient-item-uses",
            message: `Insufficient ${consumableItem.name}: ${itemUses?.value || 0}/${itemUses?.max || 0} available, ${consumes.usesCost} required`
          };
        }
        return { valid: true };
        
      case "uses":
        if (consumes.uses.value < consumes.usesCost) {
          return { 
            valid: false, 
            reason: "insufficient-internal-uses",
            message: `Insufficient internal uses: ${consumes.uses.value}/${consumes.uses.max} available, ${consumes.usesCost} required`
          };
        }
        return { valid: true };
        
      default:
        return { valid: true };
    }
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
      case "poolResource":
        return await this._processPoolResource(actor, consumes);
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
   * Process generic pool resource consumption
   */
  async _processPoolResource(actor, consumes) {
    const poolKey = this._getPoolKey(consumes.resourceName, consumes.subResource);
    if (!poolKey) {
      return { 
        success: false, 
        reason: "no-resource-configured",
        message: "Pool resource consumption requires resourceName to be configured"
      };
    }

    const pools = actor.system.pools || {};
    const pool = pools[poolKey];
    
    if (!pool || pool.value < consumes.usesCost) {
      return { 
        success: false, 
        reason: "insufficient-pool-resource",
        message: `Insufficient ${consumes.resourceName}${consumes.subResource ? ':' + consumes.subResource : ''}: ${pool?.value || 0}/${pool?.max || 0} available, ${consumes.usesCost} required`,
        poolKey,
        required: consumes.usesCost,
        available: pool?.value || 0
      };
    }
    
    // Create effort commitment if cadence is commit
    if (["commit", "scene", "day"].includes(consumes.cadence)) {
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
      // Direct spending for other cadences
      await actor.update({ [`system.pools.${poolKey}.value`]: pool.value - consumes.usesCost });
    }
    
    return { 
      success: true, 
      type: "poolResource",
      poolKey,
      resourceName: consumes.resourceName,
      subResource: consumes.subResource,
      spent: consumes.usesCost,
      cadence: consumes.cadence
    };
  }

  // Legacy consumption handlers removed - now using generic poolResource type

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
      [`system.consumptions.${consumptionIndex}.uses.value`]: newValue,
      [`system.consumptions.${consumptionIndex}.type`]: "uses"
    });
    
    return { 
      success: true, 
      type: "uses",
      spent: 1,
      remaining: newValue,
      max: consumes.uses.max
    };
  }

  /**
   * Prepare this power by spending resource cost
   * @returns {Promise<Object>} Preparation result
   */
  async prepare() {
    const item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      return { 
        success: false, 
        reason: "no-actor", 
        message: "Cannot prepare power without an actor" 
      };
    }

    if (this.prepared) {
      return { 
        success: false, 
        reason: "already-prepared", 
        message: "Power is already prepared" 
      };
    }

    // Check if power has resource cost to deduct
    if (!this.hasConsumption()) {
      // Powers with no cost can be prepared freely
      await item.update({ "system.prepared": true });
      return { success: true, message: "Power prepared (no resource cost)" };
    }

    // Get only preparation consumptions (spendOnPrep: true)
    const allConsumptions = this.getConsumptions();
    const prepConsumptions = allConsumptions.filter(c => c.spendOnPrep);
    
    // Validate all preparation consumption requirements
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (!consumes.spendOnPrep) continue; // Skip casting costs during preparation
      
      const validation = await this._validateConsumption(actor, consumes, i);
      if (!validation.valid) {
        return {
          success: false,
          reason: validation.reason,
          message: `Cannot prepare: ${validation.message}`
        };
      }
    }

    // Deduct resources for preparation (only spendOnPrep: true)
    const consumptionResults = [];
    for (let i = 0; i < allConsumptions.length; i++) {
      const consumes = allConsumptions[i];
      if (!consumes.spendOnPrep) continue; // Skip casting costs during preparation
      
      const result = await this._processConsumption(actor, consumes, {}, i);
      if (!result.success) {
        return {
          success: false,
          reason: result.reason,
          message: `Preparation failed: ${result.message}`
        };
      }
      consumptionResults.push(result);
    }

    // Mark as prepared
    await item.update({ "system.prepared": true });

    return {
      success: true,
      message: "Power prepared successfully",
      consumptionResults
    };
  }

  /**
   * Unprepare this power and restore resource cost
   * @returns {Promise<Object>} Unpreparation result
   */
  async unprepare() {
    const item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      return { 
        success: false, 
        reason: "no-actor", 
        message: "Cannot unprepare power without an actor" 
      };
    }

    if (!this.prepared) {
      return { 
        success: false, 
        reason: "not-prepared", 
        message: "Power is not prepared" 
      };
    }

    // Check if power has resource cost to restore
    if (!this.hasConsumption()) {
      // Powers with no cost can be unprepared freely
      await item.update({ "system.prepared": false });
      return { success: true, message: "Power unprepared (no resource cost)" };
    }

    // Restore resources for unpreparation (only spendOnPrep: true)
    const consumptions = this.getConsumptions();
    const restorationResults = [];
    
    for (const consumes of consumptions) {
      if (!consumes.spendOnPrep) continue; // Skip casting costs during unpreparation
      
      const result = await this._restoreConsumption(actor, consumes);
      if (result.success) {
        restorationResults.push(result);
      }
    }

    // Mark as unprepared
    await item.update({ "system.prepared": false });

    return {
      success: true,
      message: "Power unprepared successfully",
      restorationResults
    };
  }

  /**
   * Restore resources for a consumption when unpreparing
   * @param {Actor} actor - The actor
   * @param {Object} consumes - Consumption configuration
   * @returns {Promise<Object>} Restoration result
   */
  async _restoreConsumption(actor, consumes) {
    switch (consumes.type) {
      case "poolResource":
        return await this._restorePoolResource(actor, consumes);
      case "systemStrain":
        // System strain typically can't be restored
        return { success: false, type: "systemStrain", message: "System strain cannot be restored" };
      case "consumableItem":
        // Consumable items typically can't be restored
        return { success: false, type: "consumableItem", message: "Consumable items cannot be restored" };
      case "uses":
        // Internal uses typically can't be restored
        return { success: false, type: "uses", message: "Internal uses cannot be restored" };
      default:
        return { success: true, type: consumes.type };
    }
  }

  /**
   * Restore pool resource when unpreparing
   */
  async _restorePoolResource(actor, consumes) {
    const poolKey = this._getPoolKey(consumes.resourceName, consumes.subResource);
    if (!poolKey) {
      return { 
        success: false, 
        reason: "no-resource-configured",
        message: "Pool resource restoration requires resourceName to be configured"
      };
    }

    const pools = actor.system.pools || {};
    const pool = pools[poolKey];
    
    if (!pool) {
      return { 
        success: false, 
        reason: "pool-not-found",
        message: `Pool ${poolKey} not found`
      };
    }

    // Handle committed resources differently
    if (["commit", "scene", "day"].includes(consumes.cadence)) {
      const commitments = foundry.utils.deepClone(actor.system.effortCommitments || {});
      if (commitments[poolKey]) {
        // Remove commitment for this power
        const commitmentIndex = commitments[poolKey].findIndex(c => 
          c.powerId === this.parent.id && c.consumption === true
        );
        
        if (commitmentIndex >= 0) {
          commitments[poolKey].splice(commitmentIndex, 1);
          await actor.update({ "system.effortCommitments": commitments });
          
          // Recalculate pool value
          const newValue = Math.max(0, pool.max - commitments[poolKey].reduce((sum, c) => sum + c.amount, 0));
          await actor.update({ [`system.pools.${poolKey}.value`]: newValue });
          
          return { 
            success: true, 
            type: "poolResource",
            poolKey,
            resourceName: consumes.resourceName,
            subResource: consumes.subResource,
            restored: consumes.usesCost,
            cadence: consumes.cadence
          };
        }
      }
    } else {
      // Direct restoration for other cadences
      const newValue = Math.min(pool.max, pool.value + consumes.usesCost);
      await actor.update({ [`system.pools.${poolKey}.value`]: newValue });
      
      return { 
        success: true, 
        type: "poolResource",
        poolKey,
        resourceName: consumes.resourceName,
        subResource: consumes.subResource,
        restored: consumes.usesCost,
        cadence: consumes.cadence
      };
    }

    return { success: false, message: "Unable to restore pool resource" };
  }
}