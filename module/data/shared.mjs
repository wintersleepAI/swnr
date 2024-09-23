export default class SWNShared {

  // helper function to generate a SchemaField with resources (value, max)
  static resourceField(initialValue, initialMax) {
    const fields = foundry.data.fields;
    return new fields.SchemaField({
      // Make sure to call new so you invoke the constructor!
      value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: initialValue }),
      max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: initialMax }),
    });
  }

  static requiredNumber(initialValue) {
    const fields = foundry.data.fields;
    return new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: initialValue });
  }

  static nullableNumber() {
    const fields = foundry.data.fields;
    return new fields.NumberField({ required: false, nullable: true, integer: true });
  }

  static requiredString(initialValue) {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: true, nullable: false, initial: initialValue });
  }

  static nullableString() {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: false, nullable: true });
  }

  static stringChoices(initialValue, choices) {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: true, nullable: false, initial: initialValue, choices: choices });
  }

  static emptyString() {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: false, nullable: false });
  }
}