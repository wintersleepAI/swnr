import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';

export default class SWNDrone extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Drone',
  ];

  static defineSchema() {
    let modelMap = Object.keys(CONFIG.SWN.DroneModelsData).reduce((acc, key) => {
      acc[key] = `swnr.sheet.drone.models.${key}`;
      return acc;
    }, {});
    modelMap['custom'] = 'swnr.sheet.drone.models.custom';
    
    const schema = super.defineSchema();
    schema.fittings = SWNShared.resourceField(1,1,true); //TODO Migrate to mass 
    schema.enc = SWNShared.requiredNumber(1);
    schema.range = SWNShared.requiredString("");
    schema.model = SWNShared.stringChoices('primitiveDrone', modelMap, false); //SWNShared.requiredString("");
    schema.moveType = SWNShared.requiredString("");
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
    shipHardpoint -= weaponInventory.length;
    this.power.value = shipPower;
    this.mass.value = shipMass;
    this.hardpoints.value = shipHardpoint;
  }
}
