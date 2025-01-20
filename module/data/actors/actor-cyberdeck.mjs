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
    schema.hacker = new fields.StringField();
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
    // Set the hacker's name from actor.
    const actor = game.actors.get(this.hackerId);
    this.hacker = actor.name;

    //Calculate the health from shielding and neural buffer.
    this.health.max = parseInt(this.baseShielding + this.bonusShielding);
    if (this.neuralBuffer && actor) {
      if (actor.type === "character") {
        const nbBonus = actor.system.level.value * 3;
        this.health.max += nbBonus;
      } else if (actor.type === "npc") {
        const nbBonus = actor.system.hitDice * 3;
        this.health.max += nbBonus;
      }
    }

    //Set the memrory and CPU based on the programs.
    const programs = this.parent.items.filter(
      item => item.type === "program"
    );
    const activePrograms = programs.filter(
      program  => program.system.type === "running"
    ).length;
    this.cpu.value = this.cpu.max - activePrograms;
    this.memory.value = this.memory.max - programs.length + activePrograms;
  }

  getHacker() {
    if (this.hackerId) {
      const actor = game.actors.get(this.hackerId);
      if (actor && (actor.type == "character" || actor.type == "npc")) {
        return actor;
      }
      else {
        console.log("Hacker for is neither a characher nor npc.");
      }
    }
    return null;
  }
}