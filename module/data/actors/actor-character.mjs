import SWNActorBase from './base-actor.mjs';
import SWNShared from '../shared.mjs';

export default class SWNCharacter extends SWNActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Character',
  ];


  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Iterate over stat names and create a new SchemaField for each.
    schema.stats = new fields.SchemaField(
      Object.keys(CONFIG.SWN.stats).reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          base: SWNShared.requiredNumber(9),
          bonus: SWNShared.requiredNumber(0),
          boost: SWNShared.requiredNumber(0),
          temp: SWNShared.requiredNumber(0),
        });
        return obj;
      }, {})
    );

    schema.level = new fields.SchemaField({
      value: SWNShared.requiredNumber(1),
      exp: SWNShared.requiredNumber(0),
      expToLevel: SWNShared.requiredNumber(3)
    });
    schema.goals = SWNShared.requiredString("");
    schema.class = SWNShared.requiredString("");
    schema.species = SWNShared.requiredString("");
    schema.homeworld = SWNShared.requiredString("");
    schema.background = SWNShared.requiredString("");
    schema.employer = SWNShared.requiredString("");
    schema.biography = SWNShared.requiredString("");
    schema.credits = new fields.SchemaField({
      debt: SWNShared.requiredNumber(0),
      balance: SWNShared.requiredNumber(0),
      owed: SWNShared.requiredNumber(0)
    });
    schema.unspentSkillPoints = SWNShared.requiredNumber(0);
    schema.unspentPsySkillPoints = SWNShared.requiredNumber(0);

    schema.tweak = new fields.SchemaField({
      advInit: new fields.BooleanField({initial: false}),
      quickSkill1: SWNShared.emptyString(),
      quickSkill2: SWNShared.emptyString(),
      quickSkill3: SWNShared.emptyString(),
      extraEffortName: SWNShared.emptyString(),
      extraEffort: new fields.SchemaField({
        bonus: SWNShared.requiredNumber(0),
        current: SWNShared.requiredNumber(0),
        scene: SWNShared.requiredNumber(0),
        day: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0)
      }),
      showResourceList: new fields.BooleanField({initial: false}),
      resourceList: new fields.ArrayField(new fields.SchemaField({
        name: SWNShared.emptyString(),
        value: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0),
      })),
      debtDisplay: SWNShared.emptyString(),
      owedDisplay: SWNShared.emptyString(),
      balanceDisplay: SWNShared.emptyString(),
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareBaseData();
    // Loop through stat scores, and add their modifiers to our sheet output.
    for (const key in this.stats) {
      this.stats[key].baseTotal = this.stats[key].base + this.stats[key].boost;
      this.stats[key].total = this.stats[key].baseTotal + this.stats[key].temp;
      const v = (this.stats[key].total - 10.5) / 3.5;
      this.stats[key].mod =
        Math.min(2, Math.max(-2, Math[v < 0 ? "ceil" : "floor"](v))) + this.stats[key].bonus;
      
      // Handle stat label localization.
      this.stats[key].label =
        game.i18n.localize(CONFIG.SWN.stats[key]) ?? key;
    }

    this.systemStrain.cyberware = 0;
    this.systemStrain.max = this.stats.con.total - this.systemStrain.cyberware + this.systemStrain.permanent;
    /*
    systemStrain: {
      max: number;
      permanent: number;
      cyberware: number;
    };*/

    // Calculate saves
    const save = {};
    const base = 16 - this.level.value;
    save.physical = Math.max(
      1,
      base - Math.max(this.stats.str.mod, this.stats.con.mod)
    );
    save.evasion = Math.max(
      1,
      base - Math.max(this.stats.dex.mod, this.stats.int.mod)
    );
    save.mental = Math.max(
      1,
      base - Math.max(this.stats.wis.mod, this.stats.cha.mod)
    );
    save.luck = Math.max(1, base);
    this.save = save;
    /*
    schema.encumbrance =; // TODO


    itemTypes;

    save: {
      physical?: number;
      evasion?: number;
      mental?: number;
      luck?: number;
    };
    */
  }

  getRollData() {
    const data = {};

    // Copy the stat scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.stats) {
      for (let [k, v] of Object.entries(this.stats)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data["lvl"] =this.level.value;
    return data;
  }

  async rollSave(saveType) {
    alert("Rolling save: " + saveType);
    const target = this.save[saveType];
    if (isNaN(target)) {
      ui.notifications?.error("Unable to find save: " + saveType);
      return;
    }
    const template = "systems/swnr/templates/dialogs/roll-save.hbs";
    const title = game.i18n.format("swnr.titles.savingThrow", {
      throwType: game.i18n.localize("swnr.sheet.saves." + saveType),
    });
    const dialogData = {};
    const html = await renderTemplate(template, dialogData);
    const _doRoll = async (html) => {
      const rollMode = game.settings.get("core", "rollMode");
      const form = html[0].querySelector("form");
      const modString = ((
        form.querySelector('[name="modifier"]')
      )).value;
      const modifier = parseInt(modString);
      if (isNaN(modifier)) {
        ui.notifications?.error(`Error, modifier is not a number ${modString}`);
        return;
      }
      // old approach const formula = `1d20cs>=(@target - @modifier)`;
      const formula = `1d20`;
      const roll = new Roll(formula, {
        modifier,
        target: target,
      });
      await roll.roll({ async: true });
      const success = roll.total ? roll.total >= target - modifier : false;
      const save_text = game.i18n.format(
        success
          ? game.i18n.localize("swnr.npc.saving.success")
          : game.i18n.localize("swnr.npc.saving.failure"),
        { actor: this.name, target: target - modifier }
      );
      const chatTemplate = "systems/swnr/templates/chat/save-throw.html";
      const chatDialogData = {
        saveRoll: await roll.render(),
        title,
        save_text,
        success,
      };
      const chatContent = await renderTemplate(chatTemplate, chatDialogData);
      const chatData = {
        speaker: ChatMessage.getSpeaker(),
        roll: JSON.stringify(roll),
        content: chatContent,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      };
      getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
      getDocumentClass("ChatMessage").create(chatData);
      // roll.toMessage(
      //   {
      //     speaker: ChatMessage.getSpeaker(),
      //     flavor: title,
      //   },
      //   { rollMode }
      // );
      // return roll;
    };
    const popUpDialog = new ValidatedDialog(
      {
        title: title,
        content: html,
        default: "roll",
        buttons: {
          roll: {
            label: game.i18n.localize("swnr.chat.roll"),
            callback: _doRoll,
          },
        },
      },
      {
        failCallback: () => {
          return;
        },
        classes: ["swnr"],
      }
    );
    const s = popUpDialog.render(true);
    if (s instanceof Promise) await s;
    return;
  
  }
}
