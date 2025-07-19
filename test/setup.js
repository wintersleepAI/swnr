/**
 * Test environment configuration for SWNR system tests
 */

// Mock Foundry VTT globals for testing
global.CONFIG = {
  SWN: {
    maxPowerLevel: 5,
    poolResourceNames: ["Effort", "Slots", "Points", "Strain", "Uses"],
    powerPresets: {
      psychic: { 
        resourceName: "Effort", 
        resourceCost: 1, 
        subResource: "Psychic", 
        sharedResource: true, 
        resourceLength: "scene" 
      },
      art: { 
        resourceName: "Effort", 
        resourceCost: 1, 
        subResource: "", 
        sharedResource: true, 
        resourceLength: "day" 
      },
      adept: { 
        resourceName: "Effort", 
        resourceCost: 1, 
        subResource: "Adept", 
        sharedResource: true, 
        resourceLength: "day" 
      },
      spell: { 
        resourceName: "Slots", 
        resourceCost: 1, 
        leveledResource: true, 
        sharedResource: true, 
        resourceLength: "day" 
      },
      mutation: { 
        resourceName: "Uses", 
        resourceCost: 0, 
        subResource: "", 
        sharedResource: false, 
        resourceLength: "day" 
      }
    }
  }
};

// Mock foundry data fields
global.foundry = {
  data: {
    fields: {
      StringField: class MockStringField {
        constructor(options = {}) {
          this.options = options;
        }
      },
      NumberField: class MockNumberField {
        constructor(options = {}) {
          this.options = options;
        }
      },
      BooleanField: class MockBooleanField {
        constructor(options = {}) {
          this.options = options;
        }
      },
      SchemaField: class MockSchemaField {
        constructor(schema = {}) {
          this.schema = schema;
        }
      },
      ObjectField: class MockObjectField {
        constructor(options = {}) {
          this.options = options;
        }
      }
    }
  },
  utils: {
    deepClone: (obj) => JSON.parse(JSON.stringify(obj))
  }
};

// Mock base classes
global.TypeDataModel = class MockTypeDataModel {
  static defineSchema() {
    return {};
  }
};

// Export for use in tests
module.exports = {
  CONFIG: global.CONFIG,
  foundry: global.foundry
};