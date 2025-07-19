# Sprint 2 Planning: Chat System & Resource Management
*Stars Without Number Redux v2.1.0 Unified Powers - Phase 2*

**Sprint Duration**: 2-3 weeks  
**Status**: ✅ COMPLETED  
**Previous Sprint**: S-1 completed (Actor-pool schema, migration, item-sheet partials)  
**Major Architectural Change**: Pool generation moved from Powers to Features/Foci/Edges

---

## Sprint 2 Objectives

**Primary Goal**: Implement robust chat-card refactor with mutex spend logic, refresh hooks, and GM-override dialog as outlined in the Unified Power Specification Section 7.

**Success Criteria**: ✅ ALL COMPLETED
- ✅ Race-condition-free power usage with per-actor mutex
- ✅ Comprehensive refresh hook system for scene/rest/day cycles
- ✅ GM override dialog for direct pool manipulation
- ✅ Chat cards properly reflect resource spending and status
- ✅ **ARCHITECTURAL FIX**: Pool generation moved from Powers to Features/Foci/Edges

---

## Development Tasks

### 1. Chat-Card Refactor with Mutex Logic
**Priority**: Critical  
**Estimated Effort**: 8-10 hours

#### 1.1 Core Mutex Implementation
- **File**: `module/data/items/item-power.mjs`
- **Requirements**:
  - Implement per-actor mutex in `power.use()` method
  - Prevent race conditions during simultaneous power usage
  - Add mutex logging for debugging concurrent access
  - Handle edge cases (actor deletion, network interruption)

#### 1.2 Enhanced Chat Cards
- **Files**: `templates/chat/`, `module/chat/`
- **Requirements**:
  - Update chat card templates to show resource costs/remaining
  - Display pool status before/after usage
  - Add visual indicators for failed casts (insufficient resources)
  - Support strain cost display
  - Include undo functionality for GM corrections

#### 1.3 Resource Spending Algorithm Enhancement
- **File**: `module/data/items/item-power.mjs:76-84`
- **Requirements**:
  - Implement read-modify-write pattern for `actor.system.pools`
  - Auto-seed missing pool keys (edge case handling)
  - Apply strain costs properly
  - Validate resource availability before spending
  - Rollback mechanism for failed operations

### 2. Refresh Hooks and Automation
**Priority**: High  
**Estimated Effort**: 6-8 hours

#### 2.1 Core Refresh Functions
- **File**: `module/helpers/` (new file: `refresh-helpers.mjs`)
- **Requirements**:
  - Implement `swnr.refreshScene()` function
  - Implement `swnr.refreshRest()` function
  - Implement `swnr.refreshDay()` function (if needed)
  - Loop through actor pools based on cadence settings
  - Emit `"swnrPoolsRefreshed"` hook for module compatibility

#### 2.2 Foundry Integration
- **File**: `module/swnr.mjs`
- **Requirements**:
  - Hook into Foundry's combat system for scene refresh
  - Create chat messages for refresh notifications
  - Add scene refresh automation options
  - Consider rest mechanics integration

#### 2.3 Manual Refresh Controls
- **Files**: Actor sheets, GM controls
- **Requirements**:
  - Add manual refresh buttons to actor sheets
  - GM tools for forcing refreshes
  - Batch refresh for multiple actors
  - Selective refresh (specific pools only)

### 3. GM Override Dialog System
**Priority**: High  
**Estimated Effort**: 5-7 hours

#### 3.1 Pool Management Dialog
- **Files**: `templates/dialogs/` (new), `module/dialogs/` (new)
- **Requirements**:
  - Quick-edit dialog for pool values (current/max)
  - Batch editing for multiple pools
  - Validation to prevent negative values
  - Audit trail for GM modifications
  - Integration with actor sheet pool badges

#### 3.2 Actor Sheet Integration
- **File**: `templates/actors/`, actor sheet classes
- **Requirements**:
  - Clickable pool badges in Powers tab
  - Visual feedback for modified pools
  - Keyboard shortcuts for common operations
  - Context menu options for pool management

---

## Technical Implementation Details

### File Structure Changes
```
module/
├── dialogs/
│   ├── pool-override-dialog.mjs    [NEW]
│   └── refresh-manager-dialog.mjs  [NEW]
├── helpers/
│   └── refresh-helpers.mjs         [NEW]
├── chat/
│   └── power-chat-cards.mjs        [ENHANCED]
templates/
├── dialogs/
│   ├── pool-override.hbs           [NEW]
│   └── refresh-manager.hbs         [NEW]
└── chat/
    └── power-usage.hbs             [ENHANCED]
```

### Key Configuration Updates
```js
// module/swnr.mjs additions
CONFIG.SWN.refreshHooks = {
  scene: "combatEnd",      // When combat ends
  rest: "longRest",        // Manual or automated
  day: "newDay"            // Time-based or manual
};

CONFIG.SWN.poolMutex = new Map(); // Per-actor locks
```

### Critical Dependencies
- Actor pool system (from Sprint 1) ✅
- Power item schema (from Sprint 1) ✅
- Migration system (from Sprint 1) ✅

---

## Addressing Known Issues

### Issues to Fix in Sprint 2:
1. **Duplicate Ready Hooks** (`module/swnr.mjs:141,237`)
   - **Action**: Consolidate during hook system enhancement
   - **Impact**: Part of refresh hook implementation

