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
