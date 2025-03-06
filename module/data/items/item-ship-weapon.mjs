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
      vehicle: new fields.BooleanField({ initial: false }),
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

    if (this.broken || this.destroyed) {
      ui.notifications?.error(
        "Weapon is broken/disabled or destroyed. Cannot fire!"
      );
      return;
    }

    if (!this.hasAmmo) {
      ui.notifications?.error(`Your ${item.name} is out of ammo!`);
      return;
    }

    if (
      actor.type == "ship" ||
      actor.type == "mech" ||
      actor.type == "drone" ||
      actor.type == "vehicle"
    ) {
      let defaultGunnerId = null;
      // if there is one crew member or there is a gunner
      if (actor.system.crewMembers.length == 1) {
        defaultGunnerId = actor.system.crewMembers[0];
      } else if (actor.type == "ship") {
        defaultGunnerId = actor.system.roles.gunnery;
      }
      //get the gunner if exists
      let defaultGunner = null;
      if (defaultGunnerId) {
        const _temp = game.actors?.get(defaultGunnerId);
        if (_temp && (_temp.type == "character" || _temp.type == "npc")) {
          defaultGunner = _temp;
        }
      }
      const crewArray = [];
      if (actor.system.crewMembers) {
        for (let i = 0; i < actor.system.crewMembers.length; i++) {
          const cId = actor.system.crewMembers[i];
          const crewMember = game.actors?.get(cId);
          if (
            crewMember &&
            (crewMember.type == "character" || crewMember.type == "npc")
          ) {
            crewArray.push(crewMember);
          }
        }
      }

      const title = game.i18n.format("swnr.dialog.attackRoll", {
        actorName: this.actor?.name,
        weaponName: this.name,
      });

      if (defaultGunner == null && crewArray.length > 0) {
        //There is no gunner. Use first crew as default
        defaultGunner = crewArray[0];
        defaultGunnerId = crewArray[0].id;
      }
      if (defaultGunner?.type == "npc" && crewArray.length > 0) {
        //See if we have a non NPC to set as gunner to get skills and attr
        for (const char of crewArray) {
          if (char.type == "character") {
            defaultGunner = char;
            defaultGunnerId = char.id;
            break;
          }
        }
      }

      const dialogData = {
        actor: actor,
        weapon: this,
        defaultSkill1: "Shoot",
        defaultSkill2: "Combat/Gunnery",
        defaultStat: "int",
        gunner: defaultGunner,
        gunnerId: defaultGunnerId,
        crewArray: crewArray,
      };

      const template = "systems/swnr/templates/dialogs/roll-ship-attack.hbs";
      const html = await renderTemplate(template, dialogData);

      const _rollForm = async (_event, button, html) => {
        const mod = parseInt(button.form.elements.modifier.value);
        const shooterId = button.form.elements.shooterId?.value;
        const shooter = shooterId ? game.actors?.get(shooterId) : null;
        const skillName = button.form.elements.skill?.value;
        const statName = button.form.elements.stat?.value;
        const burstFire = button.form.elements.burstFire?.checked ? true : false;

        let skillMod = 0;
        let statMod = 0;
        let abMod = 0;
        const weaponAbStr = button.form.elements.weaponAb?.value || "0";
        const npcSkillStr = button.form.elements.npcSkill?.value || "0";
        const weaponAb = parseInt(weaponAbStr);
        const npcSkill = parseInt(npcSkillStr);
        let shooterName = "";
        if (shooter) {
          if (skillName) {
            // We need to look up by name
            for (const skill of shooter.itemTypes.skill) {
              if (skillName == skill.name) {
                skillMod =
                  skill.system["rank"] < 0 ? -2 : skill.system["rank"];
              }
            }
          } //end skill
          if (statName) {
            const sm = shooter.system["stats"]?.[statName].mod;
            if (sm) {
              console.log("setting stat mod", sm);
              statMod = sm;
            }
          }
          if (shooter.type == "character" || shooter.type == "npc") {
            abMod = shooter.system.ab;
          }
          shooterName = shooter.name;
        }
        this.rollAttack(
          shooterName,
          skillMod,
          statMod,
          abMod,
          mod,
          weaponAb,
          npcSkill,
          burstFire
        );
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
    else {
      ui.notifications?.error("Ship weapon roll called on non-ship/drone/mech/vehicle actor");
    }
  }

  async rollAttack(
      shooterName,
      skillMod,
      statMod,
      abMod,
      mod,
      weaponAb,
      npcSkill,
      useBurst
    ) {
      const template = "systems/swnr/templates/chat/attack-roll.hbs";
      const burstFire = useBurst ? 2 : 0;

      const attackRollDie = game.settings.get("swnr", "attackRoll");
      const rollData = {
        skillMod,
        statMod,
        abMod,
        mod,
        weaponAb,
        npcSkill,
        attackRollDie,
        burstFire,
      };

      const hitRollStr =
        "@attackRollDie + @skillMod + @statMod + @abMod + @mod + @weaponAb + @npcSkill + @burstFire";
      const damageRollStr = `${this.damage} + @statMod + @burstFire`;
      const hitRoll = new Roll(hitRollStr, rollData);
      await hitRoll.roll({ async: true });
      const damageRoll = new Roll(damageRollStr, rollData);
      await damageRoll.roll({ async: true });

      let traumaRollRender = null;
      let traumaDamage = null;
      let useTrauma = (game.settings.get("swnr", "useTrauma") ? true : false);

      if (
        useTrauma &&
        this.trauma.die != null &&
        this.trauma.die !== "none" &&
        this.trauma.rating != null
      ) {
        const traumaRoll = new Roll(this.system.trauma.die);
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

      const diceTooltip = {
        hit: await hitRoll.render(),
        damage: await damageRoll.render(),
        hitExplain: hitRollStr,
        damageExplain: damageRollStr,
      };

      if (
        useBurst &&
        this.ammo.type !== "infinite" &&
        this.ammo.type !== "none" &&
        this.ammo.value < 3
      ) {
        ui.notifications?.error(
          `Your ${this.name} is does not have enough ammo to burst!`
        );
        return;
      }

      if (this.ammo.type !== "none") {
        const ammoUsed = useBurst ? 3 : 1;
        const newAmmoTotal = this.ammo.value - ammoUsed;
        await this.parent.update({ "system.ammo.value": newAmmoTotal }, {});
        if (newAmmoTotal === 0)
          ui.notifications?.warn(`Your ${this.name} is now out of ammo!`);
      }

      const dialogData = {
        weapon: this.parent,
        hitRoll,
        damageRoll,
        diceTooltip,
        traumaDamage,
        traumaRollRender,
      };

      const rollMode = game.settings.get("core", "rollMode");
      // const dice = hitRoll.dice.concat(damageRoll.dice)
      // const formula = dice.map(d => (<any>d).formula).join(' + ');
      // const results = dice.reduce((a, b) => a.concat(b.results), [])
      const diceData = Roll.fromTerms([
        PoolTerm.fromRolls([hitRoll, damageRoll]),
      ]);

      const chatContent = await renderTemplate(template, dialogData);
      const chatData = {
        speaker: { alias: shooterName },
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
