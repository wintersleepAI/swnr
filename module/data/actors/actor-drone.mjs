import SWNVehicleBase from './base-vehicle.mjs';

export default class SWNDrone extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Drone',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    return schema;
  }

  prepareDerivedData() {
  }
}
