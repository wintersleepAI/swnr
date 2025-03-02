import SWNItemBase from './base-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNPower extends SWNItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Power',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.source = SWNShared.requiredString("");
    schema.level =  new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      max: CONFIG.SWN.maxPowerLevel,
      
    });
    schema.roll = SWNShared.nullableString();
    schema.duration = SWNShared.nullableString();
    schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saves, false);
    schema.range = SWNShared.nullableString();
    schema.skill = SWNShared.nullableString();
    schema.prepared = new fields.BooleanField({initial: false});
    schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
    return schema;
  }
}
