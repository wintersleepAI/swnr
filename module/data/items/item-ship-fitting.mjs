import SWNVehicleItemBase from './base-ship.mjs';
import SWNShared from '../shared.mjs';

export default class SWNShipFitting extends SWNVehicleItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.vehiclebase',
    'SWN.Item.ShipFitting',
  ];

  static defineSchema() {
    const schema = super.defineSchema();
    schema.effect = SWNShared.requiredString("");

    return schema;
  }
}
