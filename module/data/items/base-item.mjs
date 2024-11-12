import SWNShared from '../shared.mjs';
import SWNDataModelBase from "../datamodel-base.mjs";

export default class SWNItemBase extends SWNDataModelBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.description = new fields.HTMLField();
    schema.favorite = new fields.BooleanField({initial: false});
    schema.modDesc = SWNShared.nullableString();
    return schema;
  }
}
