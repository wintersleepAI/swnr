import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNProgram extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Program',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.cost = new fields.NumberField({initial: 0});
    schema.type = SWNShared.stringChoices("dataFile", CONFIG.SWN.programTypes, true);
    schema.accessCost = new fields.NumberField({initial: 0});
    schema.target = new fields.StringField({initial: ""});
    schema.selfTerminating = new fields.BooleanField({initial: false});
    schema.useAffects = new fields.StringField({initial: ""});
    schema.skillCheckMod = new fields.NumberField({initial: 0})

    return schema;
  }

}
