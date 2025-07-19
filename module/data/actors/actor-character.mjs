import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';
import { calcMod } from '../../helpers/utils.mjs';

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
      extraEffortName: SWNShared.emptyString(),
      extraEffort: new fields.SchemaField({
        bonus: SWNShared.requiredNumber(0),
        current: SWNShared.requiredNumber(0),
        scene: SWNShared.requiredNumber(0),
        day: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0)
      }),
      extraHeader: SWNShared.emptyString(),
      showResourceList: new fields.BooleanField({initial: false}),
      showCyberware: new fields.BooleanField({initial: true}),
      showPowers: new fields.BooleanField({initial: true}),
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
    const effort = this.effort;
    const useCyber = game.settings.get("swnr", "useCWNCyber");
    const cyberStrain = useCyber ? this.systemStrain.cyberware : 0;
    
    // Skip effort calculations if effort field is undefined (during migration)
    if (effort) {
      effort.max =
        Math.max(
          1,
          1 +
            Math.max(this.stats.con.mod, this.stats.wis.mod) +
            Math.max(0, ...psychicSkills.map((i) => i.system.rank))
        ) +
        effort.bonus -
        cyberStrain;
      
      // Floor at 0.
      effort.max = Math.max(0, effort.max);
      
      effort.value = effort.max - effort.current - effort.scene - effort.day;
      effort.percentage = Math.clamp((effort.value * 100) / effort.max, 0, 100);
    }      
    // extra effort
    const extraEffort = this.tweak.extraEffort;
    extraEffort.value =
      extraEffort.max -
      extraEffort.current -
      extraEffort.scene -
      extraEffort.day -
      cyberStrain;

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

    data["lvl"] =this.level.value;
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
          speaker: ChatMessage.getSpeaker({ actor: this.parent }),
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
    const pools = {};
    
    // Get all features that might grant pools
    const poolGrantingItems = this.parent.items.filter(item => 
      item.type === "feature" && 
      item.system.poolsGranted && 
      item.system.poolsGranted.length > 0
    );
    

    for (const feature of poolGrantingItems) {
      for (const poolConfig of feature.system.poolsGranted) {
        // Check condition if specified
        if (poolConfig.condition && !this._evaluateCondition(poolConfig.condition)) {
          continue;
        }

        // Build pool key
        const poolKey = `${poolConfig.resourceName}:${poolConfig.subResource || ""}`;
        
        // Calculate pool maximum
        let maxValue = poolConfig.baseAmount;
        
        // Add per-level bonus
        if (poolConfig.perLevel > 0) {
          maxValue += poolConfig.perLevel * this.level.value;
        }
        
        // Apply formula if specified
        if (poolConfig.formula) {
          try {
            const formulaResult = this._evaluateFormula(poolConfig.formula);
            maxValue = formulaResult;
          } catch (error) {
            console.warn(`[SWN Pool] Failed to evaluate formula "${poolConfig.formula}" for ${feature.name}:`, error);
          }
        }

        // Initialize or update pool
        if (pools[poolKey]) {
          // Pool already exists from another feature, add to max
          pools[poolKey].max += maxValue;
        } else {
          // Calculate available effort (max - committed)
          const commitments = this.effortCommitments[poolKey] || [];
          const committedAmount = commitments.reduce((sum, commitment) => sum + commitment.amount, 0);
          const availableEffort = Math.max(0, maxValue - committedAmount);
          
          pools[poolKey] = {
            value: availableEffort,
            max: maxValue,
            cadence: poolConfig.cadence,
            committed: committedAmount,
            commitments: commitments
          };
        }
      }
    }

    // Update the pools object
    this.pools = pools;
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
    // Simple variable substitution
    let expr = formula
      .replace(/@level/g, this.level.value)
      .replace(/@stats\.(\w+)\.mod/g, (match, stat) => this.stats[stat]?.mod || 0)
      .replace(/@stats\.(\w+)\.total/g, (match, stat) => this.stats[stat]?.total || 0);
    
    // Basic safety check
    if (!/^[\d\s+\-*/().]+$/.test(expr)) {
      throw new Error(`Unsafe formula: ${formula}`);
    }
    
    // Use Function constructor for evaluation
    const result = new Function('return ' + expr)();
    return Math.max(0, Math.floor(result)); // Ensure non-negative integer
  }

}
