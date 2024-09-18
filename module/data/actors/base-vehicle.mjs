import SWNShared from './shared.mjs';

export default class SWNVehicleBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.health = SWNShared.resourceField(10, 10);
    schema.cost = SWNShared.requiredNumber(0);
    schema.ac = SWNShared.requiredNumber(10);
    schema.traumaTarget = SWNShared.requiredNumber(6);
    schema.speed = SWNShared.requiredNumber(1);
    schema.description = new fields.HTMLField();

    return schema;
  }
}
