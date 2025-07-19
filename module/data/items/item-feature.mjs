import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNFeature extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Feature',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.level = new fields.NumberField({
      required: true,
      nullable: true,
      integer: true,
      initial: 0
    });

    schema.type = SWNShared.stringChoices("focus", CONFIG.SWN.featureTypes);

    // Pool configuration for features that grant resource pools
    schema.poolsGranted = new fields.ArrayField(new fields.SchemaField({
      resourceName: new fields.StringField({
        choices: ["Effort", "Slots", "Points", "Strain", "Uses"],
        initial: "Effort"
      }),
      subResource: new fields.StringField({
        initial: ""
      }),
      baseAmount: new fields.NumberField({
        initial: 1,
        min: 0
      }),
      perLevel: new fields.NumberField({
        initial: 0,
        min: 0
      }),
      cadence: new fields.StringField({
        choices: ["commit", "scene", "day", "rest", "user"],
        initial: "day"
      }),
      // Formula for dynamic calculation (e.g., "@level + @stats.cha.mod")
      formula: new fields.StringField({
        initial: ""
      }),
      // Only grant pool if this condition is met (e.g., "@level >= 3")
      condition: new fields.StringField({
        initial: ""
      })
    }), { initial: [] });

    return schema;
  }
}
