import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';
import { getChatMessageMode } from '../../helpers/utils.mjs';

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
      initial: -1,
      min: -1,
      max: CONFIG.SWN.maxSkillRank
    });

    schema.defaultStat = SWNShared.stats("ask", false, true);

    schema.pool = SWNShared.stringChoices("2d6", CONFIG.SWN.pool);

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
    modifier,
    unskilledPenaltyMod = 0
  ) {
    const rollMode = getChatMessageMode();

    let formula = `${dice} + @stat + @skill + @modifier`;
    // The != -1 check reads as a "did the GM customize it?" sentinel, but the
    // setting's default is also the untrained rank, so the branch it skips
    // would assign the same value. Behaviour is identical either way.
    if (skillRank < 0 && game.settings.get("swnr", "unskilledPenalty") != -1) {
      skillRank = game.settings.get("swnr", "unskilledPenalty");
    }

    if (skillRank < 0 && unskilledPenaltyMod >= 0) {
      skillRank += unskilledPenaltyMod;
    }

    const roll = new Roll(formula, {
      skill: skillRank,
      modifier: modifier,
      stat: statMod,
    });
    await roll.roll();
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
        const stat = actor?.system["stats"][defaultStat] || {
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
          modifier,
          actor.system.tweak.modifiers.unskilledPenalty
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
      modifier,
      pool: CONFIG.SWN.pool,
      stats: actor.system.stats
    };

    const content = await foundry.applications.handlebars.renderTemplate(template, dialogData);
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
      const stat = actor?.system["stats"][statShortNameForm] || {
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
            pool: dice,
          },
        });
      }

      this.rollSkill(
        skillName,
        statShortName,
        stat.mod,
        dice,
        this.rank,
        modifier,
        actor.system.tweak.modifiers.unskilledPenalty
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