import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';
import { calcMod } from '../../helpers/utils.mjs';
import { calculatePoolsFromFeatures } from '../../helpers/pool-helpers.mjs';

export default class SWNCharacter extends SWNActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Character',
  ];


  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Iterate over stat names and create a new SchemaField for each.
    schema.stats = new fields.SchemaField(
      Object.keys(CONFIG.SWN.stats).reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          base: SWNShared.requiredNumber(9),
          bonus: SWNShared.requiredNumber(0),
          boost: SWNShared.requiredNumber(0),
          temp: SWNShared.requiredNumber(0,-18),
          modModifier: SWNShared.nullableNumber(),
        });
        return obj;
      }, {})
    );

    schema.hitDie = SWNShared.requiredString("d6");
    schema.level = new fields.SchemaField({
      value: SWNShared.requiredNumber(1),
      exp: SWNShared.requiredNumber(0),
      expToLevel: SWNShared.requiredNumber(3)
    });
    schema.goals = SWNShared.requiredString("");
    schema.class = SWNShared.requiredString("");
    schema.homeworld = SWNShared.requiredString("");
    schema.background = SWNShared.requiredString("");
    schema.employer = SWNShared.requiredString("");
    schema.biography = SWNShared.requiredString("");
    schema.languages = new fields.ArrayField(SWNShared.requiredString(""));
    schema.credits = new fields.SchemaField({
      debt: SWNShared.requiredNumber(0),
      balance: SWNShared.requiredNumber(0),
      owed: SWNShared.requiredNumber(0)
    });
    schema.unspentSkillPoints = SWNShared.requiredNumber(0);
    schema.unspentPsySkillPoints = SWNShared.requiredNumber(0);
    schema.extra = SWNShared.resourceField(0, 10);
    schema.stress = SWNShared.nullableNumber();

    schema.tweak = new fields.SchemaField({
      advInit: new fields.BooleanField({initial: false}),
      quickSkill1: SWNShared.emptyString(), //deprecated
      quickSkill2: SWNShared.emptyString(), //deprecated
      quickSkill3: SWNShared.emptyString(), //deprecated
      extraHeader: SWNShared.emptyString(),
      showResourceList: new fields.BooleanField({initial: false}),
      showCyberware: new fields.BooleanField({initial: true}),
      showPsychic: new fields.BooleanField({initial: true}),
      showArts: new fields.BooleanField({initial: false}),
      showSpells: new fields.BooleanField({initial: false}),
      showAdept: new fields.BooleanField({initial: false}),
      showMutation: new fields.BooleanField({initial: false}),
      showPoolsInHeader: new fields.BooleanField({ initial: true }),
      showPoolsInPowers: new fields.BooleanField({ initial: false }),
      resourceList: new fields.ArrayField(new fields.SchemaField({
        name: SWNShared.emptyString(),
        value: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0),
      })),
      debtDisplay: SWNShared.requiredString("Debt"),
      owedDisplay: SWNShared.requiredString("Owed"),
      balanceDisplay: SWNShared.requiredString("Balance"),
      initiative: new fields.SchemaField({
        mod: SWNShared.nullableNumber(),
      })
    });

    schema.effortCommitments = new fields.ObjectField({
      /* Dynamic keys: "${resourceName}:${subResource}" */
      /* Values: array of { powerId, powerName, amount } */
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Loop through stat scores, and add their modifiers to our sheet output.
    for (const key in this.stats) {
      this.stats[key].baseTotal = this.stats[key].base + this.stats[key].boost;
      this.stats[key].total = this.stats[key].baseTotal + this.stats[key].temp;
      this.stats[key].mod = calcMod(this.stats[key].total , this.stats[key].bonus) ;
      if (this.stats[key].modModifier) {
        this.stats[key].mod += this.stats[key].modModifier;
      }
      // Handle stat label localization.
      this.stats[key].label =
        game.i18n.localize(CONFIG.SWN.stats[key]) ?? key;
    }
    //Cyberware
    const cyberware = this.parent.items.filter((i) => i.type === "cyberware");       
    
    // Sum up cyberware strain, forcing to number
    let cyberwareStrain = cyberware.reduce((acc, item) => {
      return acc + Number(item.system.strain);
    }, 0);
    // System Strain
    this.systemStrain.cyberware = cyberwareStrain;
    this.systemStrain.max = this.stats.con.total - this.systemStrain.cyberware - this.systemStrain.permanent;
    this.systemStrain.percentage = Math.clamp((this.systemStrain.value * 100) / this.systemStrain.max, 0, 100);

    // Calculate saves
    const save = {};
    const base = 16 - this.level.value;
    save.physical = Math.max(
      1,
      base - Math.max(this.stats.str.mod, this.stats.con.mod)
    );
    save.evasion = Math.max(
      1,
      base - Math.max(this.stats.dex.mod, this.stats.int.mod)
    );
    save.mental = Math.max(
      1,
      base - Math.max(this.stats.wis.mod, this.stats.cha.mod)
    );
    save.luck = Math.max(1, base);
    this.save = save;

    // Access calculation
    this.access.max = this.stats.int.mod;
    // If the character has a program skill add it
    const programSkill = 
      this.parent.items
        .filter((i) => i.type === "skill")
        .filter((i) => i.name === "Program");
    if (programSkill && programSkill.length == 1) {
      this.access.max += programSkill[0].system.rank;
    }
    this.access.max = Math.max(0, this.access.max);

    // Set up soak and trauma target
    const useCWNArmor = game.settings.get("swnr", "useCWNArmor") ? true : false;
    const useTrauma = game.settings.get("swnr", "useTrauma") ? true : false;
    
    this.soakTotal = {
      value: 0,
      max: 0,
    };

    if (useTrauma) {
      this.modifiedTraumaTarget = this.traumaTarget;
    }

    // AC
    const armor = this.parent.items.filter(
        (i) =>
          i.type === "armor" &&
          i.system.use &&
          i.system.location === "readied"
      );
    const shields = armor.filter((i) => i.system.shield);
    let armorId = "";
    let baseAc = this.baseAc;
    let baseMeleeAc = this.baseAc;
    for (const a of armor) {
      if (a.system.ac > baseAc) {
        baseAc = a.system.ac;
        if (a.system.meleeAc) {
          baseMeleeAc = a.system.meleeAc;
          if (useTrauma) {
            this.modifiedTraumaTarget += a.system.traumaDiePenalty;
          }
        }
        if (a.id) {
          armorId = a.id;
        }
      }
      if (a.system.soak.max > 0) {
        this.soakTotal.max += a.system.soak.max;
        this.soakTotal.value += a.system.soak.value;
      }
    }
    for (const shield of shields) {
      if (shield.system.shieldACBonus && shield.id != armorId) {
        baseAc += shield.system.shieldACBonus;
        if (shield.system.shieldMeleeACBonus) {
          baseMeleeAc += shield.system.shieldMeleeACBonus;
        }
      }
    }
    this.ac = baseAc + this.stats.dex.mod;
    if (useCWNArmor) {
      this.meleeAc = baseMeleeAc + this.stats.dex.mod;
    }

    // effort
    const psychicSkills = 
      this.parent.items.filter(
        (i) =>
          i.type === "skill" &&
          i.system.source.toLocaleLowerCase() ===
            game.i18n.localize("swnr.skills.labels.psionic").toLocaleLowerCase()
      );
    const useCyber = game.settings.get("swnr", "useCWNCyber");
    const cyberStrain = useCyber ? this.systemStrain.cyberware : 0;

    //encumbrance
    if (!this.encumbrance)
      this.encumbrance = {
        ready: { max: 0, value: 0, percentage: 100 },
        stowed: { max: 0, value: 0, percentage: 100 },
      };
    const encumbrance = this.encumbrance;
    encumbrance.ready.max = Math.floor(this.stats.str.total / 2);
    encumbrance.stowed.max = this.stats.str.total;
    
    const inventory = this.parent.items.filter(
        (i) => i.type === "item" || i.type === "weapon" || i.type === "armor");
    let gear = [];
    let consumables = [];

    // Partition the item inventory into gear and consumables
    inventory.filter((i) => i.type === "item").map((i) => {
        const itemData = i.system;
        if (itemData.uses.consumable === "none") {
          gear.push(i);
        } else {
          consumables.push(i);
        }
    });

    const itemInvCost = function (i) {
      let itemSize = 1;
      if (i.type === "item") {
        const itemData = i.system;
        const bundle = itemData.bundle;
        itemSize = Math.ceil(
          itemData.quantity / (bundle.bundled ? bundle.amount : 1)
        );
      } else {
        if (i.system.quantity) {
          // Weapons and armor can have qty
          itemSize = i.system.quantity;
        }
      }
      return itemSize * i.system.encumbrance;
    };
    const readiedItems = inventory.filter((i) => i.system.location === "readied");

    encumbrance.ready.value = readiedItems
      .filter((i) => i.system.noEncReadied === false)
      .map(itemInvCost)
      .reduce((i, n) => i + n, 0);
    encumbrance.stowed.value = inventory
      .filter((i) => i.system.location === "stowed")
      .map(itemInvCost)
      .reduce((i, n) => i + n, 0);

    encumbrance.ready.percentage = Math.clamp((encumbrance.ready.value * 100) / encumbrance.ready.max, 0, 100);
    encumbrance.stowed.percentage = Math.clamp((encumbrance.stowed.value * 100) / encumbrance.stowed.max, 0, 100);

    const powers = this.parent.items.filter((i) => i.type == "power");

    powers.sort(function (a, b) {
      if (a.system.source == b.system.source) {
        return a.system.level - b.system.level;
      } else {
        return a.system.source.localeCompare(b.system.source);
      }
    });
    this.powers = powers;
      
    this.favorites = this.parent.items.filter((i) => i.system["favorite"]);;
    this.readiedWeapons = readiedItems.filter((i) => i.type === "weapon");
    this.readiedArmor = readiedItems.filter((i) => i.type === "armor");
    this.gear = gear;
    this.consumables = consumables;
    
    // Calculate resource pools from Features/Foci/Edges
    this._calculateResourcePools();
  }

  getRollData() {
    const data = {};

    // Copy the stat scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.stats) {
      for (let [k, v] of Object.entries(this.stats)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data["lvl"] = this.level.value;
    data["HD"] = this.hitDie?.value || 0;
    return data;
  }

  async rollSave(saveType) {
    const target = this.save[saveType];
    if (isNaN(target)) {
      ui.notifications?.error("Unable to find save: " + saveType);
      return;
    }
    const template = "systems/swnr/templates/dialogs/roll-save.hbs";
    const title = game.i18n.format("swnr.titles.savingThrow", {
      throwType: game.i18n.localize("swnr.sheet.saves." + saveType),
    });
    const dialogData = {};
    const html = await renderTemplate(template, dialogData);

    //Callback for rolling
    const _doRoll = async (_event, button, _html) => {
      const rollMode = game.settings.get("core", "rollMode");
      const modifier = parseInt(button.form.elements.modifier?.value);
      if (isNaN(modifier)) {
        ui.notifications?.error(`Error, modifier is not a number ${modString}`);
        return;
      }
      // old approach const formula = `1d20cs>=(@target - @modifier)`;
      const formula = `1d20`;
      const roll = new Roll(formula, {
        modifier,
        target: target,
      });
      await roll.roll();
      const success = roll.total ? roll.total >= target - modifier : false;
      const save_text = game.i18n.format(
        success
          ? game.i18n.localize("swnr.npc.saving.success")
          : game.i18n.localize("swnr.npc.saving.failure"),
        { actor: this.parent.name, target: target - modifier }
      );
      const chatTemplate = "systems/swnr/templates/chat/save-throw.hbs";
      const chatDialogData = {
        saveRoll: await roll.render(),
        title,
        save_text,
        success,
      };
      const chatContent = await renderTemplate(chatTemplate, chatDialogData);
      const chatData = {
        speaker: ChatMessage.getSpeaker(),
        roll: JSON.stringify(roll),
        rolls: [roll],
        content: chatContent
      };
      getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
      getDocumentClass("ChatMessage").create(chatData);
    };
    const popUpDialog = await foundry.applications.api.DialogV2.prompt(
      {
        window: { title: title },
        content: html,
        modal: false,
        rejectClose: false,
        ok: {
          label: game.i18n.localize("swnr.chat.roll"),
          callback: _doRoll,
        },
      }
    );
  }

  async rollHitDice(_force = false) {
    // 2e warrior/partial : +2
    // 1e psy 1d4, expert 1d6, warrior 1d8

    const currentLevel = this.level.value;
    const lastModified = this.health_max_modified;
    if (currentLevel <= lastModified) {
      ui.notifications?.info(
        "Not rolling hp: already rolled this level (or higher)"
      );
      return;
    }
    // const lastLevel =
    // currentLevel === 1 ? 0 : this.parent.getFlag("swnr", "lastHpLevel");
    const health = this.health;
    const currentHp = health.max;
    const hd = this.hitDie;

    const constBonus = this.stats.con.mod;
    const perLevel = `max(${hd} + ${constBonus}, 1)`;

    const _rollHP = async () => {
      const hitArray = Array(currentLevel).fill(perLevel);
      const formula = hitArray.join("+");

      let msg = `Rolling Level ${currentLevel} HP: ${formula}<br>(Rolling a hitdice per level, with adding the CON mod. Each roll cannot be less than 1)<br>`;
      const roll = new Roll(formula);
      await roll.roll();
      if (roll.total) {
        let hpRoll = roll.total;
        msg += `Got a ${hpRoll}<br>`;
        if (currentLevel == 1) {
          // Rolling the first time
        } else if (currentLevel > 1) {
          hpRoll = Math.max(hpRoll, currentHp + 1);
        }
        msg += `Setting HP max to ${hpRoll}<br>`;
        await this.parent.update({ 
          system: {
            health_max_modified: currentLevel,
            health: { 
              max: hpRoll,
            }
          }
        });
        getDocumentClass("ChatMessage").create({
          speaker: chatMessage.getSpeaker({ actor: this.parent }),
          flavor: msg,
          roll: JSON.stringify(roll),
          rolls: [roll],
        });
      } else {
        console.log("Something went wrong with roll ", roll);
      }
    };

    if (this.hitDie) {
      const performHPRoll = await new Promise((resolve) => {
        Dialog.confirm({
          title: game.i18n.format("swnr.dialog.hp.title", {
            actor: this.parent.name,
          }),
          yes: () => resolve(true),
          no: () => resolve(false),
          content: game.i18n.format("swnr.dialog.hp.text", {
            actor: this.parent.name,
            level: currentLevel,
            formula: perLevel,
          }),
        });
      });
      if (performHPRoll) await _rollHP();
    } else {
      ui.notifications?.info("Set the character's HitDie");
    }

    // Calculate resource pools from Features/Foci/Edges
    this._calculateResourcePools();

    return;
  }

  /**
   * Calculate resource pools based on Features, Foci, and Edges
   * @private
   */
  _calculateResourcePools() {
    this.pools = calculatePoolsFromFeatures({
      parent: this.parent,
      dataModel: this,
      evaluateCondition: (cond) => this._evaluateCondition(cond),
      evaluateFormula: (formula) => this._evaluateFormula(formula),
      includeCommitments: true,
    });
  }

  /**
   * Evaluate a condition string (e.g., "@level >= 3")
   * @param {string} condition - The condition to evaluate
   * @returns {boolean} - Whether the condition is met
   * @private
   */
  _evaluateCondition(condition) {
    try {
      // Simple variable substitution
      let expr = condition
        .replace(/@level/g, this.level.value)
        .replace(/@stats\.(\w+)\.mod/g, (match, stat) => this.stats[stat]?.mod || 0)
        .replace(/@stats\.(\w+)\.total/g, (match, stat) => this.stats[stat]?.total || 0);
      
      // Basic safety check - only allow numbers, operators, and parentheses
      if (!/^[\d\s+\-*/()>=<!&|.]+$/.test(expr)) {
        console.warn(`[SWN Pool] Unsafe condition: ${condition}`);
        return false;
      }
      
      // Use Function constructor for evaluation (safer than eval)
      return new Function('return ' + expr)();
    } catch (error) {
      console.warn(`[SWN Pool] Failed to evaluate condition "${condition}":`, error);
      return false;
    }
  }

  /**
   * Evaluate a formula string (e.g., "@level + @stats.cha.mod")
   * @param {string} formula - The formula to evaluate
   * @returns {number} - The calculated value
   * @private
   */
  _evaluateFormula(formula) {
    // Validate formula contains only allowed patterns before substitution
    const allowedPattern = /^[@\w\s+\-*/().MathMaxinflorceliwStrgmn,._]+$/;
    if (!allowedPattern.test(formula)) {
      throw new Error(`Unsafe formula: ${formula}`);
    }
    
    // Get psychic skills for special psychic calculations
    const psychicSkills = this.parent.items.filter(
      (i) =>
        i.type === "skill" &&
        i.system.source.toLocaleLowerCase() ===
          game.i18n.localize("swnr.skills.labels.psionic").toLocaleLowerCase()
    );
    const highestPsychicSkill = Math.max(0, ...psychicSkills.map((i) => i.system.rank));
    
    // Simple variable substitution
    let expr = formula
      .replace(/@level/g, this.level.value)
      .replace(/@stats\.(\w+)\.mod/g, (match, stat) => this.stats[stat]?.mod || 0)
      .replace(/@stats\.(\w+)\.total/g, (match, stat) => this.stats[stat]?.total || 0)
      .replace(/@skills\.psychic\.highest/g, highestPsychicSkill)
      .replace(/@skills\.([^.]+)\.rank/g, (match, skillName) => {
        // Replace underscores with spaces for skill names
        const decodedSkillName = skillName.replace(/_/g, ' ');
        const skill = this.parent.items.find(i => 
          i.type === "skill" && 
          i.name.toLocaleLowerCase() === decodedSkillName.toLocaleLowerCase()
        );
        return skill?.system.rank || -1; // -1 for untrained
      });
    
    // Final safety check - after substitution should only contain numbers and math
    if (!/^[\d\s+\-*/().MathMaxinflorceliwStrgmn,]+$/.test(expr)) {
      throw new Error(`Unsafe expression after substitution: ${expr}`);
    }
    
    // Use Function constructor for evaluation with Math object available
    const result = new Function('Math', 'return ' + expr)(Math);
    
    // If the formula already used Math.ceil or Math.floor, don't apply additional rounding
    // Otherwise, default to Math.floor (current behavior)
    if (formula.includes('Math.ceil') || formula.includes('Math.floor')) {
      return Math.max(0, Math.round(result)); // Use round to preserve existing rounding
    } else {
      return Math.max(0, Math.floor(result)); // Default behavior: round down
    }
  }

  /**
   * Handle a full rest for the night (day cadence refresh)
   * @param {Object} options - Rest options
   * @param {boolean} options.isFrail - Whether this is a frail rest (no HP recovery)
   * @returns {Promise<RefreshResult>} Rest results in standardized format
   */
  async restForNight(options = {}) {
    const { isFrail = false } = options;
    const systemData = this.parent.system;
    
    // Calculate new HP and strain values
    const oldHP = systemData.health.value;
    const oldStrain = systemData.systemStrain.value;
    const newStrain = Math.max(oldStrain - 1, 0);
    const newHP = isFrail
      ? oldHP
      : Math.min(oldHP + systemData.level.value, systemData.health.max);
    
    // Collect all updates in single object
    let allUpdates = {
      system: {
        systemStrain: { value: newStrain },
        health: { value: newHP },
      }
    };
    
    // Collect pool updates and item updates from refresh logic
    const refreshResults = await this._collectRefreshUpdates('day');
    
    // Merge pool updates into actor-level update payload
    if (refreshResults.poolUpdates && Object.keys(refreshResults.poolUpdates).length > 0) {
      const poolUpdates = foundry.utils.expandObject(refreshResults.poolUpdates);
      allUpdates = foundry.utils.mergeObject(allUpdates, poolUpdates);
    }

    // Apply actor-level updates first (HP/strain + pools)
    if (Object.keys(allUpdates).length > 0) {
      await this.parent.update(allUpdates);
    }

    // Apply item-level updates (consumptions, prepared flags) via embedded document updates
    if (refreshResults.itemUpdates && Object.keys(refreshResults.itemUpdates).length > 0) {
      await this._updateEmbeddedItemsFromFlattened(refreshResults.itemUpdates);
    }
    
    // Create standardized result
    const result = this._createRefreshResult('rest', {
      health: { old: oldHP, new: newHP },
      strain: { old: oldStrain, new: newStrain },
      isFrail,
      pools: refreshResults.poolsRefreshed,
      effortReleased: refreshResults.effortReleased,
      powersUnprepared: refreshResults.powersUnprepared,
      consumptionRefreshed: refreshResults.consumptionRefreshed
    });
    
    // Create chat message using standardized formatter
    await this._createStandardizedChatMessage(result);
    
    return result;
  }

  /**
   * Handle end of scene refresh (scene cadence refresh)
   * @returns {Promise<RefreshResult>} Scene refresh results in standardized format
   */
  async endScene() {
    // Collect all updates in single object
    let allUpdates = {};
    
    // Collect pool updates and item updates from refresh logic
    const refreshResults = await this._collectRefreshUpdates('scene');
    
    // Merge pool updates into actor-level update payload
    if (refreshResults.poolUpdates && Object.keys(refreshResults.poolUpdates).length > 0) {
      const poolUpdates = foundry.utils.expandObject(refreshResults.poolUpdates);
      allUpdates = foundry.utils.mergeObject(allUpdates, poolUpdates);
    }

    // Apply actor-level updates first (pools)
    if (Object.keys(allUpdates).length > 0) {
      await this.parent.update(allUpdates);
    }

    // Apply item-level updates (consumptions) via embedded document updates
    if (refreshResults.itemUpdates && Object.keys(refreshResults.itemUpdates).length > 0) {
      await this._updateEmbeddedItemsFromFlattened(refreshResults.itemUpdates);
    }
    
    // Create standardized result
    const result = this._createRefreshResult('scene', {
      pools: refreshResults.poolsRefreshed,
      effortReleased: refreshResults.effortReleased,
      consumptionRefreshed: refreshResults.consumptionRefreshed
    });
    
    // Create chat message using standardized formatter
    await this._createStandardizedChatMessage(result);
    
    return result;
  }

  /**
   * Collect all refresh updates without applying them
   * @param {string} cadence - The cadence to refresh ('scene' or 'day')
   * @returns {Promise<Object>} Object containing poolUpdates, itemUpdates, and effortReleased
   * @private
   */
  async _collectRefreshUpdates(cadence) {
    const pools = this.parent.system.pools || {};
    const commitments = this.parent.system.effortCommitments || {};
    const poolUpdates = {};
    const itemUpdates = {};
    const newCommitments = foundry.utils.deepClone(commitments);
    let effortReleased = [];
    
    // Process each pool
    for (const [poolKey, poolData] of Object.entries(pools)) {
      let totalCommittedLocal = null; // track committed for this pool if computed
      // Handle effort commitments for effort pools
      if (newCommitments[poolKey]) {
        const remainingCommitments = [];
        const releasedCommitments = [];
        
        for (const commitment of newCommitments[poolKey]) {
          let shouldRelease = false;
          
          // Never auto-release "commit" duration - those are manual only
          if (commitment.duration === "commit") {
            shouldRelease = false;
          } else if (cadence === "scene" && commitment.duration === "scene") {
            shouldRelease = true;
          } else if (cadence === "day" && (commitment.duration === "day" || commitment.duration === "scene")) {
            shouldRelease = true;
          }

          if (!shouldRelease) {
            remainingCommitments.push(commitment);
          } else {
            effortReleased.push(`${commitment.powerName} (${commitment.amount} ${poolKey})`);
          }
        }
        
        newCommitments[poolKey] = remainingCommitments;
        
        // Recalculate available effort
        const totalCommitted = remainingCommitments.reduce((sum, c) => sum + c.amount, 0);
        totalCommittedLocal = totalCommitted;
        const availableEffort = Math.max(0, poolData.max - totalCommitted);
        
        poolUpdates[`system.pools.${poolKey}.value`] = availableEffort;
        poolUpdates[`system.pools.${poolKey}.committed`] = totalCommitted;
        poolUpdates[`system.pools.${poolKey}.commitments`] = remainingCommitments;
      } 
      // Handle regular pool refresh
      else if (poolData.cadence === cadence) {
        poolUpdates[`system.pools.${poolKey}.value`] = poolData.max;
      }
      
      // Reset temp modifiers based on cadence and adjust value/max accordingly
      const sourcePoolData = this.parent._source.system.pools?.[poolKey];
      let didResetTemp = false;
      if (cadence === "scene") {
        // Scene refresh: reset scene temp modifiers
        if ((sourcePoolData?.tempScene || 0) !== 0) {
          poolUpdates[`system.pools.${poolKey}.tempScene`] = 0;
          didResetTemp = true;
        }
      } else if (cadence === "day") {
        // Day refresh: reset both scene and day temp modifiers
        if ((sourcePoolData?.tempScene || 0) !== 0) {
          poolUpdates[`system.pools.${poolKey}.tempScene`] = 0;
          didResetTemp = true;
        }
        if ((sourcePoolData?.tempDay || 0) !== 0) {
          poolUpdates[`system.pools.${poolKey}.tempDay`] = 0;
          didResetTemp = true;
        }
      }

      if (didResetTemp) {
        const oldCommit = Number(sourcePoolData?.tempCommit) || 0;
        const oldScene = Number(sourcePoolData?.tempScene) || 0;
        const oldDay = Number(sourcePoolData?.tempDay) || 0;
        const oldTempSum = oldCommit + oldScene + oldDay;

        const newCommit = oldCommit; // commit temp persists across refreshes
        const newScene = (cadence === "scene" || cadence === "day") ? 0 : oldScene;
        const newDay = (cadence === "day") ? 0 : oldDay;
        const newTempSum = newCommit + newScene + newDay;

        const currentMax = Number(poolData.max) || 0;
        const baseMax = Math.max(0, currentMax - oldTempSum);
        const newMax = Math.max(0, baseMax + newTempSum);
        poolUpdates[`system.pools.${poolKey}.max`] = newMax;

        const valueKey = `system.pools.${poolKey}.value`;
        const interimValue = (valueKey in poolUpdates) ? Number(poolUpdates[valueKey]) : (Number(poolData.value) || 0);

        let newValue;
        if (totalCommittedLocal !== null) {
          newValue = Math.max(0, newMax - totalCommittedLocal);
        } else if (poolData.cadence === cadence) {
          newValue = newMax;
        } else {
          const delta = newTempSum - oldTempSum;
          newValue = Math.max(0, Math.min(interimValue + delta, newMax));
        }
        poolUpdates[valueKey] = newValue;
      }
    }
    
    poolUpdates["system.effortCommitments"] = newCommitments;
    
    // Collect item updates (consumption uses and prepared powers)
    let consumptionRefreshed = [];
    let powersUnprepared = [];
    
    const cadenceLevel = CONFIG.SWN.poolCadences.indexOf(cadence);
    if (cadenceLevel >= 0) {
      // Collect consumption use updates
      const consumptionResult = await this._collectConsumptionUseUpdates(cadenceLevel);
      Object.assign(itemUpdates, consumptionResult.updates);
      consumptionRefreshed = consumptionResult.consumptionRefreshed;
      
      // Collect prepared power updates (only on day rest)
      if (cadence === "day") {
        const preparedResult = await this._collectPreparedPowerUpdates();
        Object.assign(itemUpdates, preparedResult.updates);
        powersUnprepared = preparedResult.powersUnprepared;
      }
    }
    
    // Collect structured refresh data for result formatting
    const poolsRefreshed = [];
    
    // Extract pool refresh data from poolUpdates
    for (const [updateKey, newValue] of Object.entries(poolUpdates)) {
      if (updateKey.startsWith('system.pools.') && updateKey.endsWith('.value')) {
        const poolKey = updateKey.replace('system.pools.', '').replace('.value', '');
        const poolData = pools[poolKey];
        if (poolData && poolData.value !== newValue) {
          poolsRefreshed.push({
            key: poolKey,
            oldValue: poolData.value,
            newValue: newValue,
            max: poolData.max,
            cadence: poolData.cadence
          });
        }
      }
    }
    
    // Structured data is now populated by the helper methods above
    
    return {
      poolUpdates,
      itemUpdates,
      effortReleased,
      poolsRefreshed,
      consumptionRefreshed,
      powersUnprepared
    };
  }
  
  /**
   * Collect consumption use refresh updates without applying them
   * @param {number} cadenceLevel - Numeric cadence level
   * @returns {Promise<Object>} Object with updates and structured data
   * @private
   */
  async _collectConsumptionUseUpdates(cadenceLevel) {
    const updates = {};
    const consumptionRefreshed = [];
    
    // Check all power items for consumption uses that need refreshing
    for (const item of this.parent.items) {
      if (item.type !== "power") continue;
      
      const power = item.system;
      let itemHadUpdates = false;
      // Start from the existing array to avoid sparse/invalid updates in v13
      const updatedConsumptions = foundry.utils.deepClone(power.consumptions || []);
      // Check consumption array for "uses" type consumptions
      if (power.consumptions && Array.isArray(power.consumptions)) {
        for (let i = 0; i < power.consumptions.length; i++) {
          const consumption = power.consumptions[i];
          if (consumption.type === "uses" && consumption.cadence) {
            const consumptionCadenceLevel = globalThis.swnr.utils.getCadenceLevel(consumption.cadence);
            if (consumptionCadenceLevel <= cadenceLevel && consumption.uses.value < consumption.uses.max) {
              // Update the cloned array element safely
              if (!updatedConsumptions[i]) updatedConsumptions[i] = { type: "uses", uses: { value: 0, max: 1 } };
              updatedConsumptions[i].type = "uses";
              updatedConsumptions[i].uses = {
                ...(updatedConsumptions[i].uses || { value: 0, max: 1 }),
                value: consumption.uses.max,
                max: consumption.uses.max
              };
              
              // Track for structured result
              consumptionRefreshed.push({
                powerName: item.name,
                consumptionIndex: i,
                oldValue: consumption.uses.value,
                newValue: consumption.uses.max,
                cadence: consumption.cadence
              });
              itemHadUpdates = true;
            }
          }
        }
      }

      // If any updates were made for this item, set the full array update
      if (itemHadUpdates) {
        updates[`items.${item.id}.system.consumptions`] = updatedConsumptions;
      }
    }
    
    return { updates, consumptionRefreshed };
  }

  /**
   * Convert flattened `items.{id}.<path>` updates into updateEmbeddedDocuments payloads
   * and apply them to the actor's embedded Items.
   * @param {Object} flatItemUpdates - Object where keys start with `items.{id}.`
   * @private
   */
  async _updateEmbeddedItemsFromFlattened(flatItemUpdates) {
    if (!flatItemUpdates || Object.keys(flatItemUpdates).length === 0) return;

    // Group updates by item id
    const byItem = new Map();
    for (const [key, value] of Object.entries(flatItemUpdates)) {
      const parts = key.split(".");
      if (parts.length < 3 || parts[0] !== "items") continue; // skip invalid keys
      const itemId = parts[1];
      const itemPath = parts.slice(2).join(".");
      if (!byItem.has(itemId)) byItem.set(itemId, { _id: itemId });
      byItem.get(itemId)[itemPath] = value;
    }

    const payload = Array.from(byItem.values());
    if (payload.length > 0) {
      await this.parent.updateEmbeddedDocuments('Item', payload);
    }
  }
  
  /**
   * Collect prepared power unprepare updates without applying them
   * @returns {Promise<Object>} Object with updates and structured data
   * @private
   */
  async _collectPreparedPowerUpdates() {
    const updates = {};
    const powersUnprepared = [];
    
    // Check all power items for prepared powers
    for (const item of this.parent.items) {
      if (item.type !== "power") continue;
      
      const power = item.system;
      
      // If power is prepared, unprepare it
      if (power.prepared) {
        updates[`items.${item.id}.system.prepared`] = false;
        
        // Track for structured result
        powersUnprepared.push({
          id: item.id,
          name: item.name,
          hadResourceCost: power.hasConsumption && power.hasConsumption()
        });
        
        // Also reset any preparation-based internal uses (spendOnPrep: true uses)
        if (power.consumptions && Array.isArray(power.consumptions)) {
          for (let i = 0; i < power.consumptions.length; i++) {
            const consumption = power.consumptions[i];
            if (consumption.type === "uses" && consumption.spendOnPrep && consumption.uses) {
              // Reset prep-based uses to maximum
              updates[`items.${item.id}.system.consumptions.${i}.uses.value`] = consumption.uses.max;
            }
          }
        }
      }
    }
    
    return { updates, powersUnprepared };
  }
  
  /**
   * Create a standardized RefreshResult object
   * @param {'rest'|'scene'} type - The type of refresh operation
   * @param {Object} changes - The changes that occurred
   * @returns {RefreshResult} Standardized result object
   * @private
   */
  _createRefreshResult(type, changes = {}) {
    return {
      type,
      actor: this.parent,
      changes: {
        health: changes.health || null,
        strain: changes.strain || null,
        pools: changes.pools || [],
        effortReleased: changes.effortReleased || [],
        powersUnprepared: changes.powersUnprepared || [],
        consumptionRefreshed: changes.consumptionRefreshed || []
      },
      // Additional metadata
      isFrail: changes.isFrail || false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a chat message from a standardized RefreshResult
   * @param {RefreshResult} result - The refresh result object
   * @private
   */
  async _createStandardizedChatMessage(result) {
    // Skip if no meaningful changes occurred
    if (!this._hasSignificantChanges(result)) {
      return;
    }

    const chatMessage = getDocumentClass("ChatMessage");
    const content = this._formatRefreshChatMessage(result);
    
    await chatMessage.create({
      speaker: chatMessage.getSpeaker({ actor: this.parent }),
      content: content
    });
  }

  /**
   * Check if a refresh result has significant changes worth reporting
   * @param {RefreshResult} result - The refresh result to check
   * @returns {boolean} True if there are significant changes
   * @private
   */
  _hasSignificantChanges(result) {
    const { changes } = result;
    
    // Health/strain changes are always significant
    if (changes.health && changes.health.old !== changes.health.new) return true;
    if (changes.strain && changes.strain.old !== changes.strain.new) return true;
    
    // Pool changes
    if (changes.pools && changes.pools.length > 0) return true;
    
    // Effort releases
    if (changes.effortReleased && changes.effortReleased.length > 0) return true;
    
    // Power changes
    if (changes.powersUnprepared && changes.powersUnprepared.length > 0) return true;
    if (changes.consumptionRefreshed && changes.consumptionRefreshed.length > 0) return true;
    
    return false;
  }

  /**
   * Format a refresh result into HTML for chat messages
   * @param {RefreshResult} result - The refresh result to format
   * @returns {string} HTML content for the chat message
   * @private
   */
  _formatRefreshChatMessage(result) {
    const { type, changes } = result;
    
    // Title based on refresh type
    const titleKey = type === 'rest' ? 
      (result.isFrail ? 'swnr.pools.refreshSummary.frailRest' : 'swnr.pools.refreshSummary.day') :
      'swnr.pools.refreshSummary.scene';
    const title = game.i18n.localize(titleKey) || 
      (type === 'rest' ? 'Rest for the Night' : 'End of Scene');
    
    let content = `<div class="refresh-summary">
      <h3><i class="fas fa-sync"></i> ${title}</h3>`;
    
    // Health and strain changes (rest only)
    if (type === 'rest') {
      if (changes.health) {
        const hpChange = changes.health.new - changes.health.old;
        if (hpChange > 0) {
          content += `<p><strong>Health recovered:</strong> ${changes.health.old} → ${changes.health.new} (+${hpChange})</p>`;
        } else if (result.isFrail) {
          content += `<p><em>No health recovery (frail rest)</em></p>`;
        }
      }
      
      if (changes.strain) {
        const strainChange = changes.strain.old - changes.strain.new;
        if (strainChange > 0) {
          content += `<p><strong>System strain reduced:</strong> ${changes.strain.old} → ${changes.strain.new} (-${strainChange})</p>`;
        }
      }
    }
    
    // Pool refreshes
    if (changes.pools && changes.pools.length > 0) {
      content += `<p><strong>Pools refreshed:</strong></p><ul>`;
      changes.pools.forEach(pool => {
        content += `<li>${pool.key}: ${pool.oldValue} → ${pool.newValue}</li>`;
      });
      content += `</ul>`;
    }
    
    // Effort releases
    if (changes.effortReleased && changes.effortReleased.length > 0) {
      content += `<p><strong>Effort released:</strong></p><ul>`;
      changes.effortReleased.forEach(release => {
        content += `<li>${release}</li>`;
      });
      content += `</ul>`;
    }
    
    // Powers unprepared (day rest only)
    if (changes.powersUnprepared && changes.powersUnprepared.length > 0 && type === 'rest') {
      content += `<p><strong>Powers unprepared:</strong></p><ul>`;
      changes.powersUnprepared.forEach(power => {
        content += `<li>${power.name}</li>`;
      });
      content += `</ul>`;
    }
    
    // Consumption refreshes
    if (changes.consumptionRefreshed && changes.consumptionRefreshed.length > 0) {
      content += `<p><strong>Power uses refreshed:</strong></p><ul>`;
      changes.consumptionRefreshed.forEach(consumption => {
        content += `<li>${consumption.powerName}: ${consumption.oldValue} → ${consumption.newValue}</li>`;
      });
      content += `</ul>`;
    }
    
    content += `</div>`;
    return content;
  }

}
