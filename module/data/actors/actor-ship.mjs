import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';


export default class SWNShip extends SWNVehicleBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Ship',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.lifeSupportDays = SWNShared.resourceField(1,1);
    schema.fuel = SWNShared.resourceField(1,1);
    schema.cargo = SWNShared.resourceField(1,1);
    schema.spikeDrive = SWNShared.resourceField(1,1);
    // schema.shipClass = TODO();
    // schema.shipHullType = TODO();
    schema.operatingCost = SWNShared.requiredNumber(1);
    schema.maintenanceCost = SWNShared.requiredNumber(1);
    schema.amountOwed = SWNShared.requiredNumber(0);
    schema.paymentAmount = SWNShared.requiredNumber(0);
    schema.paymentMonths = SWNShared.requiredNumber(0);
    schema.maintenanceMonths = SWNShared.requiredNumber(0);
    schema.creditPool = SWNShared.requiredNumber(0);
    schema.lastMaintenance = SWNShared.date();
    schema.lastPayment = SWNShared.date();
    // schema.roles = TODO; // Check with WWN overlap
    // schema.cargoCarried = TODO;
    schema.commandPoints = SWNShared.requiredNumber(0);
    schema.npcCommandPoints = SWNShared.requiredNumber(0);
    schema.crewSkillBonus = SWNShared.requiredNumber(0);
    schema.actionsTaken = new fields.ArrayField(new fields.StringField());
    schema.supportingDept = SWNShared.requiredString("");
    schema.roleOrder = new fields.ArrayField(new fields.StringField());
    return schema;
  }

  prepareDerivedData() {
  }
}
