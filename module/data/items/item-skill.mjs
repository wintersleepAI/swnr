import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNSkill extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Skill',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.rank = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: -1,
      min: -1,
      max: 4,
    });

    schema.defaultStat =  SWNShared.stats("ask", false, true);

    schema.pool = new fields.StringField({
        required: true,
        nullable: false,
        initial: '2D6',
    });

    // Can possibly remove this field
    schema.source = new fields.StringField({
        required: false,
        nullable: false,
        initial: '',
    });
    

    return schema;
  }
}