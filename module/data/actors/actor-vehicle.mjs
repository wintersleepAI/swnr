import SWNVehicleBase from './base-vehicle.mjs';

export default class SWNVehicle extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Vehicle',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    return schema;
  }

  prepareDerivedData() {
  }
}
