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

    schema.featureTypes = SWNShared.stringChoices("focus", CONFIG.SWN.featureTypes);

    return schema;
  }
}
