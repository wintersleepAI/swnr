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

    /**
     * Pool configuration for features that grant resource pools to characters.
     * 
     * This system allows features (like foci, edges, etc.) to grant resource pools
     * that characters can use to power abilities. Each pool has a unique key format
     * of "ResourceName:SubResource" (e.g., "Effort:Psychic", "Slots:Lv3").
     * 
     * Pool calculation flow:
     * 1. Formula is evaluated to determine pool size (required)
     * 2. If condition is provided, pool is only granted when condition is true
     * 3. Final pool value is stored in actor.system.pools[poolKey]
     */
    schema.poolsGranted = new fields.ArrayField(new fields.SchemaField({
      // Main resource type - determines the pool category
      resourceName: new fields.StringField({
        choices: CONFIG.SWN.poolResourceNames, // ["Effort", "Slots", "Points", "Strain", "Uses"]
        initial: "Effort"
      }),
      // Sub-resource identifier - creates unique pool keys when combined with resourceName
      // Examples: "Psychic" for "Effort:Psychic", "Lv3" for "Slots:Lv3", "" for "Effort:"
      subResource: new fields.StringField({
        initial: ""
      }),
      // How often the pool refreshes - determines when resources regenerate
      cadence: new fields.StringField({
        choices: CONFIG.SWN.poolCadences, // ["commit", "scene", "day"]
        initial: "day"
      }),
      // Formula for dynamic calculation (required)
      // Can reference @level, @stats.cha.mod, etc. (e.g., "1 + @level", "@level + @stats.cha.mod")
      formula: new fields.StringField({
        initial: "1"
      }),
      // Optional: Condition that must be met for pool to be granted
      // Can reference @level, stats, etc. (e.g., "@level >= 3")
      condition: new fields.StringField({
        initial: ""
      })
    }), { initial: [] });

    return schema;
  }
}
