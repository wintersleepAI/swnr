import SWNBaseGearItem from './base-gear-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNWeapon extends SWNBaseGearItem {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Weapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.stat = SWNShared.stats("dex");
    schema.secondStat = SWNShared.stats("", true, false);
    schema.skill = SWNShared.requiredString("ask");
    schema.skillBoostsDamage = new fields.BooleanField({initial: false});
    schema.skillBoostsShock = new fields.BooleanField({initial: false});
    schema.shock = new fields.SchemaField({
      dmg: SWNShared.requiredNumber(0),
      ac: SWNShared.requiredNumber(10),
    });
    schema.ab = SWNShared.requiredNumber(0);
    const ammoChoices = Object.keys(CONFIG.SWN.ammoTypes);
    schema.ammo = new fields.SchemaField({
      longReload: new fields.BooleanField({initial: false}),
      suppress: new fields.BooleanField({initial: false}),
      type: SWNShared.stringChoices("ammo", ammoChoices),
      max: SWNShared.requiredNumber(10),
      value: SWNShared.requiredNumber(10),
      burst: new fields.BooleanField({initial: false}),
    });
    schema.range = new fields.SchemaField({
      normal: SWNShared.requiredNumber(1),
      max: SWNShared.requiredNumber(2),
    });
    schema.damage = SWNShared.requiredString("1d6");
    schema.remember = new fields.SchemaField({
      use: new fields.BooleanField({initial: false}),
      burst: new fields.BooleanField({initial: false}),
      modifier: SWNShared.requiredNumber(0),
      isNonLethal: new fields.BooleanField({initial: false}),
    });
    //schema.quantity = SWNShared.requiredNumber(1);
    schema.save = SWNShared.requiredString("");
    schema.trauma = new fields.SchemaField({
      die: SWNShared.requiredString("1d6"),
      rating: SWNShared.nullableNumber(),
    });
    schema.isTwoHanded = new fields.BooleanField({initial: false});
    schema.isNonLethal = new fields.BooleanField({initial: false});

    return schema;
  }
}
