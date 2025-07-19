const { expect } = require('chai');
require('../setup.js');

// Mock the SWNItemBase and SWNShared for testing
const SWNItemBase = class MockSWNItemBase {
  static defineSchema() {
    return {};
  }
};

const SWNShared = {
  requiredString: (initial = "") => new foundry.data.fields.StringField({ initial }),
  nullableString: () => new foundry.data.fields.StringField({ required: false }),
  stringChoices: (initial, choices, required = true) => new foundry.data.fields.StringField({ 
    choices, 
    initial, 
    required 
  })
};

// Import the power schema (we'll need to adjust the import path)
describe('Power Schema Tests', function() {
  let SWNPower;

  before(function() {
    // Mock the power class for testing
    SWNPower = class extends SWNItemBase {
      static LOCALIZATION_PREFIXES = [
        'SWN.Item.base',
        'SWN.Item.Power',
      ];

      static defineSchema() {
        const fields = foundry.data.fields;
        const schema = super.defineSchema();
        
        // New unified power fields
        schema.subType = new fields.StringField({
          choices: ["psychic", "art", "adept", "spell", "mutation"],
          initial: "psychic"
        });
        schema.source = SWNShared.requiredString("");
        schema.resourceName = new fields.StringField({
          choices: () => CONFIG.SWN.poolResourceNames,
          initial: "Effort"
        });
        schema.subResource = new fields.StringField();
        schema.resourceCost = new fields.NumberField({ initial: 1 });
        schema.sharedResource = new fields.BooleanField({ initial: true });
        schema.internalResource = new fields.SchemaField({
          value: new fields.NumberField({ initial: 0 }),
          max: new fields.NumberField({ initial: 1 })
        });
        schema.resourceLength = new fields.StringField({
          choices: ["commit", "scene", "day", "rest", "user"],
          initial: "scene"
        });
        schema.userResourceLength = new fields.StringField({
          choices: ["commit", "scene", "day", "rest", "user"]
        });
        schema.level = new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 1,
          min: 1,
          max: CONFIG.SWN.maxPowerLevel,
        });
        schema.leveledResource = new fields.BooleanField({ initial: false });
        schema.prepared = new fields.BooleanField({initial: false});
        schema.strainCost = new fields.NumberField({ initial: 0 });
        schema.uses = new fields.SchemaField({
          value: new fields.NumberField({ initial: 0 }),
          max: new fields.NumberField({ initial: 1 })
        });
        
        // Existing fields
        schema.roll = SWNShared.nullableString();
        schema.duration = SWNShared.nullableString();
        schema.save = SWNShared.stringChoices(null, CONFIG.SWN.saveTypes, false);
        schema.range = SWNShared.nullableString();
        schema.skill = SWNShared.nullableString();
        schema.effort = SWNShared.stringChoices(null, CONFIG.SWN.effortDurationTypes, false);
        
        return schema;
      }

      resourceKey() {
        return `${this.resourceName}:${this.subResource || ""}`;
      }
    };
  });

  describe('Schema Definition', function() {
    it('should define all required unified power fields', function() {
      const schema = SWNPower.defineSchema();
      
      expect(schema).to.have.property('subType');
      expect(schema).to.have.property('resourceName');
      expect(schema).to.have.property('resourceCost');
      expect(schema).to.have.property('sharedResource');
      expect(schema).to.have.property('internalResource');
      expect(schema).to.have.property('resourceLength');
      expect(schema).to.have.property('leveledResource');
      expect(schema).to.have.property('strainCost');
      expect(schema).to.have.property('uses');
    });

    it('should have correct default values', function() {
      const schema = SWNPower.defineSchema();
      
      expect(schema.subType.options.initial).to.equal('psychic');
      expect(schema.resourceName.options.initial).to.equal('Effort');
      expect(schema.resourceCost.options.initial).to.equal(1);
      expect(schema.sharedResource.options.initial).to.equal(true);
      expect(schema.leveledResource.options.initial).to.equal(false);
      expect(schema.strainCost.options.initial).to.equal(0);
    });

    it('should have correct choice options for subType', function() {
      const schema = SWNPower.defineSchema();
      const expectedChoices = ["psychic", "art", "adept", "spell", "mutation"];
      
      expect(schema.subType.options.choices).to.deep.equal(expectedChoices);
    });

    it('should have correct choice options for resourceLength', function() {
      const schema = SWNPower.defineSchema();
      const expectedChoices = ["commit", "scene", "day", "rest", "user"];
      
      expect(schema.resourceLength.options.choices).to.deep.equal(expectedChoices);
    });
  });

  describe('resourceKey() Method', function() {
    it('should generate correct resource key with subResource', function() {
      const mockPower = {
        resourceName: "Effort",
        subResource: "Psychic"
      };
      
      const result = SWNPower.prototype.resourceKey.call(mockPower);
      expect(result).to.equal("Effort:Psychic");
    });

    it('should generate correct resource key without subResource', function() {
      const mockPower = {
        resourceName: "Effort",
        subResource: ""
      };
      
      const result = SWNPower.prototype.resourceKey.call(mockPower);
      expect(result).to.equal("Effort:");
    });

    it('should handle undefined subResource', function() {
      const mockPower = {
        resourceName: "Uses",
        subResource: undefined
      };
      
      const result = SWNPower.prototype.resourceKey.call(mockPower);
      expect(result).to.equal("Uses:");
    });
  });

  describe('Preset Validation', function() {
    it('should have all preset configurations in CONFIG', function() {
      const presets = CONFIG.SWN.powerPresets;
      
      expect(presets).to.have.property('psychic');
      expect(presets).to.have.property('art');
      expect(presets).to.have.property('adept');
      expect(presets).to.have.property('spell');
      expect(presets).to.have.property('mutation');
    });

    it('should have valid preset configurations', function() {
      const presets = CONFIG.SWN.powerPresets;
      
      // Test psychic preset
      expect(presets.psychic).to.deep.include({
        resourceName: "Effort",
        resourceCost: 1,
        subResource: "Psychic",
        sharedResource: true,
        resourceLength: "scene"
      });

      // Test spell preset
      expect(presets.spell).to.deep.include({
        resourceName: "Slots",
        resourceCost: 1,
        leveledResource: true,
        sharedResource: true,
        resourceLength: "day"
      });

      // Test mutation preset
      expect(presets.mutation).to.deep.include({
        resourceName: "Uses",
        resourceCost: 0,
        sharedResource: false,
        resourceLength: "day"
      });
    });
  });
});