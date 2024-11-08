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
    const armorTypes = ["street", "combat", "powered", "primitive"];
    schema.armorType = SWNShared.stringChoices("street", armorTypes);
    schema.skillBonus = SWNShared.requiredNumber(0);
    schema.attacks = new fields.SchemaField({
      damage: SWNShared.requiredString("d6"),
      bonusDamage: SWNShared.requiredNumber(0),
      number: SWNShared.requiredNumber(0),
    });
    schema.hitDice = SWNShared.requiredString("1d8");
    schema.saves = SWNShared.requiredNumber(0);
    schema.moralScore = SWNShared.requiredNumber(6);
    const reactionTypes = ["hostile", "neutral", "friendly", "unknown", "negative", "positive"];
    schema.reaction = SWNShared.stringChoices("unknown", reactionTypes);
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
    super.prepareDerivedData();
    this.xp = 11;//TODO remove
  }

  rollSave(saveType) {
    alert("TODO");
  }
}
