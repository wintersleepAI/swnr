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

### 4. Migration System Validation (Priority: Medium)
**Location**: `module/swnr.mjs:166-169`
- **Problem**: Migration runs but no validation ensures it completes successfully before updating stored version
- **Impact**: Failed migrations might not be retried, data corruption risk
- **Consider fixing when**: Working on migration system or version handling

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

### Unified Power System Implementation (v2.0)
**Location**: `docs/dev/UnifiedPowerMagicSpecification.md`
- **Note**: Major schema changes proposed for power items with pooled resources
- **Risk**: High complexity migration, performance impact, UI complexity
- **Consider**: Progressive implementation strategy (see `docs/dev/UnifiedPowerAnalysis.md`)
- **Impact**: Intersects with migration validation issue (#4) and error handling (#2)

### Security Notes
- Macro execution follows Foundry's standard pattern but uses direct command strings
- No critical security issues identified, but follow Foundry best practices

## Guidelines for Addressing Issues

1. **When to address**: Only fix known issues when they're closely related to your current work
2. **Think through implications**: Consider how fixes might affect other parts of the system
3. **Test thoroughly**: Known issues often exist because they're complex to fix properly
4. **Update this document**: Remove items when fixed, add new issues as discovered
5. **Reference GitHub issues**: Check if your fix also resolves any open GitHub issues