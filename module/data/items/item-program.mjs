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
    schema.cost = SWNShared.requiredNumber(0);
    schema.type = SWNShared.stringChoices("verb", CONFIG.SWN.programTypes, true);
    schema.accessCost = SWNShared.requiredNumber(0);
    schema.target = SWNShared.requiredString("");
    schema.selfTerminating = new fields.BooleanField({initial: false});
    schema.useAffects = SWNShared.requiredString("");
    schema.skillCheckMod = SWNShared.requiredNumber(0, -10);

    return schema;
  }
}
