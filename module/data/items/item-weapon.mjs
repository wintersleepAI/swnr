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

  async rollAttack(
    damageBonus, // number
    stat, // number
    skillMod, // number
    modifier, // number
    useBurst // boolean
  ) {
    alert("Attacking ! " + damageBonus + " " + stat + " " + skillMod + " " + modifier + " " + useBurst);  
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

    // Set to not ask and just roll
    if (!shiftKey && this.remember && this.remember.use) {
      const stat = actor["stats"]?.[statName] || {
        mod: 0,
      };

      const skill = actor.getEmbeddedDocument(
        "Item",
        this.skill
      );
      const skillMod = skill.rank < 0 ? -2 : skill.rank;

      if (actor?.type == "character") {
        dmgBonus = this.skillBoostsDamage ? skill.rank : 0;
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
    };
    const template = "systems/swnr/templates/dialogs/roll-attack.hbs";
    const html = await renderTemplate(template, dialogData);

    const _rollForm = async (_event, button, html) => {
      const modifier = parseInt(button.form.elements.modifier.value);
      const burstFire = (button.form.elements.burstFire?.checked) ? true : false;
      const skillId = button.form.elements.skill.value || this.skill;

      if (!actor) {
        console.log("Error actor no longer exists ");
        return;
      }
      let skillMod = 0;

      const skill = actor.getEmbeddedDocument(
        "Item",
        skillId
      );

      if (actor?.type == "npc" && html.find('[name="skilled"]')) {
        const npcSkillMod = button.form.elements.skilled?.checked ? actor.system.skillBonus : 0;
        if (npcSkillMod) skillMod = npcSkillMod;
      } else {
        skillMod = skill.system.rank < 0 ? -2 : skill.system.rank;
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
        await this.update({
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
