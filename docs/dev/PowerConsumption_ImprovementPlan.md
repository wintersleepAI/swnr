# Power & Consumption System Improvement Plan

*Plan Date: 21 Jul 2025*  
*Completion Date: 21 Jul 2025*  
*Based on: PowerConsumption_NamingInconsistencies.md analysis*  
*Status: ✅ **COMPLETED v2.2.1***

## Plan Overview

~~This plan addresses **critical implementation gaps** in the unified power system, focusing on completing the missing foundation pieces that are causing runtime errors and pool lookup failures.~~

**✅ IMPLEMENTATION COMPLETE**: All critical issues have been resolved. The unified power system now has complete resource field integration with proper schema validation, automatic migration, and comprehensive UI support.

## ✅ Implementation Summary

### What Was Completed:
- **Schema Fields**: Added `resourceName` (nullable) and `subResource` (nullable) to power schema
- **Resource Key Method**: Implemented `power.system.resourceKey()` returning `"ResourceName:SubResource"`
- **Dead Code Cleanup**: Fixed all references to non-existent fields in templates and tests  
- **Pool Key Unification**: Replaced manual construction with consistent `resourceKey()` method
- **Migration System**: v2.2.1 migration automatically populates fields from existing power data
- **UI Integration**: Added resource configuration section to power sheets with ApplicationV2 patterns
- **Schema Validation**: Fixed Foundry V13 validation issues with proper nullable field handling

### Final Status:
- **✅ Runtime Errors**: Eliminated - no more missing method or undefined field errors
- **✅ Pool Lookup**: Working - powers and features use consistent pool key format
- **✅ Migration**: Tested - automatic population from subType, source, and level data  
- **✅ User Interface**: Complete - clean, integrated power sheet resource section
- **✅ Architecture**: Consistent - follows existing ApplicationV2 and KISS principles

## ~~Phase 1: Critical Fixes~~ ✅ **COMPLETED**

**⚠️ IMPORTANT**: Analysis of branch changes revealed significant dead code issues that must be addressed alongside the missing implementation. See `PowerConsumption_DeadCodeAnalysis.md` for details.

### 1.1 Implement Missing Core Schema Fields ⚠️ **CRITICAL**

**File**: `module/data/items/item-power.mjs`  
**Location**: Add after line 26 (level field)

```javascript
// Resource identification fields (required for resourceKey method)
schema.resourceName = new fields.StringField({
  choices: ["Effort", "Slots", "Points", "Strain", "Uses", ""],
  initial: ""
});
schema.subResource = new fields.StringField({
  initial: ""
});
```

### 1.2 Implement `resourceKey()` Method ⚠️ **CRITICAL**

**File**: `module/data/items/item-power.mjs`  
**Location**: Add after prepareDerivedData() method (around line 84)

```javascript
/**
 * Generate the pool key for this power's resource consumption
 * @returns {string} Pool key in format "ResourceName:SubResource"
 */
resourceKey() {
  if (!this.resourceName || this.resourceName === "") {
    return ""; // Passive power, no resource consumption
  }
  return `${this.resourceName}:${this.subResource || ""}`;
}
```

### 1.3 Fix Dead Code References ⚠️ **CRITICAL**

**File**: `module/data/items/item-power.mjs`  
**Location**: Lines 287-293 (_createPowerChatCard method)

```javascript
// CURRENT (causes runtime errors - references non-existent fields):
const templateData = {
  // ... other fields ...
  resourceSpent: this.resourceCost || 0,      // ❌ resourceCost not in schema
  resourceName: this.resourceName,            // ❌ resourceName not in schema  
  resourceKey: this.resourceKey(),            // ❌ resourceKey() not implemented
  strainCost: this.strainCost || 0,           // ❌ strainCost not in schema
  isPassive: this.resourceName === "",        // ❌ resourceName not in schema
  consumptions: consumptionResults
};

// REPLACE WITH (temporary fix until schema complete):
const templateData = {
  // ... other fields ...
  resourceSpent: 0, // TODO: Calculate from consumption array
  resourceName: this.parent.system.source || "Unknown",
  resourceKey: `Effort:${this.parent.system.source || ""}`, // Fallback pattern
  strainCost: 0,    // TODO: Calculate from consumption array  
  isPassive: !this.hasConsumption(),
  consumptions: consumptionResults
};
```

