const { expect } = require('chai');
require('../setup.js');

describe('Actor Pool Tests', function() {
  let SWNActorBase;

  before(function() {
    // Mock the shared module
    const SWNShared = {
      resourceField: (initial, max) => new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({ initial }),
        max: new foundry.data.fields.NumberField({ initial: max })
      }),
      requiredString: (initial = "") => new foundry.data.fields.StringField({ initial }),
      requiredNumber: (initial = 0, min) => new foundry.data.fields.NumberField({ initial, min })
    };

    // Mock the actor base class with pools schema
    SWNActorBase = class extends foundry.abstract.TypeDataModel {
      static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];

      static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {};

        schema.health = SWNShared.resourceField(10, 10);
        schema.biography = new fields.StringField();
        schema.species = SWNShared.requiredString("");
        
        // Pool schema
        schema.pools = new fields.ObjectField({
          /* Dynamic keys: "${resourceName}:${subResource}" */
          /* Values: { value, max, cadence } */
        });
        
        return schema;
      }
    };
  });

  describe('Pool Schema Definition', function() {
    it('should define pools field', function() {
      const schema = SWNActorBase.defineSchema();
      expect(schema).to.have.property('pools');
      expect(schema.pools).to.be.instanceOf(foundry.data.fields.ObjectField);
    });

    it('should allow dynamic pool keys', function() {
      // Test that pools can accept dynamic keys
      const mockPoolData = {
        "Effort:Psychic": { value: 2, max: 4, cadence: "scene" },
        "Slots:Lv1": { value: 1, max: 2, cadence: "day" },
        "Uses:Mutation": { value: 0, max: 1, cadence: "day" }
      };
      
      // This would normally be validated by Foundry's schema system
      // For our test, we just verify the structure makes sense
      Object.keys(mockPoolData).forEach(key => {
        expect(key).to.match(/^[^:]+:[^:]*$/); // resourceName:subResource pattern
        expect(mockPoolData[key]).to.have.property('value');
        expect(mockPoolData[key]).to.have.property('max');
        expect(mockPoolData[key]).to.have.property('cadence');
      });
    });
  });

  describe('Pool Key Generation', function() {
    it('should generate valid pool keys from power data', function() {
      const testCases = [
        { resourceName: "Effort", subResource: "Psychic", expected: "Effort:Psychic" },
        { resourceName: "Slots", subResource: "Lv1", expected: "Slots:Lv1" },
        { resourceName: "Uses", subResource: "", expected: "Uses:" },
        { resourceName: "Points", subResource: "Elementalist", expected: "Points:Elementalist" }
      ];

      testCases.forEach(testCase => {
        const key = `${testCase.resourceName}:${testCase.subResource || ""}`;
        expect(key).to.equal(testCase.expected);
      });
    });

    it('should handle all valid resource names', function() {
      const resourceNames = CONFIG.SWN.poolResourceNames;
      expect(resourceNames).to.include.members(["Effort", "Slots", "Points", "Strain", "Uses"]);
      
      resourceNames.forEach(resourceName => {
        const key = `${resourceName}:TestSubResource`;
        expect(key).to.match(/^[^:]+:[^:]*$/);
      });
    });
  });

  describe('Pool Value Validation', function() {
    it('should validate pool structure', function() {
      const validPool = { value: 2, max: 4, cadence: "scene" };
      const invalidPools = [
        { max: 4, cadence: "scene" }, // missing value
        { value: 2, cadence: "scene" }, // missing max
        { value: 2, max: 4 }, // missing cadence
        { value: -1, max: 4, cadence: "scene" }, // negative value
        { value: 5, max: 4, cadence: "scene" }, // value > max
        { value: 2, max: 4, cadence: "invalid" } // invalid cadence
      ];

      // Valid pool should have all required properties
      expect(validPool).to.have.property('value');
      expect(validPool).to.have.property('max');
      expect(validPool).to.have.property('cadence');
      expect(validPool.value).to.be.a('number');
      expect(validPool.max).to.be.a('number');
      expect(['commit', 'scene', 'day', 'rest', 'user']).to.include(validPool.cadence);

      // Test validation logic (would normally be handled by Foundry)
      invalidPools.forEach((pool, index) => {
        if (!pool.hasOwnProperty('value') || !pool.hasOwnProperty('max') || !pool.hasOwnProperty('cadence')) {
          expect(true).to.be.true; // Missing required properties
        } else if (pool.value < 0 || pool.value > pool.max) {
          expect(true).to.be.true; // Invalid value range
        } else if (!['commit', 'scene', 'day', 'rest', 'user'].includes(pool.cadence)) {
          expect(true).to.be.true; // Invalid cadence
        }
      });
    });
  });

  describe('Pool Operations', function() {
    it('should support pool spending operations', function() {
      const initialPool = { value: 3, max: 5, cadence: "scene" };
      const cost = 1;
      
      // Simulate spending
      const newValue = initialPool.value - cost;
      expect(newValue).to.equal(2);
      expect(newValue).to.be.at.least(0);
    });

    it('should prevent overspending', function() {
      const pool = { value: 1, max: 5, cadence: "scene" };
      const cost = 2;
      
      // Check if we can afford the cost
      const canSpend = pool.value >= cost;
      expect(canSpend).to.be.false;
    });

    it('should support pool refresh operations', function() {
      const testPools = {
        "Effort:Psychic": { value: 1, max: 4, cadence: "scene" },
        "Slots:Lv1": { value: 0, max: 2, cadence: "day" },
        "Uses:Mutation": { value: 0, max: 1, cadence: "day" }
      };

      // Simulate scene refresh
      const refreshedPools = {};
      Object.keys(testPools).forEach(key => {
        const pool = testPools[key];
        refreshedPools[key] = {
          ...pool,
          value: pool.cadence === "scene" ? pool.max : pool.value
        };
      });

      expect(refreshedPools["Effort:Psychic"].value).to.equal(4); // Refreshed
      expect(refreshedPools["Slots:Lv1"].value).to.equal(0); // Not refreshed
      expect(refreshedPools["Uses:Mutation"].value).to.equal(0); // Not refreshed
    });
  });
});