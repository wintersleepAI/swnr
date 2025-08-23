# Rest and Refresh System Refactoring Plan

## Current Architecture Analysis

### Overview
The current rest and refresh system is split across multiple files with overlapping responsibilities and inconsistent patterns. While functional, it has architectural issues that impact maintainability and performance.

### Current File Structure

```
module/
├── sheets/actor-sheet.mjs
│   ├── _onRest() - Dialog + HP/Strain + Day refresh
│   ├── _onScene() - Scene refresh + Soak reset
│   └── _refreshPoolsByCadence() - Pool/effort refresh logic
├── helpers/refresh-helpers.mjs
│   ├── refreshPools() - Global refresh entry point
│   ├── refreshActorPools() - Actor-specific refresh
│   ├── refreshConsumptionUses() - Power consumption refresh
│   └── unprepareAllPowers() - Power unpreparation
└── data/actors/actor-character.mjs
    └── (Currently no refresh logic)
```

### Current Flow Analysis

#### Rest for Night Button
1. **Sheet** → `_onRest()` 
2. **Dialog** → User selects rest type
3. **Sheet** → Updates HP/strain directly
4. **Sheet** → `_refreshPoolsByCadence('day')`
5. **Sheet** → Calls `globalThis.swnr.utils.refreshConsumptionUses()`
6. **Helpers** → `refreshConsumptionUses()` + `unprepareAllPowers()`
7. **Sheet** → Force re-render
8. **Sheet** → Create chat message

#### End Scene Button  
1. **Sheet** → `_onScene()`
2. **Sheet** → `_refreshPoolsByCadence('scene')`
3. **Sheet** → `_resetSoak()`
4. **Sheet** → Same consumption/chat flow as above

### Identified Issues

1. **Split Responsibilities**: Business logic mixed between sheets and helpers
2. **Multiple Updates**: 3-4 separate database writes per refresh
3. **Code Duplication**: Pool refresh logic exists in both places
4. **Circular Dependencies**: Helpers call back to sheet methods
5. **Inconsistent Patterns**: Different refresh entry points use different logic
6. **Complex State Management**: Hard to track what gets updated when
7. **Testing Challenges**: Tight coupling makes unit testing difficult

## Target Architecture

### Design Principles

1. **Single Responsibility**: Each class handles one concern
2. **Data Model Ownership**: Actor owns its refresh logic
3. **Batch Updates**: All changes in single database write
4. **Event-Driven**: Use Foundry hooks for cross-system communication
5. **Testable**: Clear interfaces and dependency injection

### Target Structure

```
module/
├── sheets/actor-sheet.mjs
│   ├── _onRest() - UI only, delegates to actor
│   └── _onScene() - UI only, delegates to actor  
├── data/actors/actor-character.mjs
│   ├── restForNight() - Complete rest logic
│   ├── endScene() - Complete scene refresh logic
│   └── _refreshPools() - Internal pool refresh helper
├── services/refresh-service.mjs (NEW)
│   ├── RefreshService class
│   ├── createRefreshResult() - Standardized results
│   └── formatChatMessage() - Centralized messaging
└── helpers/refresh-helpers.mjs
    └── (Global utilities only, no actor-specific logic)
```

## Phased Refactoring Plan

### Phase 1: Extract Actor Methods ✅ **COMPLETED** ✅ Safe
**Goal**: Move business logic to actor data model without changing external interfaces

#### Steps: ✅ **ALL COMPLETED**
1. ✅ Add `restForNight(options)` method to `actor-character.mjs:628-658`
2. ✅ Add `endScene()` method to `actor-character.mjs:664-672` 
3. ✅ Add internal `_refreshPools(cadence)` helper to `actor-character.mjs:679-770`
4. ✅ Keep exact same logic, just moved
5. ✅ Update sheet methods to delegate: `await this.actor.system.restForNight(options)`

#### Success Criteria: ✅ **ALL MET**
- ✅ All existing functionality works identically
- ✅ Sheet methods become simple delegates
- ✅ No changes to UI or chat messages
- ✅ No compilation errors (verified via IDE diagnostics)

#### Implementation Details:
- **File**: `module/data/actors/actor-character.mjs` - Added 3 new methods (lines 622-770)
- **File**: `module/sheets/actor-sheet.mjs` - Modified `_onRest()` and `_onScene()` methods to delegate
- **Backward Compatibility**: Preserved existing logic for NPC actors
- **Testing**: Manual testing confirmed no regression in functionality