### 1.4 Fix Test Code References ⚠️ **HIGH**

**File**: `module/helpers/test-helpers.mjs`  
**Locations**: Lines 384-385, 500-502, and other test power creation

```javascript
// REMOVE all references to non-existent fields:
// resourceName: "Effort",        // ❌ Not in power schema
// resourceCost: 1,               // ❌ Not in power schema

// REPLACE with proper consumption array structure in tests
```

## Phase 2: Pool Key Pattern Unification (2-3 days)

### 2.1 Replace Manual Pool Key Construction

**Target Files**: `module/data/items/item-power.mjs`

**Locations to update**:
- Line 348: `const poolKey = this.resourceKey();` (instead of `Effort:${source}`)
- Line 443: `const poolKey = this.resourceKey();` (instead of `Effort:${source}`)
- Line 495: `const poolKey = this.resourceKey();` (instead of hardcoded "Points:Spell")

### 2.2 Update Consumption Type Handlers

**File**: `module/data/items/item-power.mjs`  
**Methods**: `_processSourceEffort()`, `_processSpellPoints()`

```javascript
// BEFORE:
async _processSourceEffort(actor, consumes) {
  const source = this.parent.system.source || "";
  const poolKey = `Effort:${source}`;
  // ...
}

// AFTER:
async _processSourceEffort(actor, consumes) {
  const poolKey = this.resourceKey();
  if (!poolKey) {
    return { success: false, reason: "no-resource-defined" };
  }
  // ...
}
```

### 2.3 Standardize Hardcoded References

Replace all hardcoded pool keys with dynamic construction:

```javascript
// BEFORE:
const spellPool = spellPools["Points:Spell"];

// AFTER:
const poolKey = this.resourceKey();
const spellPool = spellPools[poolKey];
```

## Phase 3: Data Migration & Validation (1-2 days)

### 3.1 Create Power Data Migration

**File**: `module/migration.mjs`  
**Add new migration version**: 2.2.1

```javascript
// Migration to populate resourceName/subResource from existing source/subType
async function migrate_2_2_1() {
  const actors = game.actors.contents;
  let powersMigrated = 0;
  
  for (const actor of actors) {
    const powers = actor.items.filter(i => i.type === "power");
    
    for (const power of powers) {
      const system = foundry.utils.deepClone(power.system);
      let needsUpdate = false;
      
      // Populate resourceName based on subType and existing patterns
      if (!system.resourceName) {
        switch (system.subType) {
          case "psychic":
          case "art": 
          case "adept":
            system.resourceName = "Effort";
            system.subResource = system.source || system.subType;
            needsUpdate = true;
            break;
          case "spell":
            system.resourceName = "Slots";
            system.subResource = `Lv${system.level || 1}`;
            needsUpdate = true;
            break;
          case "mutation":
            system.resourceName = "Uses";
            system.subResource = "";
            needsUpdate = true;
            break;
        }
      }
      
      if (needsUpdate) {
        await power.update({ "system": system });
        powersMigrated++;
      }
    }
  }
  
  console.log(`Migration 2.2.1: ${powersMigrated} powers updated with resource fields`);
}
```

### 3.2 Add Pool Key Validation

**File**: `module/helpers/test-helpers.mjs`  
**Add validation function**:

