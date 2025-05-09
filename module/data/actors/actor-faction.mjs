import SWNShared from "../shared.mjs";

const MAX_RATING = 8;

export default class SWNFaction extends foundry.abstract
    .TypeDataModel {
  static LOCALIZATION_PREFIXES = [
    'SWN.Actor.base',
    'SWN.Actor.Faction',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    
    schema.description = new fields.HTMLField();
    schema.active = new fields.BooleanField({initial: true});
    schema.health = new fields.SchemaField({
      value: SWNShared.requiredNumber(7),
      temp: SWNShared.requiredNumber(0)
    });
    schema.facCreds = SWNShared.requiredNumber(0);
    schema.xp = SWNShared.requiredNumber(0);
    schema.homeworld = SWNShared.requiredString("");
    
    schema.forceRating = SWNShared.constrainedNumber(1, MAX_RATING, 1);
    schema.cunningRating = SWNShared.constrainedNumber(1, MAX_RATING, 1);
    schema.wealthRating = SWNShared.constrainedNumber(1, MAX_RATING, 1);

    schema.factionGoal = SWNShared.requiredString("");
    schema.factionGoalDesc = SWNShared.requiredString("");
    
    schema.tags = new fields.ArrayField(
        new fields.SchemaField({
          name: SWNShared.requiredString(""),
          desc: SWNShared.requiredString(""),
          effect: SWNShared.requiredString("")
        })
    );
    
    schema.log = new fields.ArrayField(
        new fields.StringField()
    )
    
    return schema;
  }

  prepareDerivedData() {
   
    this.health.max =
        4 +
        this.getHealthForLevel(this.forceRating) +
        this.getHealthForLevel(this.wealthRating) +
        this.getHealthForLevel(this.cunningRating);
    
    this.health.percentage = SWNShared.resourceFieldPercentage(this.health);
  }
  
  getHealthForLevel(level) {
    if (level in CONFIG.SWN.factionHealthXp) {
      return CONFIG.SWN.factionHealthXp[level];
    }
    
    return 0;
  }
  
  async addBase(category, hp){
    if (hp > this.health.max) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.addBaseDialog.baseHpTooHigh", {baseHp: hp,  factionHp: this.health.max}));
      return;
    }
    
    if (hp > this.facCreds) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.addBaseDialog.notEnoughFacCredsForBase", {baseHp: hp,  facCreds: this.facCreds}));
      return;
    }
    
    const newFacCreds = this.facCreds - hp;
    await this.parent.update({"system.facCreds": newFacCreds});
    
    const docData = {
      name: `Base of Inf. ${category}`,
      type: 'asset',
      // TODO Add correct image
      system: {
        category: category,
        baseOfInfluence: true,
        health: {
          value: hp, 
          max: hp
        }
      }
    }
    
    await getDocumentClass('Item').create(docData, {parent: this.parent});
  }
  
  async addTag(tag) {
    if (!tag.name) {
      ui.notifications?.error(game.i18n.localize("swnr.sheet.faction.editTagDialog.noName"));
      return;
    }
    
    tag.desc ??= "";
    tag.effect ??= "";
    
    const tags = this.tags;
    tags.push(tag)
    await this.parent.update({ "system.tags": tags})
  }
  
  async editTag(tag, index) {
    if (!tag.name) {
      ui.notifications?.error(game.i18n.localize("swnr.sheet.faction.editTagDialog.noName"));
      return;
    }

    if (index < 0 || index >= this.tags.length) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.tagIndexInvalid", {index}));
      return;
    }

    tag.desc ??= "";
    tag.effect ??= "";
    const tags = this.tags.toSpliced(index,  1, tag);
    await this.parent.update({ "system.tags": tags})
  }
  
  async removeTag(index) {
    if (index < 0 || index >= this.tags.length) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.tagIndexInvalid", {index}));
      return;
    }
    
    const newTags = this.tags.toSpliced(index, 1);
    await this.parent.update({ "system.tags": newTags });
  }
  
  getTag(index) {
    if (index < 0 || index >= this.tags.length) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.tagIndexInvalid", {index}));
      return;
    }
    
    return this.tags[index];
  }
  
  async addLog(log) {
    if (!log) {
      ui.notifications?.error(game.i18n.localize("swnr.sheet.faction.editLogDialog.noText"));
      return;
    }
    
    const newLog = this.log;
    newLog.push(log);
    await this.parent.update({"system.log": newLog});
  }

  async editLog(log, index) {
    if (!log) {
      ui.notifications?.error(game.i18n.localize("swnr.sheet.faction.editLogDialog.noText"));
      return;
    }

    if (index < 0 || index >= this.log.length) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.logIndexInvalid", {index}));
      return;
    }

    const newLog = this.log.toSpliced(index,  1, log);
    await this.parent.update({"system.log": newLog});
  }

  async removeLog(index) {
    if (index < 0 || index >= this.log.length) {
      ui.notifications?.error(game.i18n.format("swnr.sheet.faction.logIndexInvalid", {index}));
      return;
    }

    const newTags = this.log.toSpliced(index, 1);
    await this.parent.update({ "system.log": newTags });
  }

  async removeAllLogs() {
    await this.parent.update({ "system.log": [] });
  }
}
