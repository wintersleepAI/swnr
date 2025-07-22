# Dead Code Analysis: Power & Consumption System

*Analysis Date: 21 Jul 2025*  
*Git Diff: main...SpaceMagic branch*  
*Total Changes: +8607 lines, -218 lines across 40 files*

## Executive Summary

During the unified power system implementation, **significant dead code and legacy remnants** were introduced alongside the new consumption system. The implementation added **549 new lines** to `item-power.mjs` while only removing **7 lines**, indicating incomplete cleanup of legacy patterns.

## Critical Dead Code Identified

### 1. Legacy Resource Fields in Power Schema ⚠️ **REMOVE**

**Current State**: Multiple resource reference systems coexist

**Dead/Broken References in item-power.mjs**:
```javascript
// Line 289 - References non-existent fields
resourceSpent: this.resourceCost || 0,      // ❌ resourceCost not in schema
resourceName: this.resourceName,            // ❌ resourceName not in schema  
resourceKey: this.resourceKey(),            // ❌ resourceKey() method not implemented
strainCost: this.strainCost || 0,           // ❌ strainCost not in schema
isPassive: this.resourceName === "",        // ❌ resourceName not in schema
```

**Impact**: These references will return `undefined` and cause runtime errors or incorrect UI display.

### 2. Legacy Effort System Remnants ⚠️ **REQUIRES MIGRATION PLAN**

**Location**: Multiple files still reference old effort system

**Active Legacy Code**:
```javascript
// module/helpers/chat.mjs:501-520 - Legacy effort spending
if (t.system.effort.value == 0) {
  ui.notifications?.info(`${t.name} has no available effort`);
  return;
}
const updated_effort = t.system.effort[effort] + 1;
const effort_key = `system.effort.${effort}`;
await t.update({ [effort_key]: updated_effort });
```

**Legacy Schema Still Present**:
```javascript
// module/data/actors/base-actor.mjs:26-37
schema.effort = new fields.SchemaField({
  bonus: new fields.NumberField({ initial: 0, integer: true }),
  current: new fields.NumberField({ initial: 0, integer: true }),
  scene: new fields.NumberField({ initial: 0, integer: true }),
  day: new fields.NumberField({ initial: 0, integer: true }),
  permanent: new fields.NumberField({ initial: 0, integer: true }),
  value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
  // ... other fields
});
```

**Issue**: Two effort systems running in parallel - legacy `system.effort` and new `system.pools["Effort:*"]`.

### 3. Unused Power Preset System ⚠️ **INCOMPLETE FEATURE**

**Location**: `module/helpers/config.mjs:92-125`

```javascript
// Power presets that are defined but not used anywhere
SWN.powerPresets = {
  psychic: { resourceName: "Effort", resourceCost: 1, /* ... */ },
  art: { resourceName: "Effort", resourceCost: 1, /* ... */ },
  adept: { resourceName: "Effort", resourceCost: 1, /* ... */ },
  spell: { resourceName: "Slots", resourceCost: 1, /* ... */ },
  mutation: { resourceName: "Uses", resourceCost: 0, /* ... */ }
};
```

**Problem**: References `resourceName` and `resourceCost` fields that don't exist in power schema.

### 4. Orphaned Test Code ⚠️ **CLEANUP NEEDED**

**Location**: `module/helpers/test-helpers.mjs`

**Multiple test functions reference non-existent fields**:
```javascript
// Lines 384-385, 500-502 - Test data using missing schema fields
resourceName: "Effort",        // ❌ Not in power schema
resourceCost: 1,               // ❌ Not in power schema
```

### 5. Migration Code Inconsistencies ⚠️ **VALIDATION NEEDED**

**Location**: `module/migration.mjs:436-626`

**Problem**: Migration converts legacy fields to consumption array but may reference wrong field names:
```javascript
// Migration might be creating consumption entries that reference
// non-existent resourceName/resourceCost fields
```

## Dead Code by Category

### Category A: Immediate Runtime Errors (Fix in Phase 1)
1. **item-power.mjs:289** - Chat template references to undefined fields
2. **Test helpers** - All test functions using missing schema fields
3. **Power presets** - References to non-existent fields

### Category B: Legacy System Conflicts (Address in Phase 2)
1. **base-actor.mjs effort schema** - Old effort system still present
2. **chat.mjs effort handling** - Legacy effort spending code
3. **actor-character.mjs effort references** - Mixed old/new patterns