---

### Phase 2: Consolidate Updates ✅ Safe  
**Goal**: Batch all updates into single database write per operation

#### Steps:
1. Modify `restForNight()` to collect ALL changes before updating
2. Create single update object with:
   - `system.health.value`
   - `system.systemStrain.value` 
   - `system.pools.*`
   - `system.effortCommitments.*`
   - `items.*.system.prepared`
   - `items.*.system.consumptions.*.uses.value`
3. Single `await this.update(allChanges)` call
4. Return structured result object

#### Success Criteria:
- Only one database write per rest/scene operation
- Faster performance due to batching
- Same user experience
- Result object contains details for chat messages

---

### Phase 3: Standardize Result Handling ✅ Safe
**Goal**: Create consistent result format and centralized chat messaging

#### Steps:
1. Create `RefreshResult` class/structure:
   ```javascript
   {
     type: 'rest'|'scene',
     actor: ActorDocument,
     changes: {
       health: { old, new },
       strain: { old, new },
       pools: [{ key, old, new }],
       effortReleased: [{ powerName, amount, poolKey }],
       powersUnprepared: [{ name, id }],
       consumptionRefreshed: [{ powerName, consumptionIndex, old, new }]
     }
   }
   ```
2. Create `ChatMessageFormatter.formatRefreshResult(result)`
3. Update both operations to return this format
4. Centralize chat message creation

#### Success Criteria:
- Consistent chat message format across all refresh types
- Easy to extend with new refresh types
- Clear separation between data changes and UI presentation

---

### Phase 4: Remove Redundant Code ✅ Safe
**Goal**: Clean up old helper functions and consolidate refresh utilities

#### Steps:
1. Remove `_refreshPoolsByCadence()` from actor-sheet (now in actor)
2. Remove `refreshActorPools()` from refresh-helpers (redundant)
3. Keep only global utilities in refresh-helpers:
   - `refreshAllActors(cadence)` - for GM tools
   - `getCadenceLevel(cadence)` - utility function
4. Update any remaining references

#### Success Criteria:
- No duplicate refresh logic
- Smaller codebase with clearer responsibilities
- All functionality preserved

---

### Phase 5: Add Service Layer (Optional Enhancement)
**Goal**: Create reusable refresh service for advanced features

#### Steps:
1. Create `RefreshService` class with:
   - `executeRest(actor, options)`
   - `executeSceneEnd(actor)` 
   - `createChatMessage(result)`
   - `validateRefreshOperation(actor, type)`
2. Make actor methods use service internally
3. Allow injection for testing/customization

#### Success Criteria:
- Highly testable architecture
- Easy to extend with new refresh types
- Preparation for advanced features (scheduled rests, partial rests, etc.)

## Migration Safety

### Backward Compatibility
- All public interfaces remain unchanged during Phases 1-4
- Sheet button behavior identical to users
- Chat messages maintain same information (may have improved formatting)
- No changes to actor data structure

### Testing Strategy
1. **Phase 1**: ✅ **COMPLETED** - Verified sheet buttons work exactly as before
2. **Phase 2**: Verify single update doesn't break anything  
3. **Phase 3**: Verify chat messages contain same information
4. **Phase 4**: Verify no broken references after cleanup
5. **Phase 5**: Comprehensive integration testing

### Rollback Plan
Each phase is self-contained. If issues arise:
- Phase 1-3: Revert individual methods
- Phase 4: Restore deleted helper functions
- Phase 5: Remove service layer, keep direct actor methods

## Implementation Notes

### Key Files Modified/To Modify
- ✅ `module/data/actors/actor-character.mjs` - **COMPLETED** - Added main business logic methods
- ✅ `module/sheets/actor-sheet.mjs` - **COMPLETED** - Simplified to UI delegation  
- `module/helpers/refresh-helpers.mjs` - Cleanup redundant code (Phase 4)
- New: `module/services/refresh-service.mjs` (Phase 5)

### Foundry V13 Considerations
- Use `foundry.utils.deepClone()` for data manipulation
- Leverage ApplicationV2 event system for sheet updates
- Use modern `await actor.update()` patterns
- Consider `Hooks.call()` for extensibility

### Performance Benefits
- Reduced database writes (3-4 → 1 per operation)
- Fewer sheet re-renders 
- Better batching of related changes
- Clearer update sequencing

This plan provides a safe, incremental path to a cleaner architecture while maintaining full functionality throughout the process.