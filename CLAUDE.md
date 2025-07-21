# CLAUDE.md

This file provides focused guidance for Claude Code when working with this **Foundry VTT V13** Stars Without Number Redux (SWNR) system.

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
- **Pool Keys**: `"ResourceName:SubResource"` (e.g., `"Effort:Psychic"`)
- **Pool Structure**: `{ value, max, cadence, committed?, commitments? }`

### Pool Update Patterns
```javascript
// WORKING: Targeted updates (preferred for single changes)
await actor.update({ [`system.pools.${poolKey}.value`]: newValue });

// WORKING: Full replacement (like refresh-helpers)
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

---

**Remember: V13 ApplicationV2 is fundamentally different from earlier Foundry versions. When in doubt, check existing working patterns in the codebase.**