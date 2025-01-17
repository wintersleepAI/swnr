import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

export default class SWNCyberdeck extends SWNActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Cyberdeck',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.health = SWNShared.resourceField(1,1);
    schema.memory = SWNShared.resourceField(1,1);
    schema.cpu = SWNShared.resourceField(1,1);
    schema.encumberance = SWNShared.requiredNumber(0);
    schema.hackerId = new fields.DocumentIdField();
    schema.cost = SWNShared.requiredNumber(0);
    schema.neuralBuffer = new fields.BooleanField({initial: false});
    schema.wirelessConnectionPenalty = new fields.BooleanField({initial: false});
    schema.crownPenalty = new fields.BooleanField({initial: false});
    schema.baseShielding = SWNShared.requiredNumber(0);
    schema.bonusShielding = SWNShared.requiredNumber(0);
    schema.bonusAccess = SWNShared.requiredNumber(0);
    return schema;
  }

  prepareDerivedData() {
    console.log("DECK DERIVED");
    console.log(this);
    const actor = game.actors.get(this.hackerId);
  }
}