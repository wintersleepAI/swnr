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
    schema.subType = new fields.StringField({
      choices: ["psychic", "art", "adept", "spell", "mutation"],
      initial: "psychic"
    });
    schema.source = SWNShared.requiredString("");
    schema.resourceName = new fields.StringField({
      choices: ["Effort", "Slots", "Points", "Strain", "Uses"],
      initial: "Effort"
    });
    schema.subResource = new fields.StringField();
    schema.resourceCost = new fields.NumberField({ initial: 1 });
    schema.sharedResource = new fields.BooleanField({ initial: true });
    schema.internalResource = new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 1 })
    });
    schema.resourceLength = new fields.StringField({
      choices: ["commit", "scene", "day", "rest", "user"],
      initial: "scene"
    });
    schema.userResourceLength = new fields.StringField({
      choices: ["commit", "scene", "day", "rest", "user"]
    });
    schema.level =  new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
      max: CONFIG.SWN.maxPowerLevel,
      
    });
    schema.leveledResource = new fields.BooleanField({ initial: false });
    schema.prepared = new fields.BooleanField({initial: false});
    schema.strainCost = new fields.NumberField({ initial: 0 });
    schema.uses = new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 1 })
    });
    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
    return schema;
  }

  resourceKey() {
    return `${this.resourceName}:${this.subResource || ""}`;
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
      roll: JSON.stringify(powerRoll)
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }
}
