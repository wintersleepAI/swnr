import SWNShared from '../shared.mjs';
import SWNItemBase from './base-item.mjs';

export default class SWNVehicleItemBase extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.vehiclebase'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.tl = SWNShared.techLevel(false);
    schema.cost = SWNShared.requiredNumber(0);
    schema.power = SWNShared.requiredNumber(1);
    schema.mass = SWNShared.requiredNumber(1);
    schema.costMultiplier = new fields.BooleanField({ initial: false });
    schema.powerMultiplier = new fields.BooleanField({ initial: false });
    schema.massMultiplier = new fields.BooleanField({ initial: false });
    schema.minClass = SWNShared.stringChoices("fighter", CONFIG.SWN.shipClasses);
    schema.broken = new fields.BooleanField({ initial: false });
    return schema;
  }
}
