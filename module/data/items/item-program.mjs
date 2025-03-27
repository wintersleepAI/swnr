import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNProgram extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Program',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.cost = SWNShared.requiredNumber(0);
    schema.type = SWNShared.stringChoices("verb", CONFIG.SWN.programTypes, true);
    schema.accessCost = SWNShared.requiredNumber(0);
    schema.target = SWNShared.requiredString("");
    schema.selfTerminating = new fields.BooleanField({ initial: false });
    schema.useAffects = SWNShared.requiredString("");
    schema.skillCheckMod = SWNShared.requiredNumber(0, -10);

    return schema;
  }

  async roll(_shiftKey = false) {
    console.log("Rolling program. Shiftkey = " + _shiftKey);

    let level = 1;
    const skillRollData = {
      skillMod: 0,
      skillCheckMod: 0,
      attrMod: 0,
      crownPenalty: 0,
      wirelessPenalty: 0,
      skillRoll: "2d6",
    };
    let item = this.parent;
    const cyberdeck = item.actor;

    if (!cyberdeck || cyberdeck.type !== "cyberdeck") {
      ui.notifications?.error("Rolling program without a cyberdeck");
      return;
    }

    if (cyberdeck.system.crownPenalty) {
      skillRollData.crownPenalty = -1;
    }

    if (cyberdeck.system.wirelessConnectionPenalty) {
      skillRollData.wirelessPenalty = -2;
    }

    const hacker = cyberdeck.system.getHacker();
    if (hacker == null) {
      // no actor, set default values?
    } else {
      if (hacker.type == "character") {
        const items = hacker.items.contents;
        const skill = items.find(item => item.type === "skill" && item.name === "Program");
        if (skill) {
          if (skill.system.pool != "ask") {
            skillRollData.skillRoll = skill.system.pool;
          }
          skillRollData.skillMod = skill.system.rank;
          level = skillRollData.skillMod;
        }
        skillRollData.attrMod = hacker.system.stats.int.mod;
      } else if (hacker.type == "npc") {
        skillRollData.skillMod = hacker.system.skillBonus;
        level = skillRollData.skillMod;
      } else {
        ui.notifications?.error(
          "Rolling program non-character or non-npc actor"
        );
        return;
      }
    }

    if (cyberdeck.system.skillCheckMod) {
      skillRollData.skillCheckMod = cyberdeck.system.skillCheckMod;
    }
    let programRoll = "";
    let traumaRoll = "";
    let traumaDamage = "";
    // A bit hacky, but it works
    // Revist this later - what if you're trying to Analyse (Verb) a Killbot (Specialised subject)
    if (this.parent.name?.includes("Stun") || this.parent.name?.includes("Kill")) {
      const rollStr = `${level}d10 * -1`;
      const roll = new Roll(rollStr);
      await roll.roll();
      programRoll = await roll.render();
      if (this.parent.name?.includes("Kill")) {
        const traumaRollStr = `1d8`;
        const traumaRollObj = new Roll(traumaRollStr);
        await traumaRollObj.roll();
        traumaRoll = await traumaRollObj.render();
        const traumaDamageRoll = new Roll(`${roll.total} * 3`);
        await traumaDamageRoll.evaluate();
        traumaDamage = await traumaDamageRoll.render();
      }
    }

    const skillRoll = new Roll(
      "@skillRoll + @skillMod + @skillCheckMod + @attrMod + @crownPenalty + @wirelessPenalty",
      skillRollData
    );
    await skillRoll.roll();
    const template = "systems/swnr/templates/chat/program-roll.hbs";
    const dialogData = {
      actor: hacker,
      program: this,
      programRoll: programRoll,
      skillRoll: await skillRoll.render(),
      traumaRoll: traumaRoll,
      traumaDamage: traumaDamage,
      useTrauma: (game.settings.get("swnr", "useTrauma") ? true : false)
        && this.parent.name?.includes("Kill"),
      programSkill: "Int/Program",
    };
    const rollMode = game.settings.get("core", "rollMode");

    const chatContent = await renderTemplate(template, dialogData);
    // TODO: break up into two rolls and chain them?
    // const promise = game.dice3d
    //   ? game.dice3d.showForRoll(diceData)
    //   : Promise.resolve();
    // promise.then(() => {
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: hacker ?? undefined }),
      content: chatContent
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }


}
