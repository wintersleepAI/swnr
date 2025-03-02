import SWNVehicleItemBase from './base-ship.mjs';
import SWNShared from '../shared.mjs';

export default class SWNShipWeapon extends SWNVehicleItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.vehiclebase',
    'SWN.Item.ShipWeapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.damage = SWNShared.requiredString("1d6");
    schema.ab = SWNShared.requiredNumber(0);
    schema.hardpoint = SWNShared.requiredNumber(1);
    schema.qualities = SWNShared.requiredString("");
    schema.ammo = new fields.SchemaField({
      type: SWNShared.stringChoices("none", CONFIG.SWN.ammoTypes),
      max: SWNShared.requiredNumber(4),
      value: SWNShared.requiredNumber(4)
    });
    schema.trauma = new fields.SchemaField({
      die: SWNShared.requiredString("1d6"),
      rating: SWNShared.nullableNumber(),
      vehicle: new fields.BooleanField({initial: false}),
    });
    schema.range = new fields.SchemaField({
      normal: SWNShared.requiredNumber(1),
      max: SWNShared.requiredNumber(2),
    });
    schema.stat = SWNShared.stats("ask", false, true);
    return schema;
  }

  async roll(shiftKey = false) {
    let item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      const message = `Called ship-weapon.roll on item without an actor.`;
      ui.notifications?.error(message);
      new Error(message);
      return;
    }

    if (!this.hasAmmo) {
      ui.notifications?.error(`Your ${item.name} is out of ammo!`);
      return;
    }

    return this.rollAttack();
  }

  async rollAttack() {
    let item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      const message = `Called rollAttack on item without an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }

    if (!this.hasAmmo) {
      ui.notifications?.error(`Your ${item.name} is out of ammo!`);
      return;
    }

    const template = "systems/swnr/templates/chat/attack-roll.hbs";
    const attackRollDie = game.settings.get("swnr", "attackRoll");
    const rollData = {
      actor: actor.getRollData(),
      weapon: this,
      hitRoll: undefined,
      attackRollDie,
    };
    let dieString = "@attackRollDie + @weapon.ab";

    const hitRoll = new Roll(dieString, rollData);
    await hitRoll.roll({ async: true });
    const hitExplainTip = "1d20";
    rollData.hitRoll = +(hitRoll.dice[0].total?.toString() ?? 0);
    const damageRoll = new Roll(
      this.damage,
      rollData
    );
    await damageRoll.roll({ async: true });
    const damageExplainTip = "roll";
    const diceTooltip = {
      hit: await hitRoll.render(),
      damage: await damageRoll.render(),
      hitExplain: hitExplainTip,
      damageExplain: damageExplainTip,
    };

    console.log("TODO replace settings useTrauma");
    // console.log('weapon.system.settings.useTrauma: ', this.system.settings.useTrauma);
    const useTrauma = game.settings.get("swnr", "useTrauma");
    let traumaRollRender = null;
    let traumaDamage = null;
    if (
      useTrauma &&
      this.trauma.die != null &&
      this.trauma.die !== "none" &&
      this.trauma.rating != null
    ) {
      const traumaRoll = new Roll(this.trauma.die);
      await traumaRoll.roll({ async: true });
      traumaRollRender = await traumaRoll.render();
      if (
        traumaRoll &&
        traumaRoll.total &&
        traumaRoll.total >= 6 &&
        damageRoll?.total
      ) {
        const traumaDamageRoll = new Roll(
          `${damageRoll.total} * ${this.trauma.rating}`
        );
        await traumaDamageRoll.roll({ async: true });
        traumaDamage = await traumaDamageRoll.render();
      }
    }

    const rollArray = [hitRoll, damageRoll];

    const dialogData = {
      actor,
      weapon: this.parent,
      hitRoll,
      diceTooltip,
      traumaDamage,
      traumaRollRender,
      ammoRatio: Math.clamped(
        Math.floor((this.ammo.value * 20) / this.ammo.max),
        0,
        20
      )
    };
    const rollMode = game.settings.get("core", "rollMode");
    const diceData = Roll.fromTerms([PoolTerm.fromRolls(rollArray)]);
    if (
      this.ammo.type !== "none" &&
      this.ammo.type !== "infinite"
    ) {
      const newAmmoTotal = this.ammo.value - 1;
      await this.parent.update({ 
        system: {
          "ammo.value": newAmmoTotal 
        }
      });
      if (newAmmoTotal === 0)
        ui.notifications?.warn(`Your ${item.name} is now out of ammo!`);
    }
    const chatContent = await renderTemplate(template, dialogData);
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
      roll: JSON.stringify(diceData),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);

  }

  get hasAmmo() {
    return (
      this.ammo.type === "none" ||
      this.ammo.type === "infinite" ||
      this.ammo.value > 0
    );
  }
}
