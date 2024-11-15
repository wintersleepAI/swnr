import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNAsset extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Asset',
  ];
  
  static get CurrentDataModelVersion() { return 1 }
  
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
    schema.attackSpecial = new fields.HTMLField(); // Special action taken when attacking
    schema.counter = SWNShared.emptyString();
    
    schema.turnRoll = new fields.HTMLField(); // Special action taken on or between turns
    schema.note = SWNShared.emptyString();
    schema.qualities = new fields.SchemaField({
      permission: new fields.BooleanField({initial: false}),
      action: new fields.BooleanField({initial: false}),
      special: new fields.BooleanField({initial: false}),
    })
    
    return schema;
  }
  
  static migrateDataSafe(data) {
    console.log(data);
    switch (data.dataModelVersion) {
      case undefined:
      case 0:
        data = this.migrateToV1(data);
    }    
    
    data.dataModelVersion = this.CurrentDataModelVersion;
    return data;
  }
  
  static migrateToV1(data) {
    let qualities = data.qualities;
    if (qualities == null) {
      const noteSections = data.note.split(',')
          .map(s => s.trim().toUpperCase());

      qualities = {
        permission: noteSections.includes('P'),
        action: noteSections.includes('A'),
        special: noteSections.includes('S'),
      };
    }
    
    return {
      ...data,
      category: data.assetType,
      qualities: qualities
    }
  }
}
