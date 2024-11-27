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

  static requiredNumber(initialValue, minValue = 0, integer = true) {
    const fields = foundry.data.fields;
    return new fields.NumberField({ required: true, nullable: false, integer: integer, min: minValue, initial: initialValue });
  }

  static requiredDecimal(initialValue, minValue = 0) {
    const fields = foundry.data.fields;
    return new fields.NumberField({ required: true, nullable: false, integer: false, min: minValue, initial: initialValue });
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

  static stringChoices(initialValue, choices, required = true) {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: required, nullable: !required, initial: initialValue, choices: choices });
  }

  static stats(initialValue, none_allowed = false, ask_allowed = false) {
    const fields = foundry.data.fields;
    //clone the stats object
    let required = true;
    let stats = {...CONFIG.SWN.stats};
    if (none_allowed) {
      //stats["none"] = "";
      required = false;
    }
    if (ask_allowed) {
      stats["ask"] = "swnr.sheet.ask";
    }
    return new fields.StringField({ required: required, nullable:  none_allowed, initial: initialValue, choices: stats });
  }

  static emptyString() {
    const fields = foundry.data.fields;
    return new fields.StringField({ required: false, nullable: false });
  }
}