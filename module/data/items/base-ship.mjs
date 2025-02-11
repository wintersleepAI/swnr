import SWNShared from '../shared.mjs';
import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNVehicleItemBase extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.vehiclebase'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.tl =  SWNShared.techLevel(false);
    schema.cost = SWNShared.requiredNumber(0);
    schema.power = SWNShared.requiredNumber(1);
    schema.mass = SWNShared.requiredNumber(1);
    schema.costMultiplier = new fields.BooleanField({initial: false});
    schema.powerMultiplier = new fields.BooleanField({initial: false});
    schema.massMultiplier = new fields.BooleanField({initial: false});
    schema.minClass = SWNShared.stringChoices("fighter", CONFIG.SWN.allVehicleClasses);
    schema.broken = new fields.BooleanField({initial: false});
    schema.destroyed = new fields.BooleanField({initial: false});
    schema.juryRigged = new fields.BooleanField({initial: false});
    schema.type = SWNShared.stringChoices("ship", CONFIG.SWN.vehicleTypes);
    return schema;
  }
}
