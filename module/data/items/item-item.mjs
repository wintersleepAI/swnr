import SWNBaseGearItem from './base-gear-item.mjs';
import SWNShared from '../shared.mjs';

export default class SWNItemItem extends SWNBaseGearItem {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.Gear',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Break down roll formula into three independent fields
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({
        ...requiredInteger,
        initial: 1,
        min: 1,
      }),
      diceSize: new fields.StringField({ initial: 'd20' }),
      diceBonus: new fields.StringField({
        initial: '+@str.mod+ceil(@lvl / 2)',
      }),
    });

    schema.formula = new fields.StringField({ blank: true });
    schema.uses = new fields.SchemaField({
      max: SWNShared.requiredNumber(1),
      value: SWNShared.requiredNumber(1),
      emptyQuantity: SWNShared.requiredNumber(0),
      consumable: SWNShared.stringChoices('none', CONFIG.SWN.itemConsumableTypes),
      ammo: SWNShared.stringChoices("none", CONFIG.SWN.ammoTypes),
      keepEmpty: new fields.BooleanField({
        initial: true,
        required: true,
        nullable: false,
      }),
    });
    return schema;
  }

  prepareDerivedData() {
    // Build the formula dynamically using string interpolation
    const roll = this.roll;

    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}
