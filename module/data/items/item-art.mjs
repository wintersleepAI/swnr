// item-art.mjs
import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNArt extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Art',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    // Remove the level field for arts.
    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    schema.prepared = new fields.BooleanField({ initial: false });
    schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
    // Add "source" to mirror the power schema.
    schema.source = SWNShared.requiredString("");
    return schema;
  }
  

  async doRoll(_shiftKey = false) {
    const item = this.parent;
    const actor = item.actor;
    if (!actor) {
      ui.notifications?.error("Called art.roll on item without an actor.");
      return;
    }
    const artRoll = new Roll(this.roll ? this.roll : "0");
    await artRoll.roll({ async: true });
    const dialogData = {
      actor: actor,
      art: item,
      artRoll: await artRoll.render(),
    };
    const rollMode = game.settings.get("core", "rollMode");
    const template = "systems/swnr/templates/chat/art-roll.hbs";
    const chatContent = await renderTemplate(template, dialogData);
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor ?? undefined }),
      content: chatContent,
      roll: JSON.stringify(artRoll),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }
}
