import SWNVehicleBase from './base-vehicle.mjs';

export default class SWNShip extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Ship',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    return schema;
  }

  prepareDerivedData() {
  }
}
