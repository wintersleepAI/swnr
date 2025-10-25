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
    schema.tl =  SWNShared.techLevel(false);
    schema.location = SWNShared.stringChoices("stowed", CONFIG.SWN.itemLocations);
    schema.quality = SWNShared.stringChoices("stock", CONFIG.SWN.itemQualities);
    schema.noEncReadied = new fields.BooleanField({initial: false});
    schema.container = new fields.SchemaField({
      isContainer: new fields.BooleanField({initial: false}),
      isOpen: new fields.BooleanField({initial: true}),
      capacity: new fields.SchemaField({
        max: SWNShared.requiredNumber(0),
        value: SWNShared.requiredNumber(0)
      })
    });
    schema.containerId = new fields.StringField({blank: true});
    return schema;
  }
}
