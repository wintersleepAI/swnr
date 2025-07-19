# Sprint S-1 Planning: Unified Power System Foundation

*Implementation plan for Unified Power & Magic Specification v1.1*

**Sprint Goal**: Establish actor pool schema, basic power schema migration, and unit tests for the unified power system foundation.

**Target Version**: v2.0.0

---

## Sprint Deliverables

✅ **Primary**:
- [ ] Actor pool schema implementation (`actor.system.pools`)
- [ ] Power schema migration to unified fields
- [ ] Migration system for existing power items
- [ ] Unit test framework setup and core tests

✅ **Secondary**:
- [ ] Item sheet partials for power subtypes
- [ ] Preset dropdown system
- [ ] Basic validation for pool consistency

---

## Current System Analysis

### Existing Architecture
- **Power Model**: `module/data/items/item-power.mjs` - Basic schema with effort string enum
- **Actor Effort**: `module/data/actors/base-actor.mjs:26-31` - Effort object with bonus/current/scene/day
- **Character Logic**: `actor-character.mjs:196-231` - Effort calculation from stats + psychic ranks
- **Migration System**: `module/migration.mjs` - Version-based sequential migrations
- **Templates**: `templates/item/attribute-parts/power.hbs` - Current power sheet

### Migration Complexity: **Medium Risk**
- Existing effort deeply integrated into character preparation
- No existing pooled resource patterns to follow  
- Well-structured migration system provides good foundation

---

## Implementation Tasks

### 1. Actor Pool Schema (`base-actor.mjs`)

**File**: `module/data/actors/base-actor.mjs`

**Changes**:
```js
// Add to static defineSchema()
pools: new fields.ObjectField({
  /* Dynamic keys: "${resourceName}:${subResource}" */
  /* Values: { value, max, cadence } */
})
```

**Dependencies**: None

**Test Coverage**:
- [ ] Pool object creation and access
- [ ] Dynamic key generation and validation
- [ ] Schema validation for pool values

### 2. Power Schema Extension (`item-power.mjs`)

**File**: `module/data/items/item-power.mjs`

**New Fields** (per specification):
```js
subType: new fields.StringField({
  choices: ["psychic", "art", "adept", "spell", "mutation"],
  initial: "psychic"
}),
source: new fields.StringField(), // Keep existing
resourceName: new fields.StringField({
  choices: () => CONFIG.SWN.poolResourceNames,
  initial: "Effort"
}),
subResource: new fields.StringField(),
resourceCost: new fields.NumberField({ initial: 1 }),
sharedResource: new fields.BooleanField({ initial: true }),
internalResource: new fields.SchemaField({
  value: new fields.NumberField({ initial: 0 }),
  max: new fields.NumberField({ initial: 1 })
}),
resourceLength: new fields.StringField({
  choices: ["commit", "scene", "day", "rest", "user"],
  initial: "scene"
}),
userResourceLength: new fields.StringField({
  choices: ["commit", "scene", "day", "rest", "user"]
}),
level: new fields.NumberField(), // Keep existing
leveledResource: new fields.BooleanField({ initial: false }),
prepared: new fields.BooleanField(), // Keep existing
strainCost: new fields.NumberField({ initial: 0 }),
uses: new fields.SchemaField({
  value: new fields.NumberField({ initial: 0 }),
  max: new fields.NumberField({ initial: 1 })
})
```

**Helper Method**:
```js
resourceKey() {
  return `${this.resourceName}:${this.subResource || ""}`;
}
```

**Dependencies**: CONFIG.SWN.poolResourceNames

**Test Coverage**:
- [ ] Schema validation for all new fields
- [ ] resourceKey() generation
- [ ] Preset application logic
- [ ] Field interdependency validation

### 3. Configuration Updates (`config.mjs`)

**File**: `module/helpers/config.mjs`

**Additions**:
```js
// Pool resource types (extensible at runtime)
SWN.poolResourceNames = ["Effort", "Slots", "Points", "Strain", "Uses"];

// Power presets (per Appendix A)
SWN.powerPresets = {
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
};
```

**Dependencies**: None

**Test Coverage**:
- [ ] Configuration loading and access
- [ ] Preset application to power items
- [ ] Runtime extensibility of poolResourceNames

### 4. Migration Implementation (`migration.mjs`)

**File**: `module/migration.mjs`

**New Migration**: `2.1.0` 

**Actor Migration**:
```js
// Transform existing effort to pools
const effortData = actor.system.effort;
const pools = {
  "Effort:Psychic": {
    value: effortData.bonus + effortData.current + effortData.scene + effortData.day,
    max: effortData.bonus + effortData.current + effortData.scene + effortData.day,
    cadence: "scene"  // Preserve existing behavior
  }
};
actor.system.pools = pools;
delete actor.system.effort; // Remove old system
```

