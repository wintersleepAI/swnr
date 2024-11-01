import SWNBaseGearItem from './base-gear-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNWeapon extends SWNBaseGearItem {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Weapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.stat = SWNShared.stats("dex");
    schema.secondStat = SWNShared.stats(null, true, false);
    schema.skill = SWNShared.requiredString("ask");
    schema.skillBoostsDamage = new fields.BooleanField({initial: false});
    schema.skillBoostsShock = new fields.BooleanField({initial: false});
    schema.shock = new fields.SchemaField({
      dmg: SWNShared.requiredNumber(0),
      ac: SWNShared.requiredNumber(10),
    });
    schema.ab = SWNShared.requiredNumber(0);
    schema.ammo = new fields.SchemaField({
      longReload: new fields.BooleanField({initial: false}),
      suppress: new fields.BooleanField({initial: false}),
      type: SWNShared.stringChoices("ammo", CONFIG.SWN.ammoTypes),
      max: SWNShared.requiredNumber(10),
      value: SWNShared.requiredNumber(10),
      burst: new fields.BooleanField({initial: false}),
    });
    schema.range = new fields.SchemaField({
      normal: SWNShared.requiredNumber(1),
      max: SWNShared.requiredNumber(2),
    });
    schema.damage = SWNShared.requiredString("1d6");
    schema.remember = new fields.SchemaField({
      use: new fields.BooleanField({initial: false}),
      burst: new fields.BooleanField({initial: false}),
      modifier: SWNShared.requiredNumber(0),
      isNonLethal: new fields.BooleanField({initial: false}),
    });
    //schema.quantity = SWNShared.requiredNumber(1);
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
    schema.trauma = new fields.SchemaField({
      die: SWNShared.requiredString("1d6"),
      rating: SWNShared.nullableNumber(),
    });
    schema.isTwoHanded = new fields.BooleanField({initial: false});
    schema.isNonLethal = new fields.BooleanField({initial: false});

    return schema;
  }

  get canBurstFire() {
    return (
      this.ammo.burst &&
      (this.ammo.type === "infinite" ||
        (this.ammo.type !== "none" && this.ammo.value >= 3))
    );
  }

  get hasAmmo() {
    return (
      this.ammo.type === "none" ||
      this.ammo.type === "infinite" ||
      this.ammo.value > 0
    );
  }

  async roll(shiftKey = false) {
    let item = this.parent;
    const actor = item.actor;
    
    if (!actor) {
      const message = `Called weapon.roll on item without an actor.`;
      ui.notifications?.error(message);
      new Error(message);
      return;
    }
    if (!this.hasAmmo) {
      ui.notifications?.error(`Your ${item.name} is out of ammo!`);
      return;
    }

    const title = game.i18n.format("swnr.dialog.attackRoll", {
      actorName: actor.name,
      weaponName: item.name,
    });
    const ammo = this.ammo;
    const burstFireHasAmmo =
      ammo.type !== "none" && ammo.burst && ammo.value >= 3;

    let dmgBonus = 0;

    // for finesse weapons take the stat with the higher mod
    let statName = this.stat;
    const secStatName = this.secondStat;
    // check if there is 2nd stat name and its mod is better
    if (
      secStatName != null &&
      secStatName != "none" &&
        actor.system["stats"]?.[statName].mod <
        actor.system["stats"]?.[secStatName].mod
    ) {
      statName = secStatName;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({alias: this.parent.name}),
      flavor: `${actor.name}'s ${this.parent.name} Damage Roll`,

    });
    return roll;
  }
}
