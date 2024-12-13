import SWNShared from '../shared.mjs';

export default class SWNActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.health = SWNShared.resourceField(10,10);
    schema.biography = new fields.HTMLField();
    schema.species = SWNShared.requiredString("");

    schema.access = SWNShared.resourceField(1,1); // CWN
    schema.traumaTarget = SWNShared.requiredNumber(6); // CWN
    schema.hitDie = SWNShared.requiredString("d6");
    schema.baseAc = SWNShared.requiredNumber(10);
    // schema.ac = SWNShared.requiredString("");
    schema.meleeAc = SWNShared.requiredNumber(10);
    schema.ab = SWNShared.requiredNumber(1);
    schema.meleeAb = SWNShared.requiredNumber(1);
    schema.systemStrain = new fields.SchemaField({
      value: SWNShared.requiredNumber(0),
      permanent: SWNShared.requiredNumber(0,-99)
    });
    schema.effort = new fields.SchemaField({
      bonus: SWNShared.requiredNumber(0),
      current: SWNShared.requiredNumber(0),
      scene: SWNShared.requiredNumber(0),
      day: SWNShared.requiredNumber(0)
    });
    schema.speed = SWNShared.requiredNumber(10);
    schema.cyberdecks = new fields.ArrayField(new fields.DocumentUUIDField());
    schema.health_max_modified = SWNShared.requiredNumber(0);
    return schema;
  }

  prepareDerivedData() {
    this.health.percentage = Math.clamp((this.health.value * 100) / this.health.max, 0, 100);
  }

  rollSave(_saveType) {
    console.log("rollSave call on base actor");
  }

}
