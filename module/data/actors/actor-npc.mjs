import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

export default class SWNNPC extends SWNActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.NPC',
  ];

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
    effort.max = effort.bonus;
    effort.value = effort.bonus - effort.current - effort.scene - effort.day;
    effort.percentage = Math.clamp((effort.value * 100) / effort.max, 0, 100);

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

  rollSave(saveType) {
    alert("TODO");
  }
}
