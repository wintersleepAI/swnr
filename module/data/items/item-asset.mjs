import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNAsset extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Asset',
  ];
  
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    
    schema.category = SWNShared.stringChoices('cunning', CONFIG.SWN.assetCategories, true);
    schema.type = SWNShared.requiredString("Facility");
    schema.health = SWNShared.resourceField(1, 1)
    schema.rating = SWNShared.requiredNumber(1);
    schema.tl = SWNShared.techLevel(true, 0);
    
    schema.baseOfInfluence = new fields.BooleanField({initial: false});
    schema.unusable = new fields.BooleanField({initial: false});
    schema.stealthed = new fields.BooleanField({initial: false});

    schema.cost = SWNShared.requiredNumber(1);
    schema.income = SWNShared.requiredNumber(0);
    schema.maintenance = SWNShared.requiredNumber(0);
    
    schema.attackTarget = SWNShared.stringChoices(null,  CONFIG.SWN.assetCategories, false);
    schema.attackSource = SWNShared.stringChoices(null, CONFIG.SWN.assetCategories, false);
    schema.attackDamage = SWNShared.emptyString();
    schema.attackSpecial = SWNShared.emptyString(); // Special action taken when attacking
    schema.counter = SWNShared.emptyString();
    
    schema.turnRoll = SWNShared.emptyString(); // Special action taken on or between turns
    schema.locationRoll = SWNShared.emptyString();
    schema.location = SWNShared.emptyString();
    schema.note = SWNShared.emptyString();
    schema.qualities = new fields.SchemaField({
      permission: new fields.BooleanField({initial: false}),
      action: new fields.BooleanField({initial: false}),
      special: new fields.BooleanField({initial: false}),
    })
    
    return schema;
  }
  
  prepareDerivedData() {
    super.prepareBaseData();
    
    this.health.percentage = SWNShared.resourceFieldPercentage(this.health);
  }
  
  static migrateData(data) {
    data = this.migrateNote(data);

    if (data.category == null) {
      data.category = data.assetType ?? 'cunning';
    }

    return data;
  }
  
  static migrateNote(data) {
    if (data.qualities == null && data.note != null) {
      const noteSections = data.note.split(',')
          .map(s => s.trim().toUpperCase());

      data.qualities = {
        permission: noteSections.includes('P'),
        action: noteSections.includes('A'),
        special: noteSections.includes('S'),
      };

      const noteContainsNonQualities =
          noteSections.filter(n => !['P', 'A', 'S'].includes(n)).length > 0;
      if (noteContainsNonQualities) {
        data.description += `<br> Note: ${data.note}`;
      }
      
      delete data.note;
    }
    
    return data;
  }
  
}