2. **Missing Error Handling** (`module/swnr.mjs:209-270`)
   - **Action**: Add try/catch blocks to macro functions during chat refactor
   - **Impact**: Improves overall system reliability

### Issues to Monitor:
- **Initiative Override Conflicts**: Watch for compatibility during hook additions
- **ESLint Configuration**: Consider enabling undefined variable checking

---

## Testing Strategy

### Unit Tests Required:
1. **Mutex Logic Tests**
   - Concurrent power usage simulation
   - Race condition detection
   - Lock timeout handling

2. **Refresh Hook Tests**
   - Cadence-based pool restoration
   - Hook emission verification
   - Integration with Foundry systems

3. **GM Override Tests**
   - Pool value validation
   - Audit trail accuracy
   - UI responsiveness

### QA Checklist (Subset from Spec Appendix B):
- [ ] 100 concurrent `power.use()` calls complete without double-spend
- [ ] Mutex logs show proper lock acquisition per actor
- [ ] Refresh hooks properly reset pools based on cadence
- [ ] GM override dialog maintains data integrity
- [ ] Chat cards display accurate before/after resource status

---

## Delivery Milestones

### Week 1:
- [ ] Mutex implementation in `power.use()`
- [ ] Basic chat card enhancement
- [ ] Core refresh helper functions

### Week 2:
- [ ] GM override dialog system
- [ ] Complete refresh hook integration
- [ ] Chat card polish and error handling

### Week 3 (Buffer/Polish):
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Integration testing with known modules

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mutex deadlocks | Medium | High | Implement timeout mechanism, extensive testing |
| Chat system complexity | Low | Medium | Incremental implementation, fallback to basic cards |
| Hook integration conflicts | Medium | Medium | Test with popular modules, provide compatibility layer |
| Performance degradation | Low | High | Profile mutex operations, optimize critical paths |

---

## Dependencies and Blockers

### External Dependencies:
- Foundry VTT v13 hook system (stable)
- Actor data model changes (completed in Sprint 1)

### Internal Dependencies:
- Pool cache system functionality
- Item sheet partial system
- Migration system stability

### Potential Blockers:
- Complex world data requiring extended testing period
- Module compatibility issues requiring API adjustments
- Performance requirements necessitating architecture changes

---

## Success Metrics

1. **Functional**: 100% pass rate on QA checklist items
2. **Performance**: Mutex operations < 10ms per actor
3. **Stability**: Zero race condition reports in testing
4. **UX**: GM feedback positive on override dialog usability
5. **Compatibility**: No regression with existing power functionality

---

## Post-Sprint 2 Handoff

**Expected State for Sprint 3**:
- Robust power usage system with race condition protection
- Complete refresh automation for all supported cadences
- GM tools for pool management and debugging
- Enhanced chat feedback for power usage
- Foundation ready for compendium curation and performance optimization

**Documentation Updates Required**:
- GM guide for pool management tools
- Developer guide for refresh hook usage
- Migration notes for chat card template changes

---

## ⚠️ CRITICAL ARCHITECTURAL CHANGE DISCOVERED DURING IMPLEMENTATION

### Issue Identified:
During Sprint 2 implementation, a fundamental design flaw was discovered: **pools were being generated from Powers (items that consume resources) rather than from Foci/Edges/Features (character progression elements that should grant pools)**.

### Root Cause:
The original design had Powers defining their own resource pools, but this contradicts how SWN/CWN actually works:
- **Foci/Edges/Features** grant resource pools (e.g., "Psychic Training" grants Effort:Psychic pools)
- **Powers** consume from those pools (e.g., "Telekinetic Manipulation" costs 1 Effort:Psychic)

### Solution Implemented:
1. **Redesigned pool generation** to use Features/Foci/Edges instead of Powers
2. **Updated data models** to add `poolsGranted` field to Feature items
3. **Fixed pool calculation logic** in `base-actor.mjs` to scan Features for pool grants
4. **Added comprehensive UI** to Feature item sheets for pool configuration
5. **Created migration** (v2.1.1) to convert existing power-based pools to feature-based

### Files Modified for Architectural Fix:
- `module/data/items/item-feature.mjs` - Added `poolsGranted` schema
- `module/data/actors/actor-character.mjs` - Updated `_calculateResourcePools()` method
- `module/sheets/item-sheet.mjs` - Added pool management UI to Feature sheets
- `templates/item/attribute-parts/feature.hbs` - Pool configuration interface
- `module/migration.mjs` - Added v2.1.1 migration for architectural change
- `src/scss/components/_chat.scss` - Styling for pool configuration UI

### Impact on Sprint 2:
- ✅ **All original Sprint 2 goals achieved**
- ✅ **Critical architectural flaw fixed**
- ✅ **Proper SWN/CWN game mechanics now implemented**
- ✅ **Migration path provided for existing data**

### Testing Validated:
- Pool generation now correctly comes from Features/Foci/Edges
- Powers properly consume from shared actor pools
- Feature item sheets provide full pool configuration UI
- Migration successfully converts existing power-based pools

This architectural change ensures the unified power system accurately reflects how Stars Without Number and Cities Without Number actually work, rather than just being technically functional.

---

*Planning Document Version 1.1 - Updated post-Sprint 2 completion with architectural changes*