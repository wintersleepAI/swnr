# Unified Power & Magic Specification - Technical Analysis

This document provides a detailed technical analysis of the Unified Power & Magic Specification for v2.0, identifying implementation challenges and recommended approaches.

## Current System Analysis

### Existing Power Implementation
- **Schema**: Simple `SWNPower` class with basic fields (`source`, `level`, `roll`, `duration`, `save`, `range`, `skill`, `prepared`, `effort`)
- **Effort Tracking**: Actor-level effort pool with `{bonus, current, scene, day}` structure
- **Resource Management**: Manual calculation in `prepareDerivedData()` method
- **Chat Integration**: Basic power roll system with `doRoll()` method

### Current Limitations
- No unified resource pooling across power types
- Limited support for different magic systems (WWN spells, CWN arts)
- Hardcoded effort system doesn't scale to multiple resource types
- No automatic refresh mechanics for different cadences

## Roadblocks & Risk Assessment

### 🔴 High Risk Areas

#### 1. Migration Complexity
**Risk**: Breaking existing power items in user worlds
- Current `power` schema is fundamentally different from proposed
- Migration system lacks validation (relates to Known Issue #4)
- No rollback mechanism for failed migrations
- Embedded document updates are complex and error-prone

**Mitigation**: Implement progressive migration with validation

#### 2. Performance Impact
**Risk**: Pool rebuilding on every actor update could cause lag
- Proposed system rebuilds pools on "actor create/update & game load"
- Multiple simultaneous power uses could create race conditions
- Large power counts could impact prepareDerivedData() performance

**Mitigation**: Use cached computed properties with selective invalidation

#### 3. UI Implementation Complexity
**Risk**: Dynamic sheet partials increase maintenance burden
- Runtime partial selection based on `subType`
- Dynamic collapsible sections for resource pools
- Maintaining drag-sort while grouping by resource types

**Mitigation**: Implement simplified version first, add complexity incrementally

### 🟡 Medium Risk Areas

#### 4. Resource Pool Conflicts
**Risk**: Shared resource pools could create inconsistent state
- Multiple actors sharing resources (unlikely but possible)
- Async updates to pooled resources
- Pool aggregation logic complexity

#### 5. Existing Known Issues Interaction
**Risk**: New system could exacerbate existing problems
- Missing error handling in async functions (Known Issue #2)
- Duplicate ready hooks (Known Issue #1) could complicate refresh hooks
- ESLint disabled undefined checking (Known Issue #3) could hide resource bugs

### 🟢 Low Risk Areas

#### 6. Preset System
- Adding `CONFIG.SWN.powerPresets` is straightforward
- SubType enumeration is simple to implement
- Preset overrides on item sheets are well-understood patterns

## Recommended Implementation Strategy

### Phase 1: Foundation (Sprint S-1)
**Goal**: Add basic subType system without breaking existing functionality

```js
// Add to existing SWNPower schema
schema.subType = new fields.StringField({
  choices: ["psychic", "art", "adept", "spell", "mutation"],
  initial: "psychic"
});

// Add preset system
CONFIG.SWN.powerPresets = {
  psychic: { resourceName: "Effort", resourceCost: 1, resourceLength: "scene" },
  // ... other presets
};
```

**Migration**: Simple field addition, very low risk

### Phase 2: Individual Resources (Sprint S-1/S-2)
**Goal**: Add per-item resource tracking

```js
schema.resource = new fields.SchemaField({
  name: new fields.StringField({choices: ["Effort", "Slots", "Points", "Uses"]}),
  cost: new fields.NumberField({initial: 1}),
  current: new fields.NumberField({initial: 0}),
  max: new fields.NumberField({initial: 1}),
  cadence: new fields.StringField({choices: ["scene", "day", "rest"]})
});
```

**Benefits**: Individual tracking reduces complexity, easier to debug

### Phase 3: Computed Pools (Sprint S-2)
**Goal**: Add pooled resource display without storing pools

```js
// Actor computed property - no database storage
get resourcePools() {
  const powers = this.parent.items.filter(i => i.type === "power" && i.system.resource.shared);
  const pools = new Map();
  
  for (const power of powers) {
    const key = `${power.system.resource.name}:${power.system.source}`;
    const pool = pools.get(key) || {value: 0, max: 0, cadence: power.system.resource.cadence};
    pool.max += power.system.resource.max;
    pool.value += power.system.resource.current;
    pools.set(key, pool);
  }
  
  return Object.fromEntries(pools);
}
```

**Benefits**: Display pooling without storage complexity

### Phase 4: Full Pooled Storage (Sprint S-3+)
**Goal**: Implement full specification if needed

Only proceed if Phase 3 proves insufficient for user needs.

## Alternative Simplified Approach

If full specification proves too complex:

### Hybrid System
1. **SubType organization** for UI grouping
2. **Individual item resources** for simplicity
3. **Calculated pool displays** for UX
4. **Manual refresh buttons** instead of automatic hooks

### Benefits
- Significantly reduced complexity
- Easier migration path
- Better performance characteristics
- Maintains most user-facing benefits

## Migration Safety Checklist

- [ ] Backup system before migration
- [ ] Validate each actor after migration
- [ ] Rollback mechanism for failures
- [ ] Progress reporting for large worlds
- [ ] Test with various power configurations
- [ ] Verify compendium compatibility

## Testing Strategy

### Unit Tests Needed
- Resource calculation logic
- Pool aggregation accuracy
- Migration validation
- Preset application

### Integration Tests
- Multi-actor resource scenarios
- Complex power combinations
- Sheet rendering with various subTypes
- Chat integration with new system

## Compatibility Considerations

### Existing Modules
- Check for modules that modify power items
- Verify hook compatibility for new refresh system
- Test with popular SWN modules

### Data Integrity
- Ensure existing power items continue to function during transition
- Validate that no data is lost in migration
- Test edge cases (corrupt data, missing fields)

## Conclusion

The specification is ambitious and would significantly improve the system's flexibility. However, the implementation risk is substantial. A phased approach starting with simple subType organization and individual resources would provide most benefits while minimizing risk.

The progressive implementation allows for:
1. User feedback on each phase
2. Performance testing before adding complexity
3. Easier rollback if issues arise
4. Reduced development risk per sprint

Recommend starting with Phase 1-2 for v2.0 and evaluating user needs before implementing full pooled resources.