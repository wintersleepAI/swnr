# Known Issues and Technical Debt

This document tracks known issues in the codebase that should be considered when making changes. When working on related functionality, consider addressing these issues if they're closely related to your current work.

## Code Structure Issues

### 1. Duplicate Ready Hooks (Priority: Medium)
**Location**: `module/swnr.mjs:141` and `module/swnr.mjs:237`
- **Problem**: Two separate `Hooks.once("ready")` calls - initiative hook should be consolidated into main ready hook
- **Impact**: Code organization, potential race conditions
- **Consider fixing when**: Working on initialization code or hook management

### 2. Missing Error Handling (Priority: Medium)
**Location**: `module/swnr.mjs:209-270` (macro creation functions)
- **Problem**: Async functions lack try/catch blocks for error handling
- **Impact**: Could cause unhandled promise rejections, poor UX on failures
- **Consider fixing when**: Working on macro functionality or error handling improvements

### 3. ESLint Configuration Issue (Priority: Low)
**Location**: `eslint.config.mjs:16`
- **Problem**: `"no-undef": "off"` disables undefined variable checking
- **Impact**: Could hide potential bugs from undefined variables
- **Consider fixing when**: Updating linting rules or doing code quality improvements

## Runtime and Migration Issues

### 4. ~~Migration System Validation~~ ✅ **RESOLVED v2.1.0**
**Location**: `module/migration.mjs` 
- **Resolution**: Added comprehensive error handling, backup logging, and validation reporting
- **Impact**: Migration system now has proper error recovery and progress tracking

### 5. Initiative Override Conflicts (Priority: Low)
**Location**: `module/swnr.mjs:238-244`
- **Problem**: Directly modifies `Combatant.prototype.getInitiativeRoll` without checking for conflicts
- **Impact**: Could conflict with other modules that modify initiative
- **Consider fixing when**: Working on initiative system or module compatibility

## Active GitHub Issues (as of analysis)

### Bugs
- **#134**: Soak for tokens
- **#157**: Faction log fixes  
- **#116**: Sheet title bars not adding elements from modules (help wanted)
- **#29**: Ship repair all button not fixing drive

### Enhancement Requests for v2.1.0
- **#172**: Currency system overhaul
- **#171**: Space Magic and High Magic
- **#170**: Missing Compendium Items (help wanted)
- **#158**: Faction sheet automation functionality
- **#145**: NPC's do not pick up armour item AC when equipped
- **#143**: Custom Saving Throws
- **#125**: Weapon sheet should show summary of remembered settings
- **#121**: Add description toggling for items
- **#120**: Add a Languages Section

## Development Considerations

### Hot Reload Configuration
**Location**: `system.json:82-85`
- **Note**: Includes JSON files in hot reload, which may cause issues if `system.json` changes require full restart
- **Consider**: Review if JSON hot reload is actually needed

### Compendium Data Integrity
**Location**: Extensive pack structure with 40+ compendiums
- **Note**: No apparent validation system for pack/unpack operations
- **Consider**: Adding validation scripts when working on compendium tooling

### ~~Unified Power System Implementation~~ ✅ **COMPLETED v2.1.0**
**Location**: `module/data/items/item-power.mjs`, `module/data/actors/base-actor.mjs`
- **Resolution**: Successfully implemented unified power system with comprehensive migration and resource field integration
- **Status**: Production ready, all major power types supported (psychic, art, adept, spell, mutation)
- **Impact**: Resolved migration validation and error handling issues, implemented complete resource key architecture
- **Features**: Powers now have proper `resourceName`/`subResource` fields with automatic migration from legacy data

### ~~Feature-Based Pool Generation Architecture~~ ✅ **COMPLETED 2.1.0*
**Location**: `module/data/items/item-feature.mjs`, `module/data/actors/actor-character.mjs`
- **Resolution**: Fixed fundamental design flaw where pools were generated from Powers instead of Features/Foci/Edges
- **Status**: Production ready, proper SWN/CWN game mechanics implemented
- **Impact**: Features/Foci/Edges now grant pools, Powers consume from shared actor pools
- **Migration**: v2.1.1 automatically converts existing power-based pools to feature-based

### ~~Power Resource Field Implementation~~ ✅ **COMPLETED v2.1.0**
**Location**: `module/data/items/item-power.mjs`, `module/migration.mjs`, `templates/item/attribute-parts/power.hbs`
- **Resolution**: Implemented missing `resourceName` and `subResource` fields with proper schema validation
- **Status**: Production ready, includes automatic migration and comprehensive UI
- **Impact**: Powers can now properly reference actor resource pools using consistent `resourceKey()` method
- **Migration**: v2.1.0 automatically populates resource fields from existing power data (subType, source, level)

### TODO/Placeholder Code Issues

### 6. Broken initCompendSkills Function (Priority: Medium)
**Location**: `module/helpers/utils.mjs:102`
- **Problem**: Function shows error notification "TODO - implement initCompendSkills" and returns early, with dead code after return
- **Impact**: User-facing error message, unused function
- **Consider fixing when**: Working on skill management or compendium integration

### 7. Disabled Item Search Feature (Priority: Low)
**Location**: `src/scss/components/_items.scss`
- **Problem**: Item search UI is hidden with `display: none` and TODO comment "remove once search is implemented"
- **Impact**: Missing search functionality in item lists
- **Consider fixing when**: Working on item management or search features

### 8. Commented Settings Code (Priority: Low)
**Location**: `module/helpers/register-settings.mjs`
- **Problem**: Commented-out `showTempAttrMod` setting with TODO comments
- **Impact**: Code bloat, unclear whether feature should be implemented
- **Consider fixing when**: Reviewing settings system or temporary attribute modifiers

### 9. Dead calculateStats Code (Priority: Low)
**Location**: `module/sheets/actor-sheet.mjs`
- **Problem**: Commented `calculateStats(stats)` call with TODO "should we use this?"
- **Impact**: Code clarity, uncertain about stat calculation requirements
- **Consider fixing when**: Working on actor stat calculations

### Security Notes
- Macro execution follows Foundry's standard pattern but uses direct command strings
- No critical security issues identified, but follow Foundry best practices

## Guidelines for Addressing Issues

1. **When to address**: Only fix known issues when they're closely related to your current work
2. **Think through implications**: Consider how fixes might affect other parts of the system
3. **Test thoroughly**: Known issues often exist because they're complex to fix properly
4. **Update this document**: Remove items when fixed, add new issues as discovered
5. **Reference GitHub issues**: Check if your fix also resolves any open GitHub issues