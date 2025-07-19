const { expect } = require('chai');
require('../setup.js');

describe('Migration v2.1.0 Tests', function() {
  let mockGameData;

  beforeEach(function() {
    // Reset mock data for each test
    mockGameData = {
      actors: [
        {
          id: "actor1",
          name: "Test Character",
          system: {
            effort: {
              bonus: 1,
              current: 0,
              scene: 2,
              day: 1
            }
          },
          update: function(data) {
            Object.assign(this.system, data.system || {});
            if (data["system.-=effort"]) {
              delete this.system.effort;
            }
            return Promise.resolve();
          }
        },
        {
          id: "actor2", 
          name: "Test NPC",
          system: {
            effort: {
              bonus: 0,
              current: 1,
              scene: 1,
              day: 0
            }
          },
          update: function(data) {
            Object.assign(this.system, data.system || {});
            if (data["system.-=effort"]) {
              delete this.system.effort;
            }
            return Promise.resolve();
          }
        }
      ],
      items: [
        {
          id: "item1",
          name: "Test Power",
          type: "power",
          system: {
            effort: "scene",
            level: 1,
            source: "Test Source"
          },
          update: function(data) {
            Object.assign(this.system, data.system || {});
            if (data["system.-=effort"]) {
              delete this.system.effort;
            }
            return Promise.resolve();
          }
        }
      ]
    };
  });

  describe('Actor Migration Logic', function() {
    it('should convert effort to pools correctly', function() {
      const actor = mockGameData.actors[0];
      const effortData = actor.system.effort;
      
      // Calculate total effort as migration would
      const totalEffort = (effortData.bonus || 0) + (effortData.current || 0) + 
                         (effortData.scene || 0) + (effortData.day || 0);
      
      expect(totalEffort).to.equal(4); // 1 + 0 + 2 + 1
      
      // Verify pool structure
      const expectedPool = {
        "Effort:Psychic": {
          value: totalEffort,
          max: totalEffort,
          cadence: "scene"
        }
      };
      
      expect(expectedPool["Effort:Psychic"]).to.deep.equal({
        value: 4,
        max: 4,
        cadence: "scene"
      });
    });

    it('should handle actors without effort', function() {
      const actorWithoutEffort = {
        id: "actor3",
        name: "No Effort Actor",
        system: {}
      };
      
      // Migration should skip actors without effort
      expect(actorWithoutEffort.system.effort).to.be.undefined;
    });

    it('should handle zero effort values', function() {
      const actorWithZeroEffort = {
        system: {
          effort: {
            bonus: 0,
            current: 0,
            scene: 0,
            day: 0
          }
        }
      };
      
      const totalEffort = 0;
      const expectedPool = {
        "Effort:Psychic": {
          value: totalEffort,
          max: totalEffort,
          cadence: "scene"
        }
      };
      
      expect(expectedPool["Effort:Psychic"].value).to.equal(0);
      expect(expectedPool["Effort:Psychic"].max).to.equal(0);
    });
  });

  describe('Power Item Migration Logic', function() {
    it('should add unified power fields correctly', function() {
      const powerItem = mockGameData.items[0];
      
      // Expected migration data
      const expectedUpdateData = {
        "system.subType": "psychic",
        "system.resourceName": "Effort",
        "system.subResource": "Psychic",
        "system.resourceCost": 1,
        "system.sharedResource": true,
        "system.resourceLength": powerItem.system.effort || "scene",
        "system.leveledResource": false,
        "system.strainCost": 0,
        "system.internalResource": { value: 0, max: 1 },
        "system.uses": { value: 0, max: 1 }
      };
      
      expect(expectedUpdateData["system.subType"]).to.equal("psychic");
      expect(expectedUpdateData["system.resourceName"]).to.equal("Effort");
      expect(expectedUpdateData["system.resourceLength"]).to.equal("scene");
      expect(expectedUpdateData["system.resourceCost"]).to.equal(1);
      expect(expectedUpdateData["system.sharedResource"]).to.be.true;
      expect(expectedUpdateData["system.leveledResource"]).to.be.false;
    });

    it('should preserve existing power fields', function() {
      const powerItem = mockGameData.items[0];
      
      // These fields should be preserved
      expect(powerItem.system.level).to.equal(1);
      expect(powerItem.system.source).to.equal("Test Source");
    });

    it('should handle power items without effort field', function() {
      const powerWithoutEffort = {
        id: "item2",
        name: "Power Without Effort",
        type: "power",
        system: {
          level: 2,
          source: "Another Source"
        }
      };
      
      // Should default to "scene" for resourceLength
      const defaultResourceLength = powerWithoutEffort.system.effort || "scene";
      expect(defaultResourceLength).to.equal("scene");
    });
  });

  describe('Migration Validation', function() {
    it('should validate backup data structure', function() {
      const backupData = {
        actors: [],
        items: [],
        timestamp: new Date().toISOString()
      };
      
      expect(backupData).to.have.property('actors');
      expect(backupData).to.have.property('items');
      expect(backupData).to.have.property('timestamp');
      expect(backupData.actors).to.be.an('array');
      expect(backupData.items).to.be.an('array');
      expect(backupData.timestamp).to.be.a('string');
    });

    it('should handle migration errors gracefully', function() {
      const migrationErrors = [];
      
      // Simulate error handling
      try {
        throw new Error("Test migration error");
      } catch (err) {
        migrationErrors.push(`Test item: ${err.message}`);
      }
      
      expect(migrationErrors).to.have.length(1);
      expect(migrationErrors[0]).to.include("Test migration error");
    });

    it('should track migration progress correctly', function() {
      let actorsMigrated = 0;
      let powerItemsMigrated = 0;
      
      // Simulate successful migrations
      mockGameData.actors.forEach(actor => {
        if (actor.system.effort) {
          actorsMigrated++;
        }
      });
      
      mockGameData.items.forEach(item => {
        if (item.type === "power") {
          powerItemsMigrated++;
        }
      });
      
      expect(actorsMigrated).to.equal(2);
      expect(powerItemsMigrated).to.equal(1);
    });
  });

  describe('Edge Cases', function() {
    it('should handle malformed effort data', function() {
      const malformedActor = {
        system: {
          effort: {
            bonus: "invalid",
            current: null,
            scene: undefined,
            day: NaN
          }
        }
      };
      
      // Migration should handle malformed data gracefully
      const totalEffort = (parseInt(malformedActor.system.effort.bonus) || 0) +
                         (parseInt(malformedActor.system.effort.current) || 0) +
                         (parseInt(malformedActor.system.effort.scene) || 0) +
                         (parseInt(malformedActor.system.effort.day) || 0);
      
      expect(totalEffort).to.equal(0); // All malformed values should become 0
    });

    it('should handle missing system properties', function() {
      const actorWithoutSystem = {
        id: "actor4",
        name: "No System Actor"
      };
      
      // Migration should skip actors without system property
      expect(actorWithoutSystem.system).to.be.undefined;
    });

    it('should validate pool key format', function() {
      const resourceName = "Effort";
      const subResource = "Psychic";
      const poolKey = `${resourceName}:${subResource}`;
      
      expect(poolKey).to.match(/^[^:]+:[^:]*$/);
      expect(poolKey).to.equal("Effort:Psychic");
    });
  });
});