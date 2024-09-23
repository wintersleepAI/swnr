import SWNBaseGearItem from './base-gear-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNArmor extends SWNBaseGearItem {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Armor',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.ac = SWNShared.requiredNumber(10);
    schema.shield = new fields.BooleanField({initial: false});
    schema.use = new fields.BooleanField({initial: false});
    schema.quantity = SWNShared.requiredNumber(1);
    schema.meleeAc = SWNShared.nullableNumber();
    schema.soak = SWNShared.resourceField(0,0);
    schema.dr = SWNShared.requiredNumber(0);
    schema.traumaDiePenalty = SWNShared.requiredNumber(0);
    schema.isSubtle = new fields.BooleanField({initial: false});
    schema.isHeavy = new fields.BooleanField({initial: false});
    schema.shieldMeleeACBonus = SWNShared.nullableNumber();
    schema.shieldACBonus = SWNShared.nullableNumber();
    return schema;
  }
}
