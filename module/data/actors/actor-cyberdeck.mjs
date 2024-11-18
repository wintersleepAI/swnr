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

    schema.health = new fields.SchemaField({
      value: SWNShared.requiredNumber(0)
    });
    schema.bonusAccess = SWNShared.requiredNumber(0);
    schema.memry = new fields.SchemaField({
      max: SWNShared.requiredNumber(0)
    });
    schema.cpu = new fields.SchemaField({
      max: SWNShared.requiredNumber(0)
    });
    schema.encumberance = SWNShared.requiredNumber(1);
    schema.hackerId = SWNShared.requiredString("");
    schema.cost = SWNShared.requiredNumber(0);
    schema.neuralBuffer = new fields.BooleanField({initial: false});
    schema.wirelessConnectionPenalty = new fields.BooleanField({initial: false});
    schema.crownPenalty = new fields.BooleanField({initial: false});
    schema.baseShielding = SWNShared.requiredNumber(0);
    schema.bonusShielding = SWNShared.requiredNumber(0);

    return schema;
  }

  prepareDerivedData() {
  }


  getHacker(){
    const hackerId = this.schema.hackerId;
    if (hackerId) {
      const actor = game.actors?.get(hackerId);
      if (actor && (actor.type == "character" || actor.type == "npc")) {
        return actor;
      }
    }
    return null;
  }
}
