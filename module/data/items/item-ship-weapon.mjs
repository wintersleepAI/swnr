import SWNVehicleItemBase from './base-ship.mjs';
import SWNShared from '../shared.mjs';

export default class SWNShipWeapon extends SWNVehicleItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.vehiclebase',
    'SWN.Item.ShipWeapon',
  ];

  static defineSchema() {
    const schema = super.defineSchema();
    schema.damage = SWNShared.requiredString("1d6");
    schema.hardpoint = SWNShared.requiredNumber(1);
    schema.qualities = SWNShared.requiredString("");
    return schema;
  }
}
