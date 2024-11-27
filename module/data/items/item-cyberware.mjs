import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNCyberware extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Cyberware',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.tl = new fields.NumberField({ 
      required: false, 
      nullable: true, 
      integer: true, 
      initial: 4, 
      min: 0, 
      max: CONFIG.SWN.maxTL 
    });
    schema.cost = SWNShared.requiredNumber(0);
    schema.strain = SWNShared.requiredNumber(1, 0, false);
    schema.disabled = new fields.BooleanField({initial: false});
    schema.effect = SWNShared.requiredString("None");
    schema.type = SWNShared.stringChoices("none", CONFIG.SWN.cyberTypes);
    schema.concealment = SWNShared.stringChoices("sight", CONFIG.SWN.cyberConcealmentTypes);
    schema.complication = SWNShared.requiredString("");
    schema.settings = SWNShared.requiredString("");
    return schema;
  }
}