### Category C: Incomplete Features (Phase 3-4)  
1. **Power preset system** - Defined but not integrated
2. **Unused consumption validation** - Over-engineered for current needs
3. **Redundant pool mutex code** - Complex locking that may not be needed

## Specific Dead Code Removal Plan

### Phase 1A: Fix Runtime Errors (Immediate)

**File**: `module/data/items/item-power.mjs`
```javascript
// REMOVE these lines from _createPowerChatCard (lines 287-293):
resourceSpent: this.resourceCost || 0,      // ❌ REMOVE
resourceName: this.resourceName,            // ❌ REMOVE  
resourceKey: this.resourceKey(),            // ❌ REMOVE
strainCost: this.strainCost || 0,           // ❌ REMOVE
isPassive: this.resourceName === "",        // ❌ REMOVE

// REPLACE with:
resourceSpent: 0, // TODO: Calculate from consumption array
resourceName: this.parent.system.source || "Unknown",
resourceKey: `Effort:${this.parent.system.source || ""}`, // Temporary fallback
strainCost: 0,    // TODO: Calculate from consumption array  
isPassive: !this.hasConsumption()
```

### Phase 1B: Fix Test Code

**File**: `module/helpers/test-helpers.mjs`
```javascript
// REMOVE resourceName/resourceCost from test power creation (multiple locations)
// REPLACE with proper consumption array structure
```

### Phase 1C: Fix Power Presets

**File**: `module/helpers/config.mjs`
```javascript
// EITHER remove SWN.powerPresets entirely
// OR update to use consumption array structure
```

### Phase 2: Legacy Effort System Decision ⚠️ **MAJOR DECISION NEEDED**

**Decision Required**: 
- **Option A**: Remove legacy effort schema entirely (breaking change)
- **Option B**: Maintain both systems during transition period
- **Option C**: Create migration to convert old effort to pools

**Recommendation**: **Option C** - The migration in 2.1.0 already handles this, but validation needed.

**Files to Update if removing legacy effort**:
```
module/data/actors/base-actor.mjs         - Remove schema.effort
module/helpers/chat.mjs                   - Remove effort handling (lines 501-520)
module/data/actors/actor-character.mjs    - Remove effort references
module/data/actors/actor-npc.mjs          - Remove effort references
```

### Phase 3: Template and UI Cleanup

**Templates needing dead reference removal**:
- `templates/chat/power-usage.hbs` - May reference undefined template variables
- `templates/item/attribute-parts/power.hbs` - May have unused fields

## Integration with Main Improvement Plan

### Updated Phase 1 (Critical Fixes)
1. **1.1** Add missing schema fields
2. **1.2** Implement resourceKey() method  
3. **1.3** ✅ **NEW**: Remove dead references from chat template
4. **1.4** ✅ **NEW**: Fix test code to use proper schema
5. **1.5** ✅ **NEW**: Update or remove power presets

### Updated Phase 2 (Cleanup)
1. **2.1** Unify pool key patterns
2. **2.2** ✅ **NEW**: Remove or migrate legacy effort system
3. **2.3** ✅ **NEW**: Clean up unused preset references

## Estimated Additional Cleanup Effort

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Fix runtime errors | CRITICAL | 2 | Phase 1.1-1.2 |
| Remove dead template refs | HIGH | 2 | Chat template fix |
| Fix test code | HIGH | 3 | New schema |
| Legacy effort decision | HIGH | 4-8 | Migration validation |
| Clean unused presets | MEDIUM | 2 | Schema complete |

**Total Additional Cleanup**: 13-17 hours

## Risk Assessment

### High Risk Dead Code
- **Chat template references**: Will cause UI errors immediately  
- **Test code**: Will cause test failures
- **Migration inconsistencies**: Could corrupt world data

### Medium Risk Legacy Systems
- **Dual effort systems**: Confusing but functional during transition
- **Unused presets**: No immediate impact but technical debt

### Benefits of Cleanup
- ✅ Eliminates runtime errors
- ✅ Reduces maintenance burden
- ✅ Improves code consistency
- ✅ Makes system easier to understand
- ✅ Enables proper testing

## Conclusion

The current implementation has **significant dead code problems** that must be addressed as part of the improvement plan. The main issues are **incomplete schema implementation** combined with **references to non-existent fields**, creating runtime errors.

The cleanup effort adds **13-17 hours** to the original **37-hour improvement plan**, but is **critical for system stability**. Without this cleanup, the power system will have persistent UI errors and unreliable functionality.