```javascript
/**
 * Validate pool key consistency between powers and features
 */
async function validatePoolKeyConsistency(actor) {
  const powers = actor.items.filter(i => i.type === "power");
  const features = actor.items.filter(i => i.type === "feature");
  const actorPools = Object.keys(actor.system.pools || {});
  
  const issues = [];
  
  // Check if powers reference pools that exist
  for (const power of powers) {
    if (power.system.hasConsumption()) {
      const poolKey = power.system.resourceKey();
      if (poolKey && !actorPools.includes(poolKey)) {
        issues.push({
          type: "missing-pool",
          power: power.name,
          poolKey,
          availablePools: actorPools
        });
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

## Phase 4: UI & User Experience (2-3 days)

### 4.1 Update Power Sheet Template

**File**: `templates/item/attribute-parts/power.hbs`  

Add resource selection UI for the new fields:
```handlebars
<div class="resource-config">
  <div class="form-group">
    <label>{{localize "SWN.Item.Power.resourceName"}}</label>
    <select name="system.resourceName" value="{{system.resourceName}}">
      <option value="">None (Passive)</option>
      <option value="Effort">Effort</option>
      <option value="Slots">Spell Slots</option>
      <option value="Points">Points</option>
      <option value="Strain">System Strain</option>
      <option value="Uses">Uses</option>
    </select>
  </div>
  
  <div class="form-group">
    <label>{{localize "SWN.Item.Power.subResource"}}</label>
    <input type="text" name="system.subResource" value="{{system.subResource}}" 
           placeholder="e.g., Psychic, Lv1, Elementalist">
  </div>
</div>
```

### 4.2 Add Preset System for Quick Setup

**File**: `module/helpers/config.mjs`  

```javascript
// Add power presets for quick configuration
SWN.powerPresets = {
  psychic: { resourceName: "Effort", subResource: "Psychic" },
  art: { resourceName: "Effort", subResource: "" },  
  adept: { resourceName: "Effort", subResource: "Adept" },
  spell1: { resourceName: "Slots", subResource: "Lv1" },
  spell2: { resourceName: "Slots", subResource: "Lv2" },
  // ... etc
};
```

## Phase 5: Testing & Validation (1-2 days)

### 5.1 Comprehensive Test Suite

Update existing tests in `module/helpers/test-helpers.mjs`:

```javascript
// Test resourceKey() method implementation
async function testResourceKeyMethod() {
  const testPower = await createTestPower({
    resourceName: "Effort",
    subResource: "Psychic"
  });
  
  const poolKey = testPower.system.resourceKey();
  return {
    name: "resourceKey() returns correct format",
    result: poolKey === "Effort:Psychic"
  };
}

// Test pool key consistency
async function testPoolKeyConsistency() {
  // Create feature that grants effort pool
  // Create power that uses same pool
  // Verify they use same pool key
}
```

### 5.2 Migration Validation

Run comprehensive validation after migration:
- All powers have valid `resourceName`/`subResource` values
- No powers reference non-existent pools  
- All pool keys follow consistent format
- No runtime errors from missing methods

## Implementation Priority Matrix

| Task | Priority | Dependencies | Est. Hours |
|------|----------|--------------|------------|
| Add schema fields | CRITICAL | None | 2 |
| Implement resourceKey() | CRITICAL | Schema fields | 2 |
| Update method calls | CRITICAL | resourceKey() | 2 |
| Replace manual construction | HIGH | resourceKey() | 4 |
| Update consumption handlers | HIGH | Replace manual | 3 |
| Create migration | HIGH | Schema complete | 6 |
| Add validation | MEDIUM | Migration | 4 |
| Update UI templates | MEDIUM | Schema complete | 6 |
| Comprehensive testing | HIGH | All above | 8 |

**Total Estimated Effort**: 50-54 hours (~7 days)  
**Original Plan**: 37 hours  
**Dead Code Cleanup**: +13-17 hours

## Risk Mitigation

### Backward Compatibility
- Maintain fallbacks during transition period
- Test with existing world data
- Provide clear upgrade path documentation

### Data Integrity
- Create world backup before migration
- Validate all changes with test suite
- Add runtime warnings for inconsistencies

### User Experience
- Provide preset system for common configurations
- Clear error messages for missing configurations
- Documentation for GM pool management

## Success Criteria

✅ **Phase 1 Complete When**:
- No runtime errors from missing `resourceKey()` method
- All power templates render without errors
- Basic power usage functions correctly

✅ **Phase 2 Complete When**:
- All pool key construction uses consistent pattern
- Powers and features reference same pools correctly
- No hardcoded pool key strings remain

✅ **All Phases Complete When**:
- Full test suite passes
- Migration completes successfully on test worlds
- Pool key validation returns no issues
- User interface allows complete power configuration

This plan transforms the current fragmented implementation into a cohesive, well-tested system that fully realizes the unified power specification.