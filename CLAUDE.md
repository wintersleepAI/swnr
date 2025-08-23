# CLAUDE.md

This file provides focused guidance for Claude Code when working with this **Foundry VTT V13** Stars Without Number Redux (SWNR) system. The system supports most features of the Kevin Crawford suite of compatable games including WWN, CWN, and AWN.

## 🚨 CRITICAL: Foundry V13 Context

**This system is built for Foundry VTT V13 using ApplicationV2 framework - NOT earlier versions!**

### V13 ApplicationV2 Requirements
- **NO jQuery** - Use native DOM: `querySelector()`, `addEventListener()`, `dispatchEvent()`
- **NO submitOnChange** - Manual event handling in `_onRender()`
- **Static action handlers** - Use `static async _onActionHandler(event, target)`
- **Single root templates** - Templates need exactly one root HTML element
- **Modern dialogs** - Use `foundry.applications.api.DialogV2`, not legacy `Dialog`

### ApplicationV2 Sheet Pattern
```javascript
export default class SWNSheet extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    actions: { actionName: this._onActionHandler }
  };
  
  _onRender(context, options) {
    // Setup manual event listeners here
  }
  
  static async _onActionHandler(event, target) {
    // Handle actions
  }
}
```

## Key System Architecture

### Pool System (CRITICAL)
**Pools are computed dynamically - understand stored vs computed data:**

- **Document Data**: `actor._source.system.pools` (stored values)
- **Computed Data**: `actor.system.pools` (calculated values)
- **Pool Keys**: `"ResourceName:SubResource"` (e.g., `"Effort:Psychic"`, `"Slots:Lv3"`)
- **Pool Structure**: `{ value, max, cadence, committed?, commitments? }`

### Power Resource Integration (v2.1.0)
**Powers now have proper resource field integration:**

- **Resource Fields**: Powers have `resourceName` (nullable) and `subResource` (nullable) fields
- **Resource Key Method**: `power.system.resourceKey()` returns `"ResourceName:SubResource"` format
- **Migration**: v2.1.0 automatically populates fields from existing power data
- **UI Integration**: Power sheets include resource configuration section
- **Pool Lookup**: Powers use `resourceKey()` method to find matching actor pools

### Power Consumption Timing (v2.1.0)
**Enhanced timing system for resource consumption:**

- **Three Timing Options**: Replaces old boolean `spendOnPrep` with string enum:
  - `"preparation"` - Resources consumed during power preparation (no chat buttons)
  - `"manual"` - Resources consumed via chat card buttons (original default behavior)
  - `"immediate"` - Resources consumed immediately when power is sent to chat (new option)
- **Config-Driven**: Uses `CONFIG.SWN.consumptionTiming` for extensibility
- **UI Integration**: Dropdown selector in power consumption configuration
- **Logic Flow**: Different code paths handle each timing mode appropriately

### Pool Update Patterns
```javascript
// WORKING: Using power's resourceKey() method (preferred for powers)
const poolKey = power.system.resourceKey();
await actor.update({ [`system.pools.${poolKey}.value`]: newValue });

// WORKING: Targeted updates (preferred for single changes)
await actor.update({ [`system.pools.${poolKey}.value`]: newValue });

// WORKING: Batch updates (preferred for multiple changes)
const updates = {
  [`system.pools.${poolKey1}.value`]: value1,
  [`system.pools.${poolKey2}.value`]: value2,
  "system.effortCommitments": newCommitments
};
await actor.update(updates);

// WORKING: Full replacement (like refresh-helpers) - use sparingly
const pools = foundry.utils.deepClone(actor.system.pools);
pools[poolKey].value = newValue;
await actor.update({ "system.pools": pools });

// REQUIRED: Character model preserves manual changes
const sourceValue = this.parent._source.system.pools?.[poolKey]?.value;
const currentValue = sourceValue !== undefined ? 
  Math.min(sourceValue, maxValue) : calculatedValue;
```

## Common Commands

- `npm run build` - Compile SCSS to CSS (required after stylesheet changes)
- `npm run watch` - Auto-compile SCSS during development

## Development Patterns

- dev documents are in ~/docs/dev and contains
    - knownIssues.md
        - use this document to track issues discovered but not directly addressed durring development
        - check this document when working to see if a existing issue may be dealt with when working on your current task
    - readme.md
        - keep this updated with how you are using your developemnt documents
    - various planning documents usually in .md format often in subfolders

### DO (V13 Modern)
```javascript
// Native DOM methods
element.querySelector('.selector')
element.addEventListener('change', handler)
element.dispatchEvent(new Event('input'))

// ApplicationV2 patterns
static DEFAULT_OPTIONS = { actions: { ... } }
_onRender(context, options) { /* setup */ }

// Modern data handling
actor.update({ "system.property": value })
foundry.utils.deepClone(data)
```

### DON'T (Legacy/jQuery)
```javascript
// jQuery (V13 incompatible)
$(element).find('.selector')     // ❌
$(element).trigger('change')     // ❌

// Legacy patterns  
form: { submitOnChange: true }   // ❌
new Dialog({ ... })              // ❌
```

## File Structure
- `module/data/` - Modern DataModel classes
- `module/sheets/` - ApplicationV2 sheet classes
- `module/documents/` - Document extensions
- `templates/` - Handlebars templates (single root element required)
- `src/scss/` - SCSS source files

## Power & Pool System
- **Features grant pools** via `poolsGranted` schema
- **Powers consume pools** via `consumptions` array  
- **Character model** recalculates pools during `prepareData()`
- **Manual changes preserved** by reading from `_source` data

## Rest & Refresh Architecture
**Clean, optimized architecture with single database writes and standardized results.**

### Current Implementation
- **Rest buttons** in `templates/actor/header.hbs` trigger sheet actions
- **Sheet methods** delegate to actor business logic:
  - `_onRest()` - Shows dialog, delegates to `actor.system.restForNight()`
  - `_onScene()` - Delegates to `actor.system.endScene()`
- **Actor methods** in `module/data/actors/actor-character.mjs`:
  - `restForNight(options)` - Complete rest logic with batched updates
  - `endScene()` - Scene refresh with batched updates
- **Global utilities** in `module/helpers/refresh-helpers.mjs` for GM refresh and NPC support

### Key Features
- **Single database write** per operation (optimal performance)
- **Standardized results** with comprehensive change tracking
- **Enhanced chat messages** with detailed change breakdowns
- **Clean separation** between UI (sheets) and business logic (actors)
- **Centralized utilities** for consistent refresh behavior

---

**Remember: V13 ApplicationV2 is fundamentally different from earlier Foundry versions. When in doubt, check existing working patterns in the codebase.**