import SWNVehicleItemBase from './base-ship.mjs';
import SWNShared from '../shared.mjs';

export default class SWNShipWeapon extends SWNVehicleItemBase {
  static LOCALIZATION_PREFIXES = [
    'SWN.Item.base',
    'SWN.Item.vehiclebase',
    'SWN.Item.ShipWeapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.damage = SWNShared.requiredString("1d6");
    schema.ab = SWNShared.requiredNumber(0);
    schema.hardpoint = SWNShared.requiredNumber(1);
    schema.qualities = SWNShared.requiredString("");
    schema.ammo = new fields.SchemaField({
      type: SWNShared.requiredString("ammo"),
      max: SWNShared.requiredNumber(10),
      value: SWNShared.requiredNumber(10),
      burst: new fields.BooleanField({initial: false}),
    });
    schema.trauma = new fields.SchemaField({
      die: SWNShared.requiredString("1d6"),
      rating: SWNShared.nullableNumber(),
      vehicle: new fields.BooleanField({initial: false}),
    });
    schema.range = new fields.SchemaField({
      normal: SWNShared.requiredNumber(1),
      max: SWNShared.requiredNumber(2),
    });
    schema.stat = SWNShared.stats("ask", false, true);
    return schema;
  }
}
