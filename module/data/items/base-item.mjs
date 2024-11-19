import SWNShared from '../shared.mjs';

export default class SWNItemBase extends foundry.abstract
  .TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.HTMLField();
    schema.favorite = new fields.BooleanField({initial: false});
    schema.modDesc = SWNShared.nullableString();
    return schema;
  }
}
