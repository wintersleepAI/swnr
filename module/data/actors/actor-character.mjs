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
          temp: SWNShared.requiredNumber(0,-18),
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
    schema.extra = SWNShared.resourceField(0, 10);

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
      extraHeader: SWNShared.emptyString(),
      showResourceList: new fields.BooleanField({initial: false}),
      resourceList: new fields.ArrayField(new fields.SchemaField({
        name: SWNShared.emptyString(),
        value: SWNShared.requiredNumber(0),
        max: SWNShared.requiredNumber(0),
      })),
      debtDisplay: SWNShared.requiredString("Debt"),
      owedDisplay: SWNShared.requiredString("Owed"),
      balanceDisplay: SWNShared.requiredString("Balance"),
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
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
    //Cyberware
    const cyberware = this.parent.items.filter((i) => i.type === "cyberware");
    let cyberwareStrain = 0;
    //Sum up cyberware strain. force to number
    cyberwareStrain = cyberware.reduce(
      (i, n) => i + Number(n.system.strain),
      0
    );

    // System Strain
    this.systemStrain.cyberware = cyberwareStrain;
    this.systemStrain.max = this.stats.con.total - this.systemStrain.cyberware - this.systemStrain.permanent;
    this.systemStrain.percentage = Math.clamp((this.systemStrain.value * 100) / this.systemStrain.max, 0, 100);

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
    */
    // Access calculation
    this.access.max = this.stats.int.mod;
    // If the character has a program skill add it
    const programSkill = 
      this.parent.items
        .filter((i) => i.type === "skill")
        .filter((i) => i.name === "Program");
    if (programSkill && programSkill.length == 1) {
      this.access.max += programSkill[0].system.rank;
    }

    const useCWNArmor = game.settings.get("swnr", "useCWNArmor") ? true : false;
    const useTrauma = game.settings.get("swnr", "useTrauma") ? true : false;
    
    if (useTrauma) {
      this.modifiedTraumaTarget = this.traumaTarget;
    }

    // AC
    const armor = this.parent.items.filter(
        (i) =>
          i.type === "armor" &&
          i.system.use &&
          i.system.location === "readied"
      );
    const shields = armor.filter((i) => i.system.shield);
    let armorId = "";
    let baseAc = this.baseAc;
    let baseMeleeAc = this.baseAc;
    for (const a of armor) {
      if (a.system.ac > baseAc) {
        baseAc = a.system.ac;
        if (a.system.meleeAc) {
          baseMeleeAc = a.system.meleeAc;
          if (useTrauma) {
            this.modifiedTraumaTarget += a.system.traumaDiePenalty;
          }
        }
        if (a.id) {
          armorId = a.id;
        }
      }
      if (a.system.soak.max > 0) {
        this.soakTotal.max += a.system.soak.max;
        this.soakTotal.value += a.system.soak.value;
      }
    }
    for (const shield of shields) {
      if (shield.system.shieldACBonus && shield.id != armorId) {
        baseAc += shield.system.shieldACBonus;
        if (shield.system.shieldMeleeACBonus) {
          baseMeleeAc += shield.system.shieldMeleeACBonus;
        }
      }
    }
    this.ac = baseAc + this.stats.dex.mod;
    if (useCWNArmor) {
      this.meleeAc = baseMeleeAc + this.stats.dex.mod;
    }

    // effort
    const psychicSkills = 
      this.parent.items.filter(
        (i) =>
          i.type === "skill" &&
          i.system.source.toLocaleLowerCase() ===
            game.i18n.localize("swnr.skills.labels.psionic").toLocaleLowerCase()
      );
    const effort = this.effort;
    effort.max =
      Math.max(
        1,
        1 +
          Math.max(this.stats.con.mod, this.stats.wis.mod) +
          Math.max(0, ...psychicSkills.map((i) => i.system.rank))
      ) + effort.bonus;
    effort.value = effort.max - effort.current - effort.scene - effort.day;

    // extra effort
    const extraEffort = this.tweak.extraEffort;
    extraEffort.value =
      extraEffort.max -
      extraEffort.current -
      extraEffort.scene -
      extraEffort.day;

    effort.percentage = Math.clamp((effort.value * 100) / effort.max, 0, 100);

    //encumbrance
    if (!this.encumbrance)
      this.encumbrance = {
        ready: { max: 0, value: 0, percentage: 100 },
        stowed: { max: 0, value: 0, percentage: 100 },
      };
    const encumbrance = this.encumbrance;
    encumbrance.ready.max = Math.floor(this.stats.str.total / 2);
    encumbrance.stowed.max = this.stats.str.total;
    
    const inventory = this.parent.items.filter(
        (i) => i.type === "item" || i.type === "weapon" || i.type === "armor");
    const itemInvCost = function (i) {
      let itemSize = 1;
      if (i.type === "item") {
        const itemData = i.system;
        const bundle = itemData.bundle;
        itemSize = Math.ceil(
          itemData.quantity / (bundle.bundled ? bundle.amount : 1)
        );
      } else {
        if (i.system.quantity) {
          // Weapons and armor can have qty
          itemSize = i.system.quantity;
        }
      }
      return itemSize * i.system.encumbrance;
    };
    const readiedItems = inventory.filter((i) => i.system.location === "readied");

    encumbrance.ready.value = readiedItems
      .map(itemInvCost)
      .reduce((i, n) => i + n, 0);
    encumbrance.stowed.value = inventory
      .filter((i) => i.system.location === "stowed")
      .map(itemInvCost)
      .reduce((i, n) => i + n, 0);

    encumbrance.ready.percentage = Math.clamp((encumbrance.ready.value * 100) / encumbrance.ready.max, 0, 100);
    encumbrance.stowed.percentage = Math.clamp((encumbrance.stowed.value * 100) / encumbrance.stowed.max, 0, 100);

    const powers = this.parent.items.filter((i) => i.type == "power");

    powers.sort(function (a, b) {
      if (a.system.source == b.system.source) {
        return a.system.level - b.system.level;
      } else {
        return a.system.source.localeCompare(b.system.source);
      }
    });
    this.powers = powers;
      
    this.favorites = this.parent.items.filter((i) => i.system["favorite"]);;
    this.readiedWeapons = readiedItems.filter((i) => i.type === "weapon");
    this.readiedArmor = readiedItems.filter((i) => i.type === "armor");
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

    //Callback for rolling
    const _doRoll = async (_event, button, _html) => {
      const rollMode = game.settings.get("core", "rollMode");
      const modifier = parseInt(button.form.elements.modifier?.value);
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
        { actor: this.parent.name, target: target - modifier }
      );
      const chatTemplate = "systems/swnr/templates/chat/save-throw.hbs";
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
    };
    const popUpDialog = await foundry.applications.api.DialogV2.prompt(
      {
        window: { title: title },
        content: html,
        modal: false,
        rejectClose: false,
        ok: {
            label: game.i18n.localize("swnr.chat.roll"),
            callback: _doRoll,
          },
      }
    );
  }
}
