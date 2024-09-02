export default class SWNVehicleBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];


  // helper function to generate a SchemaField with resources (value, max)
  static resourceField(initialValue, initialMax) {
    const fields = foundry.data.fields;

    return new fields.SchemaField({
      // Make sure to call new so you invoke the constructor!
      value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: initialValue }),
      max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: initialMax }),
    });
  }
  static reqInt(initialValue) {
    const fields = foundry.data.fields;

    return new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: initialValue });
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    const resourceField = SWNVehicleBase.resourceField;
    const schema = {};

    schema.health = resourceField(10, 10);
    schema.cost = SWNVehicleBase.reqInt(0);
    schema.ac = SWNVehicleBase.reqInt(10);
    schema.traumaTarget = SWNVehicleBase.reqInt(6);
    schema.speed = SWNVehicleBase.reqInt(1);


    schema.description = new fields.HTMLField();

    return schema;
  }
}
