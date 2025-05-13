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
    schema.stat = SWNShared.stats("dex", false, true);
    schema.secondStat = SWNShared.stats(null, true, false);
    schema.skill = SWNShared.requiredString("ask");
    schema.skillBoostsDamage = new fields.BooleanField({initial: false});
    schema.skillBoostsShock = new fields.BooleanField({initial: false});
    schema.shock = new fields.SchemaField({
      dmg: SWNShared.requiredNumber(0),
      ac: SWNShared.requiredNumber(10),
    });
    schema.ab = SWNShared.requiredNumber(0, -10);
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

  static migrateData(data) {

    if (data.trauma.rating == "none" || data.trauma.rating == "") {
      data.trauma.rating = null;
    }

    if (!(data.stat in CONFIG.SWN.stats)) {
      data.stat = "ask";
    }

    return data;
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

  async rollAttack(
    damageBonus, // number
    stat, // number
    skillMod, // number
    modifier, // number
    useBurst // boolean
  ) {
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
    if (
      useBurst &&
      this.ammo.type !== "infinite" &&
      this.ammo.type !== "none" &&
      this.ammo.value < 3
    ) {
      ui.notifications?.error(
        `Your ${item.name} is does not have enough ammo to burst!`
      );
      return;
    }
    const template = "systems/swnr/templates/chat/attack-roll.hbs";
    const burstFire = useBurst ? 2 : 0;
    const attackRollDie = game.settings.get("swnr", "attackRoll");
    const rollData = {
      actor: actor.getRollData(),
      weapon: this,
      hitRoll: undefined,
      stat,
      burstFire,
      modifier,
      damageBonus,
      effectiveSkillRank: skillMod < 0 ? -2 : skillMod,
      shockDmg: this.shock?.dmg > 0 ? this.shock.dmg : 0,
      attackRollDie,
    };
    let dieString =
      "@attackRollDie + @burstFire + @modifier + @actor.ab + @weapon.ab + @stat + @effectiveSkillRank";
    const useA = game.settings.get("swnr", "useCWNArmor") ? true : false;
    if (
      useA &&
      this.range.normal <= 1 &&
      this.ammo.type == "none"
    ) {
      if (actor.type == "character" || actor.type == "npc") {
        if (actor.system.meleeAb) {
          dieString =
            "@attackRollDie + @burstFire + @modifier + @actor.meleeAb + @weapon.ab + @stat + @effectiveSkillRank";
        }
      }
    }
    const hitRoll = new Roll(dieString, rollData);
    await hitRoll.roll();
    const hitExplainTip = "1d20 +burst +mod +CharAB +WpnAB +Stat +Skill";
    rollData.hitRoll = +(hitRoll.dice[0].total?.toString() ?? 0);
    const damageRoll = new Roll(
      this.damage + " + @burstFire + @stat + @damageBonus",
      rollData
    );
    await damageRoll.roll();
    const damageExplainTip = "roll +burst +statBonus +dmgBonus";
    const diceTooltip = {
      hit: await hitRoll.render(),
      damage: await damageRoll.render(),
      hitExplain: hitExplainTip,
      damageExplain: damageExplainTip,
    };

    let traumaRollRender = null;
    let traumaDamage = null;
    let useTrauma = (game.settings.get("swnr", "useTrauma") ? true : false);

    if (
      useTrauma &&
      this.trauma.die != null &&
      this.trauma.die !== "none" &&
      this.trauma.rating != null
    ) {
      const traumaRoll = new Roll(this.trauma.die);
      await traumaRoll.roll();
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
        await traumaDamageRoll.roll();
        traumaDamage = await traumaDamageRoll.render();
      }
    }

    const rollArray = [hitRoll, damageRoll];
    // Placeholder for shock damage
    let shock_content = null;
    let shock_roll = null;
    // Show shock damage
    if (game.settings.get("swnr", "addShockMessage")) {
      if (this.shock && this.shock.dmg > 0) {
        shock_content = `Shock Damage  AC ${this.shock.ac}`;
        const _shockRoll = new Roll(
          " @shockDmg + @stat " +
            (this.skillBoostsShock ? ` + ${damageBonus}` : ""),
          rollData
        );
        await _shockRoll.roll();
        shock_roll = await _shockRoll.render();
        rollArray.push(_shockRoll);
      }
    }

    const dialogData = {
      actor,
      weapon: this.parent,
      hitRoll,
      stat,
      damageRoll,
      burstFire,
      modifier,
      effectiveSkillRank: rollData.effectiveSkillRank,
      diceTooltip,
      ammoRatio: Math.clamp(
        Math.floor((this.ammo.value * 20) / this.ammo.max),
        0,
        20
      ),
      shock_roll,
      shock_content,
      traumaDamage,
      traumaRollRender,
    };
    const rollMode = game.settings.get("core", "rollMode");
    const diceData = Roll.fromTerms([foundry.dice.terms.PoolTerm.fromRolls(rollArray)]);
    if (
      this.ammo.type !== "none" &&
      this.ammo.type !== "infinite"
    ) {
      const newAmmoTotal = this.ammo.value - 1 - burstFire;
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
      content: chatContent
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);

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
      statName != "ask" &&
      secStatName != null &&
      secStatName != "none" &&
        actor.system["stats"]?.[statName]?.mod <
        actor.system["stats"]?.[secStatName].mod
    ) {
      statName = secStatName;
    }

    // Set to not ask and just roll
    if (!shiftKey && this.remember && this.remember.use) {
      const stat = actor.system["stats"]?.[statName] || {
        mod: 0,
      };

      const skill = actor.getEmbeddedDocument(
        "Item",
        this.skill
      );
      let skillMod = -2; 
      if (skill) {
        skillMod = skill?.system.rank < 0 ? -2 : skill.system.rank;
      } else {
        ui.notifications?.info("No skill found, using -2. Unsetting remember.");
        await this.parent.update({
          system: {
            remember: {
              use: false,
              burst: false,
              modifier: 0,
            },
          }
        });
      }

      if (actor?.type == "character") {
        dmgBonus = this.skillBoostsDamage ? skill.system.rank : 0;
      }
      return this.rollAttack(
        dmgBonus,
        stat.mod,
        skillMod,
        this.remember.modifier,
        this.remember.burst
      );
    }

    const dialogData = {
      actor: actor,
      weapon: this,
      skills: actor.itemTypes.skill,
      statName: statName,
      skill: this.skill,
      burstFireHasAmmo,
      stats: actor.system.stats,
    };
    const template = "systems/swnr/templates/dialogs/roll-attack.hbs";
    const html = await renderTemplate(template, dialogData);

    const _rollForm = async (_event, button, html) => {
      const modifier = parseInt(button.form.elements.modifier.value);
      const burstFire = (button.form.elements.burstFire?.checked) ? true : false;
      const skillId = button.form.elements.skill?.value || this.skill;

      if (!actor) {
        console.log("Error actor no longer exists ");
        return;
      }
      let skillMod = 0;

      const skill = actor.getEmbeddedDocument(
        "Item",
        skillId
      );

      if (actor?.type == "npc") {
        const npcSkillMod = button.form.elements.skilled?.checked ? actor.system.skillBonus : 0;
        if (npcSkillMod) skillMod = npcSkillMod;
      } else if (skill) {
        skillMod = skill.system.rank < 0 ? -2 : skill.system.rank;
      } else {
        skillMod = -2;
      }
      // for finesse weapons take the stat with the higher mod
      let statName = this.stat;
      const secStatName = this.secondStat;
      // check if there is 2nd stat name and its mod is better
      if (
        secStatName != null &&
        secStatName != "none" &&
        actor.system.stats[statName].mod <
          actor.system.stats[secStatName].mod
      ) {
        statName = secStatName;
      }

      const stat = actor.system.stats?.[statName] || {
        mod: 0,
      };
      // 1d20 + attack bonus (PC plus weapon) + skill mod (-2 if untrained)
      // weapon dice + stat mod + skill if enabled or punch.
      // shock: damage + stat
      // const skill = actor.items.filter(w => w.)
      // Burst is +2 To hit and to damage
      if (actor?.type == "character") {
        dmgBonus = this.skillBoostsDamage ? skill.system.rank : 0;
      } else if (actor?.type == "npc") {
        dmgBonus = this.skillBoostsDamage
          ? actor.system.skillBonus
          : 0;
        if (actor.system.attacks.bonusDamage) {
          dmgBonus += actor.system.attacks.bonusDamage;
        }
      }
      // If remember is checked, set the skill and data
      const remember = (button.form.elements.remember?.checked) ? true : false;
      if (remember) {
        await this.parent.update({
          system: {
            remember: {
              use: true,
              burst: burstFire,
              modifier: modifier,
            },
            skill: skillId,
          },
        });
      }

      return this.rollAttack(dmgBonus, stat.mod, skillMod, modifier, burstFire);
      // END roll form
    };

    const attackDialog = await foundry.applications.api.DialogV2.wait({
      window: { title: title },
      content: html,
      modal: false,
      rejectClose: false,
      buttons: [
        {
          label: game.i18n.localize("swnr.chat.roll"),
          callback: _rollForm,
        },
      ],
    });

  }
}
