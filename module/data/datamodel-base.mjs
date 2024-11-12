import SWNShared from "./shared.mjs";

export default class SWNDataModelBase extends foundry.abstract
    .TypeDataModel {
    static get CurrentDataModelVersion() { return 0 };
    
    static defineSchema() {
        const schema = {};
        schema.dataModelVersion = SWNShared.requiredNumber(this.CurrentDataModelVersion);
        
        return schema;
    }
}