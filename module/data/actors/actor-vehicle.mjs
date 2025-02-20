import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';

export default class SWNVehicle extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Vehicle',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.kmph = SWNShared.requiredNumber(0);
    schema.tonnage = SWNShared.requiredNumber(0);
    schema.size = SWNShared.stringChoices('s', CONFIG.SWN.vehicleClasses);
    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
