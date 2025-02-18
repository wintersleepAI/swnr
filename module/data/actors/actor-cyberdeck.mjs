import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

export default class SWNCyberdeck extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Cyberdeck',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    
    // TODO wsAI added for header
    schema.access = SWNShared.resourceField(1,1); // CWN

    schema.health = SWNShared.resourceField(1,1);
    schema.hackerHP = SWNShared.resourceField(1,1);
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
    const hacker = this.getHacker();

    //Calculate the health from shielding and neural buffer.
    this.health.max = parseInt(this.baseShielding + this.bonusShielding);
    if (this.neuralBuffer && hacker) {
      if (hacker.type === "character") {
        const nbBonus = hacker.system.level.value * 3;
        this.health.max += nbBonus;
      } else if (hacker.type === "npc") {
        const nbBonus = hacker.system.hitDice * 3;
        this.health.max += nbBonus;
      }
      else {
        console.log("Hacker for is neither a character nor npc. Neural buffer bonus not applied to deck.");
      }
    }

    

    //Set the memory and CPU based on the programs.
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
        console.log("Hacker for is neither a character nor npc.");
      }
    }
    return null;
  }
}