**Power Item Migration**:
```js
// Transform existing power items
power.system.subType = "psychic"; // Default for existing powers
power.system.resourceName = "Effort";
power.system.resourceLength = power.system.effort || "scene";
power.system.sharedResource = true;
power.system.resourceCost = 1;
power.system.subResource = "Psychic";
delete power.system.effort; // Remove old field
```

**Dependencies**: Backup system, validation helpers

**Test Coverage**:
- [ ] Actor effort to pools conversion
- [ ] Power item field migration
- [ ] Migration validation and rollback
- [ ] Backup creation and restore

### 5. Unit Test Framework Setup

**New Files**:
- `test/setup.js` - Test environment configuration
- `test/data/power-schema.test.js` - Power schema tests
- `test/data/actor-pools.test.js` - Actor pool tests  
- `test/migration/v2.1.0.test.js` - Migration tests

**Package.json Changes**:
```json
{
  "scripts": {
    "test": "mocha test/**/*.test.js",
    "test:watch": "mocha test/**/*.test.js --watch"
  },
  "devDependencies": {
    "mocha": "^10.0.0",
    "chai": "^4.3.0"
  }
}
```

**Test Coverage Goals**:
- [ ] Power schema validation (90%+ coverage)
- [ ] Actor pool operations (90%+ coverage)
- [ ] Migration success and failure cases (80%+ coverage)
- [ ] Configuration loading and presets (100% coverage)

### 6. Item Sheet Partials (`power.hbs`)

**File**: `templates/item/attribute-parts/power.hbs`

**Changes**:
- Add subType dropdown with preset selector
- Show/hide fields based on subType selection
- Resource configuration section
- Validation feedback for pool conflicts

**Dependencies**: Power schema, CONFIG.SWN.powerPresets

**Test Coverage**: Manual QA (no automated UI tests in Sprint 1)

---

## Risk Mitigation

### High Risk: Migration Data Loss
**Mitigation**:
- Comprehensive backup before migration starts
- Dry-run validation with detailed reporting
- Per-actor validation with rollback capability
- Migration progress logging for debugging

### Medium Risk: Performance with Large Power Counts
**Mitigation**:
- Pool caching with selective invalidation  
- Benchmark with 50+ power NPCs during testing
- Lazy pool computation where possible

### Medium Risk: Schema Validation Complexity
**Mitigation**:
- Unit tests for all field combinations
- Validation helper functions for complex interdependencies
- Clear error messages for invalid configurations

---

## Testing Strategy

### Unit Test Priorities
1. **Core Schema** - Power field validation, actor pool structure
2. **Migration Logic** - Data transformation accuracy and error handling
3. **Configuration** - Preset loading and application
4. **Helper Functions** - resourceKey() generation and validation

### Integration Test Approach
- Migration testing with sample world data
- Pool calculation accuracy across actor types
- Sheet rendering with various power configurations

### Performance Benchmarks
- Actor.prepareDerivedData() timing with 50+ powers
- Migration speed with 1000+ power items
- Memory usage during pool computation

---

## Dependencies & Blockers

### External Dependencies
- Foundry VTT v13 compatibility
- ESLint configuration updates for new files

### Internal Dependencies  
- Current migration system patterns
- Existing item sheet infrastructure
- CONFIG object structure

### Potential Blockers
- Unknown edge cases in existing power data
- Migration system limitations for embedded documents
- Performance issues with large world datasets

---

## Sprint Success Criteria

### Must Have ✅
- [ ] All existing power items migrate without data loss
- [ ] New power schema accepts all specified field combinations
- [ ] Actor pools system functions for basic effort tracking
- [ ] Migration system validates and reports progress
- [ ] Unit test coverage >80% for core functionality

### Should Have 🎯
- [ ] Item sheet supports subType selection and presets
- [ ] Validation prevents conflicting pool configurations
- [ ] Performance acceptable for 50+ power actors (<15ms prepareDerivedData)

### Nice to Have 💫
- [ ] Advanced preset customization on item sheets
- [ ] Migration progress UI for large worlds
- [ ] Automated performance regression testing

---

## Post-Sprint Handoff

### For Sprint S-2
- **Ready**: Actor pool infrastructure, power schema foundation
- **Needed**: Chat card refactor, power.use() mutex implementation
- **Documentation**: Migration report, performance benchmarks

### Documentation Updates
- [ ] Update `knownIssues.md` with any new issues discovered
- [ ] Create `MIGRATION.md` guide for world administrators
- [ ] Update `CLAUDE.md` with new testing commands and architecture notes

---

*Next Review: End of Sprint S-1*  
*Document Version: 1.0 - Created during Sprint Planning*