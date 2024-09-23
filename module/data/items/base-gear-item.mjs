import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNBaseGearItem extends SWNItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.encumbrance = SWNShared.requiredNumber(1);
    schema.cost = SWNShared.requiredNumber(0);
    schema.tl = new fields.NumberField({ required: false, nullable: true, integer: true,min: 0, max: 6});;
    schema.location = SWNShared.requiredString("stowed");
    schema.quality = SWNShared.requiredString("stock");
    schema.noEncReadied = new fields.BooleanField({initial: false});
    return schema;
  }
}
