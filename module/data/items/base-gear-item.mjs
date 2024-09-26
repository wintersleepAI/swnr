import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNBaseGearItem extends SWNItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.quantity = SWNShared.requiredNumber(1);  
    schema.bundle = new fields.SchemaField({
      bundled: new fields.BooleanField({initial: false}),
      amount: SWNShared.nullableNumber()
    });
    schema.encumbrance = SWNShared.requiredNumber(1);
    schema.cost = SWNShared.requiredNumber(0);
    schema.tl = new fields.NumberField({ required: false, nullable: true, integer: true,min: 0, max: CONFIG.SWN.maxTL });
    schema.location = SWNShared.stringChoices("stowed", CONFIG.SWN.itemLocations);
    schema.quality = SWNShared.stringChoices("stock", CONFIG.SWN.itemQualities);
    schema.noEncReadied = new fields.BooleanField({initial: false});
    return schema;
  }
}
