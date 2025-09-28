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
      // Free-text description for required item(s) for display in selection dialog
      itemText: new fields.StringField({ initial: "" }),
      uses: new fields.SchemaField({
        value: new fields.NumberField({ initial: 1, min: 0 }),
        max: new fields.NumberField({ initial: 1, min: 0 })
      }),
      // Controls when this consumption is processed:
      // "preparation": Cost paid during power preparation (not shown in chat)
      // "manual": Cost paid via chat card buttons (normal behavior)
      // "immediate": Cost paid immediately when sending to chat (no buttons shown)
      timing: new fields.StringField({
        choices: Object.keys(CONFIG.SWN.consumptionTiming),
        initial: "manual"
      })
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
      const sourceConsumptions = this.parent._source?.system?.consumptions || [];
      
      this.consumptions.forEach((consumption, index) => {
        const sourceConsumption = sourceConsumptions[index] || {};
        
        // Ensure uses object exists with proper defaults, but preserve stored values
        if (!consumption.uses || typeof consumption.uses !== 'object') {
          consumption.uses = { value: 1, max: 1 };
        }
        
        // Preserve stored value if it exists, otherwise use computed default
        const storedValue = sourceConsumption.uses?.value;
        const storedMax = sourceConsumption.uses?.max;
        
        if (typeof consumption.uses.value !== 'number') {
          consumption.uses.value = (typeof storedValue === 'number') ? storedValue : consumption.uses.max;
        }
        if (typeof consumption.uses.max !== 'number') {
          consumption.uses.max = (typeof storedMax === 'number') ? storedMax : 1;
        }
        
        // Ensure other properties have defaults
        if (!consumption.itemText && consumption.itemText !== "") {
          consumption.itemText = "";
        }
        if (!consumption.usesCost || typeof consumption.usesCost !== 'number') {
          consumption.usesCost = 1;
        }
        if (!consumption.cadence) {
          consumption.cadence = "day";
        }
        if (!consumption.timing || !Object.keys(CONFIG.SWN.consumptionTiming).includes(consumption.timing)) {
          consumption.timing = "manual"; // Default to manual timing
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
      uses: consumption.uses || { value: 1, max: 1 }
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

    // Process only immediate consumption types (timing: "immediate")
    const consumptionResults = [];
    const all = this.consumptions || [];
    
    // First pass: validate all immediate consumption requirements
    for (let i = 0; i < all.length; i++) {
      const consumes = all[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "immediate") continue; // Skip non-runtime costs
      
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
    
    // Second pass: apply all immediate consumption costs
    for (let i = 0; i < all.length; i++) {
      const consumes = all[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "immediate") continue; // Skip non-runtime costs
      
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

    // Process only manual consumption types (timing: "manual")
    const consumptionResults = [];
    const allManual = this.consumptions || [];
    
    // First pass: validate all manual consumption requirements on original indices
    for (let i = 0; i < allManual.length; i++) {
      const consumes = allManual[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "manual") continue; // Skip non-manual costs
      
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

    // Second pass: apply manual consumption
    for (let i = 0; i < allManual.length; i++) {
      const consumes = allManual[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "manual") continue; // Skip non-manual costs
      
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

    // Check if power has manual costs (timing: "manual")
    const manualConsumptions = this.getConsumptions().filter(c => c.timing === "manual");
    const hasManualCosts = manualConsumptions.length > 0;
    const manualConsumableReqs = manualConsumptions
      .map((c, idx) => ({ index: idx, ...c }))
      .filter(c => c.type === "consumableItem" && (c.itemText || "").trim().length > 0);
    const consumableRequirements = manualConsumableReqs.map(c => ({
      index: c.index,
      amount: c.usesCost || 0,
      text: (c.itemText || "").trim()
    }));
    
    // Check if power has any runtime costs (immediate or manual)
    const allConsumptions = this.getConsumptions();
    const runtimeConsumptions = allConsumptions.filter(c => c.timing === "immediate" || c.timing === "manual");
    const hasRuntimeCosts = runtimeConsumptions.length > 0;
    
    const templateData = {
      actor: actor,
      power: item,
      powerRoll: powerRoll ? await powerRoll.render() : null,
      strainCost: totalStrainCost,
      isPassive: !hasRuntimeCosts, // Passive only if no immediate or manual costs
      consumptions: consumptionResults, // Contains immediate costs due to filtering in use()
      hasManualConsumables: consumableRequirements.length > 0,
      hasUnprocessedConsumableManual: consumableRequirements.length > 0,
      consumableRequirements
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
    
    // Check if power has immediate costs - if so, use the full usage flow
    const allConsumptions = this.getConsumptions();
    const immediateConsumptions = allConsumptions.filter(c => c.timing === "immediate");
    const hasImmediateCosts = immediateConsumptions.length > 0;
    
    if (hasImmediateCosts) {
      // Use the full power usage flow which will process immediate costs and create chat card
      return await this.use();
    }
    
    // For powers without immediate costs, use the simple roll-to-chat flow
    const powerRoll = new Roll(this.roll ? this.roll : "0");
    await powerRoll.roll();
    
    // Check if power has manual costs (timing: "manual")
    const manualConsumptions = allConsumptions.filter(c => c.timing === "manual");
    const hasManualCosts = manualConsumptions.length > 0;
    
    // Check if power has any runtime costs (immediate or manual)
    const runtimeConsumptions = allConsumptions.filter(c => c.timing === "immediate" || c.timing === "manual");
    const hasRuntimeCosts = runtimeConsumptions.length > 0;
    
    // Determine if there are manual consumable costs to show combined button
    const hasManualConsumables = allConsumptions.some(c => c.timing === "manual" && c.type === "consumableItem");
    const consumableRequirements = allConsumptions
      .map((c, idx) => ({ index: idx, ...c }))
      .filter(c => c && c.timing === 'manual' && c.type === 'consumableItem' && (c.itemText || '').trim().length > 0)
      .map(c => ({ index: c.index, amount: c.usesCost || 0, text: (c.itemText || '').trim() }));
    
    const dialogData = {
      actor: actor,
      power: item,
      powerRoll: await powerRoll.render(),
      strainCost: 0,
      isPassive: !hasRuntimeCosts, // Passive only if no immediate or manual costs
      consumptions: [], // Empty for initial state
      hasManualConsumables,
      hasUnprocessedConsumableManual: hasManualConsumables,
      consumableRequirements
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
        
        // Check if specific pool is available, otherwise try generic pool fallback
        let validPool = pool;
        if ((!pool || pool.value < consumes.usesCost) && consumes.subResource) {
          const genericPoolKey = this._getPoolKey(consumes.resourceName, "");
          validPool = pools[genericPoolKey];
        }
        
        if (!validPool || validPool.value < consumes.usesCost) {
          return { 
            valid: false, 
            reason: "insufficient-source-effort",
            message: `Insufficient source effort: ${validPool?.value || 0}/${validPool?.max || 0} available, ${consumes.usesCost} required`
          };
        }
        return { valid: true };
        
      case "systemStrain":
        // System strain can always be applied (no maximum check needed)
        return { valid: true };
        
      case "consumableItem":
        // Always defer to selection dialog; no fixed association with a specific item
        {
          const eligible = (actor.items.contents || actor.items)
            .filter(i => i.type === "item"
              && i.system?.uses?.consumable !== "none"
              && i.system?.location === "readied"
              && (i.system?.uses?.value || 0) > 0);
          if (eligible.length === 0) {
            return { valid: false, reason: "no-eligible-readied-items", message: game.i18n?.localize?.("swnr.consumption.selectDialog.noneAvailable") || "No readied consumables with sufficient uses available" };
          }
          return { valid: true };
        }
        
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
        return await this._processConsumableItem(actor, consumes, options);
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
    
    // If specific pool not available/sufficient, try fallback to generic pool (blank subtype)
    let actualPoolKey = poolKey;
    let actualPool = pool;
    
    if ((!pool || pool.value < consumes.usesCost) && consumes.subResource) {
      // Try generic pool with blank subtype as fallback
      const genericPoolKey = this._getPoolKey(consumes.resourceName, "");
      const genericPool = pools[genericPoolKey];
      
      if (genericPool && genericPool.value >= consumes.usesCost) {
        actualPoolKey = genericPoolKey;
        actualPool = genericPool;
      }
    }
    
    if (!actualPool || actualPool.value < consumes.usesCost) {
      return { 
        success: false, 
        reason: "insufficient-pool-resource",
        message: `Insufficient ${consumes.resourceName}${consumes.subResource ? ':' + consumes.subResource : ''}: ${actualPool?.value || 0}/${actualPool?.max || 0} available, ${consumes.usesCost} required`,
        poolKey: actualPoolKey,
        required: consumes.usesCost,
        available: actualPool?.value || 0
      };
    }
    
    // Create effort commitment if cadence is commit
    if (["commit", "scene", "day"].includes(consumes.cadence)) {
      const commitments = foundry.utils.deepClone(actor.system.effortCommitments || {});
      if (!commitments[actualPoolKey]) commitments[actualPoolKey] = [];
      
      commitments[actualPoolKey].push({
        powerId: this.parent.id,
        powerName: this.parent.name,
        amount: consumes.usesCost,
        duration: consumes.cadence,
        timestamp: Date.now(),
        consumption: true
      });
      
      await actor.update({ "system.effortCommitments": commitments });
      
      // Update pool value
      const newValue = Math.max(0, actualPool.max - commitments[actualPoolKey].reduce((sum, c) => sum + c.amount, 0));
      await actor.update({ [`system.pools.${actualPoolKey}.value`]: newValue });
    } else {
      // Direct spending for other cadences
      await actor.update({ [`system.pools.${actualPoolKey}.value`]: actualPool.value - consumes.usesCost });
    }
    
    return { 
      success: true, 
      type: "poolResource",
      poolKey: actualPoolKey,
      resourceName: consumes.resourceName,
      subResource: actualPoolKey === poolKey ? consumes.subResource : "", // Show blank subtype if fallback used
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
  async _processConsumableItem(actor, consumes, options = {}) {
    // Allow passing a selected item via options (e.g., from chat button or future hooks)
    let selectedItemId = options.selectedItemId || consumes.itemId || null;

    // If no item selected in the power, prompt user to pick a readied consumable
    // If no single item selected, prompt for multi-selection and amounts
    if (!selectedItemId) {
      const selection = await this._promptForConsumableItem(actor, consumes);
      if (!selection || selection.length === 0) {
        return { success: false, reason: "cancelled", message: game.i18n?.localize?.("swnr.consumption.selectDialog.cancelled") || "Item selection cancelled" };
      }

      // Apply spends across selected items
      const itemsSpent = [];
      for (const { itemId, amount } of selection) {
        let remainingToSpend = Math.max(0, amount || 0);
        let actualSpent = 0;
        // Re-fetch the item each decrement to avoid stale system data
        while (remainingToSpend > 0) {
          const current = actor.items.get(itemId);
          if (!current) break;
          const available = current.system?.uses?.value || 0;
          if (available <= 0) break;
          await current.system.removeOneUse();
          actualSpent += 1;
          remainingToSpend -= 1;
        }
        if (actualSpent > 0) {
          const name = actor.items.get(itemId)?.name || "Item";
          itemsSpent.push({ itemId, itemName: name, amount: actualSpent });
        }
      }

      const totalSpent = itemsSpent.reduce((s, r) => s + r.amount, 0);
      return { success: true, type: "consumableItem", spent: totalSpent, items: itemsSpent };
    }

    // Legacy single-item flow
    const item = actor.items.get(selectedItemId);
    if (!item) {
      return { 
        success: false, 
        reason: "item-not-found",
        message: `Required item not found: ${selectedItemId}`,
        itemId: selectedItemId
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

    for (let i = 0; i < consumes.usesCost; i++) {
      await item.system.removeOneUse();
    }
    return { success: true, type: "consumableItem", spent: consumes.usesCost, items: [{ itemId: item.id, itemName: item.name, amount: consumes.usesCost }] };
  }

  /**
   * Prompt and spend consumables for chat card consumption
   * @param {Actor} actor - Target actor
   * @param {Array} requirements - Array of {amount, text} requirements
   * @returns {Promise<Object>} Result with success and consumption details
   */
  async _promptAndSpendConsumables(actor, requirements) {
    // Create a dummy consumption object for the existing method
    const dummyConsumes = { usesCost: 1 };

    // Use existing method to get selections
    const selections = await this._promptForConsumableItem(actor, dummyConsumes);
    if (!selections || selections.length === 0) {
      return { success: false, reason: "cancelled" };
    }

    // Apply spends across selected items
    const itemsSpent = [];
    for (const { itemId, amount } of selections) {
      let remainingToSpend = Math.max(0, amount || 0);
      let actualSpent = 0;
      // Re-fetch the item each decrement to avoid stale system data
      while (remainingToSpend > 0) {
        const current = actor.items.get(itemId);
        if (!current) break;
        const available = current.system?.uses?.value || 0;
        if (available <= 0) break;
        await current.system.removeOneUse();
        actualSpent += 1;
        remainingToSpend -= 1;
      }
      if (actualSpent > 0) {
        const name = actor.items.get(itemId)?.name || "Item";
        itemsSpent.push({ itemId, itemName: name, amount: actualSpent });
      }
    }

    const totalSpent = itemsSpent.reduce((s, r) => s + r.amount, 0);
    return {
      success: true,
      type: "consumableItem",
      spent: totalSpent,
      items: itemsSpent
    };
  }

  /**
   * Prompt the user to choose a readied consumable item to spend for this power
   * @param {Actor} actor
   * @param {Object} consumes
   * @returns {Promise<string|null>} selected itemId or null if cancelled
   */
  async _promptForConsumableItem(actor, consumes) {
    const required = consumes.usesCost || 1; // informational only; selection controls final amounts
    // Gather eligible readied consumables with any uses
    const eligible = (actor.items.contents || actor.items)
      .filter(i => i.type === "item"
        && i.system?.uses?.consumable !== "none"
        && i.system?.location === "readied"
        && (i.system?.uses?.value || 0) > 0)
      .sort((a, b) => (b.system?.uses?.value || 0) - (a.system?.uses?.value || 0));

    if (eligible.length === 0) {
      ui.notifications?.warn(game.i18n?.localize?.("swnr.consumption.selectDialog.noneAvailable") || "No readied consumables with sufficient uses available");
      return null;
    }

    // Render dialog content from template
    const template = "systems/swnr/templates/dialogs/select-consumables.hbs";
    const items = eligible.map(i => ({
      id: i.id,
      name: i.name,
      img: i.img || "icons/svg/item-bag.svg",
      value: i.system?.uses?.value || 0,
      max: i.system?.uses?.max || (i.system?.uses?.value || 0)
    }));
    const content = await renderTemplate(template, { items });

    return new Promise((resolve) => {
      const dialogId = `swnr-consume-select-${actor.id}-${Date.now()}`;
      const dlg = new Dialog({
        title: game.i18n?.localize?.("swnr.consumption.selectDialog.title") || "Select Consumables",
        content,
        buttons: {
          ok: {
            label: game.i18n?.localize?.("OK") || "OK",
            callback: (html) => {
              // Build selection exactly as chosen by the user
              const selections = [];
              let total = 0;
              for (const i of eligible) {
                const amtEl = html.find(`.swnr-amt[data-item-id="${i.id}"]`);
                const rowEl = html.find(`tr[data-item-id="${i.id}"]`);
                let amt = parseInt(amtEl.text()) || 0;
                const available = parseInt(rowEl.data('available')) || 0;
                const toSpend = Math.min(amt, available);
                if (toSpend > 0) {
                  selections.push({ itemId: i.id, amount: toSpend });
                  total += toSpend;
                }
              }
              if (total <= 0) {
                ui.notifications?.warn(game.i18n?.localize?.("swnr.consumption.selectDialog.noneSelected") || "No items selected to consume");
                resolve(null);
              } else {
                resolve(selections);
              }
            }
          },
          cancel: {
            label: game.i18n?.localize?.("Cancel") || "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }, { id: dialogId });

      // Attach +/- behavior on render for this dialog only
      Hooks.once('renderDialog', (app, html) => {
        if (app.id !== dialogId) return;
        const req = required;
        const updateSelected = () => {
          let sum = 0;
          html.find('.swnr-amt').each((_i, el) => { sum += parseInt(el.textContent) || 0; });
          html.find('.swnr-selected-count').text(sum);
          return sum;
        };
        const inc = (cell) => {
          const tr = cell.closest('tr');
          const amtSpan = cell.find('.swnr-amt');
          const available = parseInt(tr.data('available')) || 0;
          let current = parseInt(amtSpan.text()) || 0;
          if (current >= available) return; // cannot exceed available
          amtSpan.text(current + 1);
          updateSelected();
        };
        const dec = (cell) => {
          const amtSpan = cell.find('.swnr-amt');
          let current = parseInt(amtSpan.text()) || 0;
          if (current <= 0) return;
          amtSpan.text(current - 1);
          updateSelected();
        };
        html.on('click', '.swnr-consume-select .swnr-inc', ev => {
          ev.preventDefault();
          const cell = $(ev.currentTarget).closest('td');
          inc(cell);
        });
        html.on('click', '.swnr-consume-select .swnr-dec', ev => {
          ev.preventDefault();
          const cell = $(ev.currentTarget).closest('td');
          dec(cell);
        });
        updateSelected();
      });

      dlg.render(true);
    });
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
    
    // Update the consumption entry by replacing the whole array element to satisfy v13 array validation
    const updated = foundry.utils.deepClone(this.consumptions || []);
    if (!updated[consumptionIndex]) updated[consumptionIndex] = { type: "uses", uses: { value: 0, max: 1 } };
    updated[consumptionIndex].type = "uses";
    updated[consumptionIndex].uses = {
      ...(updated[consumptionIndex].uses || { value: 0, max: 1 }),
      value: newValue
    };
    await this.parent.update({ "system.consumptions": updated });
    
    return { 
      success: true, 
      type: "uses",
      spent: 1,
      remaining: newValue,
      max: consumes.uses.max,
      cadence: consumes.cadence || null,
      resourceName: "Uses"
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

    // Get only preparation consumptions (timing: "preparation")
    const allForPrep = this.consumptions || [];
    
    // Validate all preparation consumption requirements
    for (let i = 0; i < allForPrep.length; i++) {
      const consumes = allForPrep[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "preparation") continue; // Skip non-prep costs
      
      const validation = await this._validateConsumption(actor, consumes, i);
      if (!validation.valid) {
        return {
          success: false,
          reason: validation.reason,
          message: `Cannot prepare: ${validation.message}`
        };
      }
    }

    // Deduct resources for preparation (only timing: "preparation")
    const consumptionResults = [];
    for (let i = 0; i < allForPrep.length; i++) {
      const consumes = allForPrep[i];
      if (!consumes || consumes.type === "none" || consumes.timing !== "preparation") continue; // Skip non-prep costs
      
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

    // Restore resources for unpreparation (only timing: "preparation")
    const consumptions = this.getConsumptions();
    const restorationResults = [];
    
    for (const consumes of consumptions) {
      if (consumes.timing !== "preparation") continue; // Skip manual and immediate costs during unpreparation
      
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
