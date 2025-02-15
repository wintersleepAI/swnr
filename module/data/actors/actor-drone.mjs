import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';

export default class SWNDrone extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Drone',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.fittings = SWNShared.resourceField(1,1,true); //TODO Migrate to mass 
    schema.enc = SWNShared.requiredNumber(1);
    schema.range = SWNShared.requiredString("");
    schema.model = SWNShared.requiredString("");
    schema.moveType = SWNShared.requiredString("");
    return schema;
  }

  prepareDerivedData() {
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
  }
}
