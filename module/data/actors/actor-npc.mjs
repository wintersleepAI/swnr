import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

export default class SWNNPC extends SWNActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.NPC',
  ];
  //Regexs for parsing hit dice
  static numberRegex = /^\d+$/;
  static hitDiceD8Regex = /^\d+d$/;
  static hitDiceRegex = /^\d+[Dd]\d+$/;
  static hpRegex = /^\d+\s?[hH][pP]\s?$/;

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.armorType = SWNShared.stringChoices("street", CONFIG.SWN.armorTypes);
    schema.skillBonus = SWNShared.requiredNumber(0);
    schema.attacks = new fields.SchemaField({
      damage: SWNShared.requiredString("d6"),
      bonusDamage: SWNShared.requiredNumber(0),
      number: SWNShared.requiredNumber(0),
    });
    schema.hitDice = SWNShared.requiredString("1d8");
    schema.saves = SWNShared.requiredNumber(0);
    schema.moralScore = SWNShared.requiredNumber(6);
    schema.reaction = SWNShared.stringChoices("unknown", CONFIG.SWN.reactionTypes);
    schema.homeworld = SWNShared.emptyString();
    schema.faction = SWNShared.emptyString();
    //TODO contents to HTML?
    schema.notes = new fields.SchemaField({
      left: new fields.SchemaField({
        label: SWNShared.emptyString(),
        contents: SWNShared.emptyString(),
      }),
      right: new fields.SchemaField({
        label: SWNShared.emptyString(),
        contents: SWNShared.emptyString(),
      }),
      public: new fields.SchemaField({
        label: SWNShared.emptyString(),
        contents: SWNShared.emptyString(),
      })
    });
    schema.baseSoakTotal = new fields.SchemaField({
      value: SWNShared.requiredNumber(0),
      max: SWNShared.requiredNumber(0),
    });

    return schema;
  }

  prepareDerivedData() {
    // Any derived data should be calculated here and added to "this."
    super.prepareDerivedData();

    const effort = this.effort;
    
    // Skip effort calculations if effort field is undefined (during migration)
    if (effort) {
      effort.max = effort.bonus;
      effort.value = effort.bonus - effort.current - effort.scene - effort.day;
      effort.percentage = Math.clamp((effort.value * 100) / effort.max, 0, 100);
    }

    this.ac = this.baseAc;
    this.soakTotal = {
      value: 0,
      max: 0,
    };
    if (this.baseSoakTotal.max > 0) {
      this.soakTotal.max += this.baseSoakTotal.max;
    }
    if (this.baseSoakTotal.value > 0) {
      this.soakTotal.value += this.baseSoakTotal.value;
    }
    const useCWNArmor = game.settings.get("swnr", "useCWNArmor") ? true : false;
    const useTrauma = game.settings.get("swnr", "useTrauma") ? true : false;
    if (useTrauma) {
      this.modifiedTraumaTarget = this.traumaTarget;
    }
    if (useCWNArmor) {
      const armor = this.parent.items.filter((i) => i.type === "armor");
      for (const a of armor) {
        if (a.system.soak.max > 0) {
          this.soakTotal.value += a.system.soak.value;
          this.soakTotal.max += a.system.soak.max;
        }
        if (useTrauma) {
          this.modifiedTraumaTarget += a.system.traumaDiePenalty;
        }
      }
    }

    // Calculate resource pools from Features/Foci/Edges
    this._calculateResourcePools();
  }

  /**
   * Calculate resource pools based on Features, Foci, and Edges (same as Character)
   * @private
   */
  _calculateResourcePools() {
    const pools = {};
    
    // Get all features that might grant pools
    const poolGrantingItems = this.parent.items.filter(item => 
      item.type === "feature" && 
      item.system.poolsGranted && 
      item.system.poolsGranted.length > 0
    );

    for (const feature of poolGrantingItems) {
      for (const poolConfig of feature.system.poolsGranted) {
        // Check condition if specified (NPCs use hit dice instead of level)
        if (poolConfig.condition && !this._evaluateCondition(poolConfig.condition)) {
          continue;
        }

        // Build pool key
        const poolKey = `${poolConfig.resourceName}:${poolConfig.subResource || ""}`;
        
        // Calculate pool maximum
        let maxValue = 0;
        
        // For NPCs, use hit dice number for level-based calculations
        const effectiveLevel = this._extractHitDiceNumber();
        
        // Use formula if specified, otherwise fall back to legacy base + per-level
        if (poolConfig.formula) {
          try {
            const formulaResult = this._evaluateFormula(poolConfig.formula, effectiveLevel);
            maxValue = formulaResult;
          } catch (error) {
            console.warn(`[SWN Pool] Failed to evaluate formula "${poolConfig.formula}" for ${feature.name}:`, error);
            // Fall back to legacy calculation on formula error
            maxValue = (poolConfig.baseAmount || 0) + ((poolConfig.perLevel || 0) * effectiveLevel);
          }
        } else {
          // Legacy base + per-level calculation
          maxValue = (poolConfig.baseAmount || 0) + ((poolConfig.perLevel || 0) * effectiveLevel);
        }

        // Initialize or update pool
        if (pools[poolKey]) {
          // Pool already exists from another feature, add to max
          pools[poolKey].max += maxValue;
        } else {
          // Create new pool, preserving current value if it exists
          const currentValue = this.pools[poolKey]?.value || 0;
          pools[poolKey] = {
            value: Math.min(currentValue, maxValue), // Don't exceed new max
            max: maxValue,
            cadence: poolConfig.cadence
          };
        }
      }
    }

    // Update the pools object
    this.pools = pools;
  }

  /**
   * Extract hit dice number for level-based calculations
   * @returns {number} The number of hit dice as effective level
   * @private
   */
  _extractHitDiceNumber() {
    const hitDice = this.hitDice;
    if (SWNNPC.numberRegex.test(hitDice)) {
      return parseInt(hitDice);
    } else if (SWNNPC.hitDiceD8Regex.test(hitDice)) {
      return parseInt(hitDice.replace('d', ''));
    } else if (SWNNPC.hitDiceRegex.test(hitDice)) {
      return parseInt(hitDice.split('d')[0]);
    } else if (SWNNPC.hpRegex.test(hitDice)) {
      return Math.floor(parseInt(hitDice.toLowerCase().replace(/hp/g, '').trim()) / 4); // Rough HP to level conversion
    }
    return 1; // Default to 1 if can't parse
  }

  /**
   * Evaluate a condition string for NPCs (simplified, no stats)
   * @param {string} condition - The condition to evaluate
   * @returns {boolean} - Whether the condition is met
   * @private
   */
  _evaluateCondition(condition) {
    try {
      const effectiveLevel = this._extractHitDiceNumber();
      // Simple variable substitution for NPCs
      let expr = condition
        .replace(/@level/g, effectiveLevel)
        .replace(/@hitdice/g, effectiveLevel);
      
      // Basic safety check
      if (!/^[\d\s+\-*/()>=<!&|.]+$/.test(expr)) {
        console.warn(`[SWN Pool] Unsafe condition: ${condition}`);
        return false;
      }
      
      return new Function('return ' + expr)();
    } catch (error) {
      console.warn(`[SWN Pool] Failed to evaluate condition "${condition}":`, error);
      return false;
    }
  }

  /**
   * Evaluate a formula string for NPCs (simplified, no stats)
   * @param {string} formula - The formula to evaluate
   * @param {number} effectiveLevel - The NPC's effective level
   * @returns {number} - The calculated value
   * @private
   */
  _evaluateFormula(formula, effectiveLevel) {
    // Validate formula contains only allowed patterns before substitution
    const allowedPattern = /^[@\w\s+\-*/().MathMaxinflorceliwStrgmn,._]+$/;
    if (!allowedPattern.test(formula)) {
      throw new Error(`Unsafe formula: ${formula}`);
    }
    
    // Get psychic skills for NPCs (if they have any)
    const psychicSkills = this.parent.items.filter(
      (i) =>
        i.type === "skill" &&
        i.system.source.toLocaleLowerCase() ===
          game.i18n.localize("swnr.skills.labels.psionic").toLocaleLowerCase()
    );
    const highestPsychicSkill = Math.max(0, ...psychicSkills.map((i) => i.system.rank));
    
    // Simple variable substitution for NPCs
    let expr = formula
      .replace(/@level/g, effectiveLevel)
      .replace(/@hitdice/g, effectiveLevel)
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
    
    const result = new Function('return ' + expr)();
    return Math.max(0, Math.floor(result));
  }

  async rollSave(_saveType) {
    const roll = new Roll("1d20");
    await roll.roll();
    const flavor = game.i18n.format(
      parseInt(roll.result) >= this.saves
        ? game.i18n.localize("swnr.npc.saving.success")
        : game.i18n.localize("swnr.npc.saving.failure"),
      { actor: this.parent.name, target: this.saves }
    );
    roll.toMessage({ flavor, speaker: { actor: this.id } });
  }

  async rollMorale() {
    const roll = new Roll("2d6");
    await roll.roll();
    const flavor =
      +(roll.terms[0]?.total ?? 0) > this.moralScore
        ? game.i18n.localize("swnr.npc.morale.failure")
        : game.i18n.localize("swnr.npc.morale.success");
    roll.toMessage({ flavor, speaker: { actor: this.id } });
  }

  // Set the max/value health based on D8 hit dice
  async rollHitDice(forceDieRoll = false) {
    if (
      !forceDieRoll &&
      this.health_max_modified &&
      this.health.max >= 0
    ) {
      //For debug: console.log("You have modified the NPCs max health. Not rolling");
      return;
    }
    let hitDice = this.hitDice;
    if (hitDice == null || hitDice == "0" || hitDice == "") {
      return;
    }
    if (hitDice.includes("+")) {
      const split = hitDice.split("+", 2);
      hitDice = split[0].trim();
      if (split.length > 1) {
        const soak = split[1].trim();
        if (SWNNPC.numberRegex.test(soak)) {
          if (game.settings.get("swnr", "useCWNArmor") == false) {
            ui.notifications?.info(
              "NPC has soak, but CWN Armor is disabled. Ignoring soak"
            );
          } else {
            await this.parent.update({
              "system.baseSoakTotal.max": parseInt(soak),
              "system.baseSoakTotal.value": parseInt(soak),
            });
          }
        } else {
          ui.notifications?.error(
            "NPC soak must be a number, not " + soak + " Not rolling Hit Dice"
          );
          return;
        }
      }
    }
    //For debug: console.log("rolling NPC hit dice", this);
    let dieRoll = "";
    if (SWNNPC.numberRegex.test(hitDice)) {
      dieRoll = `${hitDice}d8`;
    } else if (SWNNPC.hitDiceD8Regex.test(hitDice)) {
      dieRoll = `${hitDice}8`;
    } else if (SWNNPC.hitDiceRegex.test(hitDice)) {
      dieRoll = `${hitDice}`;
    } else if (SWNNPC.hpRegex.test(hitDice)) {
      hitDice = hitDice.toLowerCase().split("hp")[0].trim();
      dieRoll = `${hitDice}`;
    } else {
      ui.notifications?.error(
        "NPC hit dice must be a number, Nd, NdX, N HP (where N/X are numbers)  not " +
          hitDice +
          " Not rolling Hit Dice"
      );
      return;
    }
    //For debug: console.log(`Updating health using ${hitDice} hit die. Roll ${dieRoll} `);

    const roll = new Roll(`${dieRoll}`);
    await roll.roll();
    if (roll != undefined && roll.total != undefined) {
      const newHealth = roll.total;
      await this.parent.update({
        "system.health.max": newHealth,
        "system.health.value": newHealth,
      });
    }
  }


}
