import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNPower extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.powerLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
      max: 5,
    });

    return schema;
  }
}
