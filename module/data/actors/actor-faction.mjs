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
    
    schema.forceRating = SWNShared.constrainedNumber(1, MAX_RATING);
    schema.cunningRating = SWNShared.constrainedNumber(1, MAX_RATING);
    schema.wealthRating = SWNShared.constrainedNumber(1, MAX_RATING);

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
}
