import SWNShared from '../shared.mjs';

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
    schema.armor = SWNShared.resourceField(1,1);
    schema.speed = SWNShared.requiredNumber(1);
    schema.crew = SWNShared.rangeResourceField(1,1,1);
    schema.crewMembers = new fields.ArrayField(new fields.DocumentIdField());
    schema.tl = SWNShared.requiredNumber(5);

    schema.description = new fields.HTMLField();
    schema.mods = SWNShared.requiredString(""); // TODO: HTML?

    schema.power = SWNShared.resourceField(1,1,true);
    schema.mass = SWNShared.resourceField(1,1,true);
    schema.hardpoints = SWNShared.resourceField(1,1,true);
    return schema;
  }

  prepareDerivedData() {
    this.health.percentage = Math.clamp((this.health.value * 100) / this.health.max, 0, 100);
    this.armor.percentage = Math.clamp((this.armor.value * 100) / this.armor.max, 0, 100);

    this.carriedGear = this.parent.items.filter((item) => 
      item.type === "item" || item.type === "weapon" || item.type === "armor");
    this.carriedGear.sort((a, b) => {
      if (a.type == b.type) {
        return a.name.localeCompare(b.name);
      } else {
        return a.type.localeCompare(b.type);
      }
    });
  }
}
