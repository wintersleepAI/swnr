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
        // initial: '+@str.mod+ceil(@lvl / 2)',
        initial: '+0',
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

  async addOneUse() {
    let item = this.parent;
    //const actor = item.actor;
    if (item.type === "item" && this.uses.consumable !== "none") {
      const uses = this.uses;
      if (uses.value == 0 && this.uses.keepEmpty && this.uses.emptyQuantity > 0) {
        // If keepEmpty is true, just set to 1
        await item.update({ "system.uses.value": 1, "system.uses.emptyQuantity": this.uses.emptyQuantity - 1 });
        // for modifying qty, "system.quantity": this.quantity + 1 });
        ui.notifications?.info(
          `Removing an empty ${item.name} and adding uses.`
        );
      } else if (uses.value < uses.max) {
        await item.update({ "system.uses.value": uses.value + 1 });
      } else if (uses.value >= uses.max && this.uses.keepEmpty && this.uses.emptyQuantity > 0) {
        // start filling an emtpy item 
        await item.update({ "system.uses.value": 1, "system.uses.emptyQuantity": this.uses.emptyQuantity - 1 });
        ui.notifications?.info(
          `Removing an empty ${item.name} and adding uses.`
        );
      }
    } else {
      console.warn("Cannot add uses to non-item/gear type");
    }
  }

  async removeOneUse() {
    let item = this.parent;
    //const actor = item.actor;
    if (item.type === "item" && this.uses.consumable !== "none") {
      const uses = this.uses;
      if (uses.value > 1) {
        await item.update({ "system.uses.value": uses.value - 1 });
      } else if (uses.value == 1) {
        // Last one
        let newUses = 0;
        const remaining = this.quantity - this.uses.emptyQuantity;
        if (remaining > 1) {
          // If remaining is greater than 1, just reduce the quantity
          newUses = this.uses.max;
        }
        // Uses up the item
        if (this.uses.keepEmpty) {
          // If keepEmpty is true, just set to 0
          const emptyQuantity = this.uses.emptyQuantity || 0;
          await item.update({ "system.uses.value": newUses, "system.uses.emptyQuantity": emptyQuantity + 1 });
          // for updating qty, "system.quantity": this.quantity - 1 });
          ui.notifications?.info(
            `Adding an empty ${item.name}.`
          );
        } else {
          // If keepEmpty is false, remove the item
          if (this.quantity > 1) {
            // If quantity is greater than 1, just reduce the quantity
            await item.update({ "system.quantity": this.quantity - 1, "system.uses.value": newUses });
          } else {
            ui.notifications?.info(
              `Setting item ${item.name} to quantity 0. Delete if no longer needed.`
            );
            await item.update({ "system.quantity": 0, "system.uses.value": 0 });

            // OLD CODE for deletintg the item
            // // If quantity is 1, delete the item
            // ui.notifications?.info(
            //   `Removing item ${item.name} as it has no uses left and it does not keep empties.`
            // );
            // await item.delete();
          }
        }
      }
    } else {
      console.warn("Cannot remove uses from non-item/gear type");
    }
  }
}
