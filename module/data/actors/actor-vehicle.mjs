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
    schema.runHours = SWNShared.resourceField(1,1);
    schema.fuelNeeded = SWNShared.requiredNumber(0);
    schema.fuelType = SWNShared.stringChoices("typeBPower", CONFIG.SWN.fuelTypes);
    schema.cargo = SWNShared.resourceField(5,5);
    schema.cargoCarried = new fields.ArrayField(
      new fields.SchemaField({
        name: SWNShared.requiredString("CargoX"),
        value: new fields.NumberField({initial: 0, integer: true}),
        max: new fields.NumberField({initial: 0, integer: true}),
      })
    );
    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    let shipMass = this.mass.max;
    let shipPower = this.power.max;
    let shipHardpoint = this.hardpoints.max;

    let multiplier = 1;
    // If vehicle size class changes cost add here.

    const shipInventory = this.parent.items.filter(
      (i) =>
        i.type === "shipWeapon" ||
        i.type === "shipDefense" ||
        i.type === "shipFitting"
    );
    const weaponInventory = this.parent.items.filter(
      (i) => i.type === "weapon"
    );
    for (let i = 0; i < shipInventory.length; i++) {
      const item = shipInventory[i];
      let itemMass = item.system.mass;
      let itemPower = item.system.power;
      if (item.system.massMultiplier) {
        itemMass *= multiplier;
      }
      if (item.system.powerMultiplier) {
        itemPower *= multiplier;
      }
      shipMass -= itemMass;
      shipPower -= itemPower;
      if (item.type == "shipWeapon") {
        const itemHardpoint = item.system["hardpoint"];
        if (itemHardpoint) {
          shipHardpoint -= itemHardpoint;
        }
      }
    }
    shipHardpoint -= -weaponInventory.length;

    this.power.value = shipPower;
    this.mass.value = shipMass;
    this.hardpoints.value = shipHardpoint;

    let cargoUsed = this.cargoCarried.reduce((acc, curr) => acc + curr.value, 0);
    let gearUsed =  this.carriedGear.reduce((acc, curr) => acc + curr.system.encumbrance, 0);
    this.cargo.value = (cargoUsed + gearUsed);
    this.cargo.percentage = Math.clamp((this.cargo.value * 100) / this.cargo.max, 0, 100);
  }
}
