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
    super.prepareDerivedData();
    this.pilot = null;
    if (this.crewMembers.length > 0) {
      //should only be 1 or 0 but grabbing first in case it changes.
      const cId = this.crewMembers[0];
      const crewMember = game.actors?.get(cId);
      if (crewMember) {
        if (crewMember.type == "character" || crewMember.type == "npc") {
          this.pilot = crewMember;
        }
      }
    }

    let shipMass = this.mass.max;
    let shipPower = this.power.max;
    let shipHardpoint = this.hardpoints.max;

    let multiplier = 1;
    if (this.mechClass == "light") {
      multiplier = 2;
    } else if (this.mechClass == "heavy") {
      multiplier = 4;
    }


    const shipInventory = this.parent.items.filter(
      (i) =>
        i.type === "shipWeapon" ||
        i.type === "shipDefense" ||
        i.type === "shipFitting"
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
    this.power.value = shipPower;
    this.mass.value = shipMass;
    this.hardpoints.value = shipHardpoint;
  }
}
