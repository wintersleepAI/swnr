import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNPower extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Power',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.source = SWNShared.requiredString("");
    schema.level =  new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
      max: CONFIG.SWN.maxPowerLevel,
      
    });
    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    schema.prepared = new fields.BooleanField({initial: false});
    schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
    return schema;
  }

  async doRoll(_shiftKey = false) {
    const item = this.parent;
    const actor = item.actor;
    if (!actor) {
      const message = `Called power.roll on item without an actor.`;
      ui.notifications?.error(message);
      new Error(message);
      return;
    }
    const powerRoll = new Roll(this.roll ? this.roll : "0");
    await powerRoll.roll();
    const dialogData = {
      actor: actor,
      power: item,
      powerRoll: await powerRoll.render(),
    };
    const rollMode = game.settings.get("core", "rollMode");

    const template = "systems/swnr/templates/chat/power-roll.hbs";
    const chatContent = await renderTemplate(template, dialogData);
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
      content: chatContent,
      roll: JSON.stringify(powerRoll),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }
}
