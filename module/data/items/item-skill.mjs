import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNSkill extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Skill',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.rank = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: -1
    });

    schema.defaultStat = SWNShared.stats("ask", false, true);

    schema.pool = SWNShared.stringChoices("2D6", {
      "ask": "swnr.sheet.ask",
      "2D6": "2D6",
      "3D6": "3D6",
      "4D6": "4D6"
    });

    // Can possibly remove this field
    schema.source = new fields.StringField({
        required: false,
        nullable: false,
        initial: '',
    });

    schema.remember = new fields.SchemaField({
      use: new fields.BooleanField({
        required: true,
        nullable: false,
        initial: false,
      }),
      modifier: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
    });
    
    schema.stats = SWNShared.stringChoices("dex", CONFIG.SWN.stats);

    return schema;
  }

  async rollSkill(
    skillName,
    statShortName,
    statMod,
    dice,
    skillRank,
    modifier
  ) {
    const rollMode = game.settings.get("core", "rollMode");

    const formula = `${dice} + @stat + @skill + @modifier`;
    const roll = new Roll(formula, {
      skill: skillRank,
      modifier: modifier,
      stat: statMod,
    });
    await roll.roll({ async: true });
    const title = `${game.i18n.localize(
      "swnr.chat.skillCheck"
    )}: ${statShortName}/${skillName}`;
    roll.toMessage(
      {
        speaker: ChatMessage.getSpeaker(),
        flavor: title,
      },
      { rollMode }
    );
  }


  async roll(shiftKey = false) {
    let item = this.parent;
    const actor = item.actor;
    const template = "systems/swnr/templates/dialogs/roll-skill.hbs";
    if (actor == null) {
      const message = `Called rollSkill without an actor.`;
      ui.notifications?.error(message);
      return;
    } else if (actor.type != "character") {
      ui.notifications?.error("Calling roll skill on non-character");
      return;
    }
    const skillName = item.name;

    // Set to not ask and just roll
    if (!shiftKey && this.remember && this.remember.use) {
      const modifier = this.remember.modifier;
      const defaultStat = this.defaultStat;
      const dice = this.pool;
      const skillRank = this.rank;
      if (defaultStat == "ask" || dice == "ask") {
        ui.notifications?.info(
          "Quick roll set, but dice or stat is set to ask"
        );
      } else {
        const stat = this.actor?.system["stats"][defaultStat] || {
          mod: 0,
        };
        const statShortName = game.i18n.localize(
          "swnr.stat.short." + defaultStat
        );
        this.rollSkill(
          skillName,
          statShortName,
          stat.mod,
          dice,
          skillRank,
          modifier
        );
        return;
      }
    }

    const modifier =
      this.remember && this.remember.modifier
        ? this.remember.modifier
        : 0;
    const title = `${game.i18n.localize("swnr.chat.skillCheck")}: ${skillName}`;
    const dialogData = {
      title: title,
      skillName: skillName,
      skill: item,
      stats: actor.system.stats,
      modifier,
    };

    const content = await renderTemplate(template, dialogData);
    const _doRoll = async (_event, button, html) => {
      const dice = button.form.elements.dicepool.value;
      const statShortNameForm = button.form.elements.stat.value;
      if (
        ["str", "dex", "con", "int", "wis", "cha"].includes(
          statShortNameForm
        ) == false
      ) {
        ui.notifications?.error("Stat must be set and not ask");
        return;
      }
      if (["2d6", "3d6kh2", "4d6kh2"].includes(dice) == false) {
        ui.notifications?.error("Dice must be set and not ask");
        return;
      }
      const stat = this.actor?.system["stats"][statShortNameForm] || {
        mod: 0,
      };
      const modifier = button.form.elements.modifier.value;
      if (Number.isNaN(Number(modifier))) {
        ui.notifications?.error("Modifier is not a number");
        return;
      }
      const statShortName = game.i18n.localize(
        "swnr.stat.short." + statShortNameForm
      );

      // If remember is checked, set the skill and data
      const remember = button.form.elements.remember?.checked;
      if (remember) {
        await this.parent.update({
          system: {
            remember: {
              use: true,
              modifier: Number(modifier),
            },
            defaultStat: statShortNameForm,
            pool: CONFIG.SWN.pool[dice],
          },
        });
      }

      this.rollSkill(
        skillName,
        statShortName,
        stat.mod,
        dice,
        this.rank,
        modifier
      );
    };
    const _resp = await foundry.applications.api.DialogV2.prompt(
      {
        window: {title: title},
        modal: true,
        rejectClose: false,
        content,
        ok: {
            label: game.i18n.localize("swnr.chat.roll"),
            callback: _doRoll,
        },
      },
   );

  }
}