import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';

export default class SWNMech extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Mech',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.maintenanceCost = SWNShared.requiredNumber(0);
    schema.mechClass = SWNShared.stringChoices("suit", CONFIG.SWN.mechClasses, true);
    schema.mechHullType = SWNShared.requiredString("");
    return schema;
  }

  prepareDerivedData() {
  }
}
