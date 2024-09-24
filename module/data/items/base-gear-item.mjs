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
    const locations = Object.keys(CONFIG.SWN.itemLocations)
    schema.location = SWNShared.stringChoices("stowed" , locations);
    schema.quality = SWNShared.requiredString("stock");
    schema.noEncReadied = new fields.BooleanField({initial: false});
    return schema;
  }
}
