export default class SWNActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];


  // helper function to generate a SchemaField with resources (value, max)
  static resourceField(initialValue, initialMax) {
    const fields = foundry.data.fields;

    return new fields.SchemaField({
          // Make sure to call new so you invoke the constructor!
      value: new fields.NumberField({required: true, nullable: false, integer: true, min:0, initial: initialValue }),
      max: new fields.NumberField({required: true, nullable: false, integer: true, initial: initialMax }),
    });
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    const resourceField = SWNActorBase.resourceField;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = resourceField(10,10);
    schema.power = resourceField(5,5);
    schema.biography = new fields.HTMLField();

    return schema;
  }
}
