# Power & Consumption System Naming Inconsistencies Analysis

*Analysis Date: 21 Jul 2025*  
*System Version: v2.1.0 UnifiedPowers Implementation*

## Executive Summary

The unified powers and consumption feature has **significant naming mismatches and implementation gaps** that create friction between different parts of the system. The core issue is that **two different pool key construction patterns exist**, and critical methods are called but not implemented.

## Critical Issues Identified

### 1. Missing `resourceKey()` Method Implementation ⚠️ **CRITICAL**

**Location**: `module/data/items/item-power.mjs:289`
- **Problem**: Method is called (`resourceKey: this.resourceKey()`) but not defined
- **Impact**: Runtime errors when powers are used
- **Spec Expected**: `return \`${this.resourceName}:${this.subResource || ""}\``

### 2. Missing Core Schema Fields ⚠️ **CRITICAL**

**Location**: `module/data/items/item-power.mjs` schema definition
- **Missing Fields**:
  - `resourceName` (string field - choices: ["Effort", "Slots", "Points", "Strain", "Uses", ""])  
  - `subResource` (string field)
- **Impact**: `resourceKey()` method cannot function, inconsistent with specification

### 3. Conflicting Pool Key Patterns ⚠️ **HIGH**

**Two incompatible patterns exist:**

#### Pattern A: Powers Use `source` Field (Current Implementation)
```javascript
// item-power.mjs:348, 443
const poolKey = `Effort:${source}`;  // where source = this.parent.system.source
```

#### Pattern B: Features Use `resourceName:subResource` (Specification)
```javascript  
// actor-character.mjs:497, item-feature.mjs
const poolKey = `${poolConfig.resourceName}:${poolConfig.subResource || ""}`;
```

**Result**: Powers and Features construct different pool keys for the same logical resource.

### 4. Hardcoded Pool Keys ⚠️ **MEDIUM**

**Locations**:
- `item-power.mjs:363`: `const spellPool = spellPools["Points:Spell"];`
- `item-power.mjs:495`: `const poolKey = "Points:Spell";`

**Problem**: Should use dynamic construction instead of hardcoded strings.

## Detailed Impact Analysis

### Pool Key Mismatches by Type

| Resource Type | Power Pattern | Feature Pattern | Match? |
|---------------|---------------|-----------------|--------|
| Psychic Effort | `Effort:Psychic` (from source) | `Effort:Psychic` (from resourceName/subResource) | ✅ **IF** consistent |
| Spell Slots | `"Points:Spell"` (hardcoded) | `Slots:Lv1` (dynamic) | ❌ **MISMATCH** |
| System Strain | `systemStrain` (direct property) | `Strain:` (pool key) | ❌ **DIFFERENT SYSTEMS** |

### Friction Points

1. **Developer Confusion**: Two different patterns for same concept
2. **Runtime Errors**: Calling undefined `resourceKey()` method  
3. **Pool Lookup Failures**: Powers may not find pools created by features
4. **Maintenance Burden**: Must update multiple patterns for changes
5. **Testing Complexity**: Different code paths for same functionality

## Architecture Alignment Issues

### Current State vs Specification

| Component | Current Implementation | Specification | Status |
|-----------|----------------------|---------------|--------|
| **item-power.mjs** | Uses `source` field + manual construction | Uses `resourceName`/`subResource` + `resourceKey()` | ❌ **DIVERGENT** |
| **item-feature.mjs** | ✅ Implements `resourceName`/`subResource` | ✅ Matches spec | ✅ **ALIGNED** |
| **actor-character.mjs** | ✅ Uses proper pool key pattern | ✅ Matches spec | ✅ **ALIGNED** |
| **Pool Construction** | Mixed patterns | Consistent `resourceKey()` method | ❌ **INCONSISTENT** |

### Migration Impact

The current v2.2.0 migration (`module/migration.mjs:436-626`) converts legacy power data to the **consumption array system**, but does not address the **pool key construction inconsistencies**. This means:

- ✅ Powers get consumption arrays
- ❌ Powers still use wrong pool key patterns
- ❌ Pool lookup failures persist

## Root Cause Analysis

### Primary Cause: Incomplete Implementation
The unified power specification was partially implemented:
- ✅ Consumption array system completed
- ❌ Core resource fields (`resourceName`, `subResource`) not added to power schema
- ❌ `resourceKey()` method not implemented
- ❌ Pool key patterns not unified

### Contributing Factors
1. **Iterative Development**: Multiple specification versions created confusion
2. **Legacy Compatibility**: Old `source` field pattern maintained alongside new system
3. **Distributed Implementation**: Changes needed across multiple files not coordinated
4. **Missing Validation**: No runtime checks for pool key consistency

## Recommended Resolution Strategy

See companion document: `PowerConsumption_ImprovementPlan.md`

## Files Requiring Changes

### Core Schema & Logic
- `module/data/items/item-power.mjs` - Add missing fields and method
- `module/helpers/config.mjs` - Ensure resource name choices are consistent

### Usage Updates
- All power consumption validation methods (item-power.mjs:344-602)
- Pool key construction in actor classes (if needed)
- Chat card template data (item-power.mjs:289)

### Testing & Validation
- `module/helpers/test-helpers.mjs` - Update test expectations
- Migration scripts - Validate pool key consistency

## Timeline Considerations

- **Critical Priority**: Runtime errors from missing `resourceKey()` method
- **High Priority**: Pool lookup failures affecting power usage
- **Medium Priority**: Code cleanup and consistency improvements

This analysis reveals that while the consumption system architecture is sound, the implementation is incomplete and creates significant friction through inconsistent naming patterns.