import SWNVehicleItemBase from './base-ship.mjs';
import SWNShared from '../shared.mjs';

export default class SWNShipFitting extends SWNVehicleItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.ShipFitting',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.effect = SWNShared.requiredString("");
    return schema;
  }
}
