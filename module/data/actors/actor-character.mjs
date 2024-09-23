import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

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
          temp: SWNShared.requiredNumber(0),
        });
        return obj;
      }, {})
    );

    schema.level = new fields.SchemaField({
      value: SWNShared.requiredNumber(1),
      exp: SWNShared.requiredNumber(0),
      expToLevel: SWNShared.requiredNumber(3)
    });
    schema.goals = SWNShared.requiredString("");
    schema.class = SWNShared.requiredString("");
    schema.species = SWNShared.requiredString("");
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

    schema.tweak = new fields.SchemaField({
      advInit: new fields.BooleanField({initial: false}),
      quickSkill1: SWNShared.emptyString(),
      quickSkill2: SWNShared.emptyString(),
      quickSkill3: SWNShared.emptyString(),
      extraEffortName: SWNShared.emptyString(),
      extraEffort: new fields.SchemaField({
        bonus: SWNShared.requiredNumber(0),
        current: SWNShared.requiredNumber(0),
        scene: SWNShared.requiredNumber(0),
        day: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0)
      }),
      showResourceList: new fields.BooleanField({initial: false}),
      resourceList: new fields.ArrayField(new fields.SchemaField({
        name: SWNShared.emptyString(),
        value: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0),
      })),
      debtDisplay: SWNShared.emptyString(),
      owedDisplay: SWNShared.emptyString(),
      balanceDisplay: SWNShared.emptyString(),
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareBaseData();
    // Loop through stat scores, and add their modifiers to our sheet output.
    for (const key in this.stats) {
      this.stats[key].baseTotal = this.stats[key].base + this.stats[key].boost;
      this.stats[key].total = this.stats[key].baseTotal + this.stats[key].temp;
      const v = (this.stats[key].total - 10.5) / 3.5;
      this.stats[key].mod =
        Math.min(2, Math.max(-2, Math[v < 0 ? "ceil" : "floor"](v))) + this.stats[key].bonus;
      
      // Handle stat label localization.
      this.stats[key].label =
        game.i18n.localize(CONFIG.SWN.stats[key]) ?? key;
    }
    /*
    schema.encumbrance =; // TODO


    itemTypes;

    save: {
      physical?: number;
      evasion?: number;
      mental?: number;
      luck?: number;
    };
    */
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

    return data;
  }
}
