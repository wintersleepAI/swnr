import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';
import { SWN } from '../../helpers/config.mjs';

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
    schema.strain = SWNShared.requiredNumber(1,-20, false);
    schema.disabled = new fields.BooleanField({ initial: false });
    schema.effect = SWNShared.requiredString("None");
    schema.type = SWNShared.stringChoices("None", CONFIG.SWN.cyberTypes);
    schema.concealment = SWNShared.stringChoices("Sight", CONFIG.SWN.cyberConcealmentTypes);
    schema.complication = SWNShared.requiredString("");
    return schema;
  }

  prepareDerivedData() {
    //this.strain.value = this.strain.base;
  }

  static migrateData(data) {
    // Migrate lowercase type to capitalized type
    if (data.type != null && data.type.length > 0) {
      if (data.type[0] === data.type[0].toLowerCase()) {
        // Capitalize the first character and concatenate the rest of the string
        data.type = data.type.charAt(0).toUpperCase() + data.type.slice(1);
      }
    }
    if (data.concealment != null && data.concealment.length > 0) {
      if (data.concealment[0] === data.concealment[0].toLowerCase()) {
        // Capitalize the first character and concatenate the rest of the string
        data.concealment = data.concealment.charAt(0).toUpperCase() + data.concealment.slice(1);
      }
    }
    return data;
  }
}
