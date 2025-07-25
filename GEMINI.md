# GEMINI.md

This file provides focused guidance for me, Gemini, when working with this **Foundry VTT V13** Stars Without Number Redux (SWNR) system. The system supports most features of the Kevin Crawford suite of compatable games including WWN, CWN, and AWN.

## 🚨 CRITICAL: Foundry V13 Context

**This system is built for Foundry VTT V13 using the ApplicationV2 framework - NOT earlier versions!** I must adhere to the following V13-specific patterns.

### V13 ApplicationV2 Requirements
- **NO jQuery**: I will use native DOM methods like `querySelector()`, `addEventListener()`, and `dispatchEvent()`.
- **NO `submitOnChange`**: I will handle form updates with manual event listeners, typically set up in the `_onRender()` method.
- **Static Action Handlers**: I will use the `static async _onActionHandler(event, target)` pattern for all sheet actions.
- **Single Root Templates**: All Handlebars templates must have exactly one root HTML element.
- **Modern Dialogs**: I will use `foundry.applications.api.DialogV2`, not the legacy `Dialog`.

### ApplicationV2 Sheet Pattern
I will follow this pattern for creating and modifying actor and item sheets:
```javascript
import { api } from "foundry";

export default class SWNSheet extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    actions: { 
      actionName: this._onActionHandler 
    }
  };
  
  _onRender(context, options) {
    // I will set up manual event listeners here.
  }
  
  static async _onActionHandler(event, target) {
    // I will handle actions here.
  }
}
```

## Key System Architecture

### Pool System (CRITICAL)
Pools are computed dynamically. I must distinguish between stored and computed data:

- **Document Data**: `actor._source.system.pools` (these are the raw, stored values).
- **Computed Data**: `actor.system.pools` (these are the calculated values, derived after data preparation).
- **Pool Keys**: Keys are strings in the format `"ResourceName:SubResource"` (e.g., `"Effort:Psychic"`, `"Slots:Lv3"`).
- **Pool Structure**: `{ value, max, cadence, committed?, commitments? }`.

### Power Resource Integration (v2.1.0)
Powers have specific fields for resource management:

- **Resource Fields**: `resourceName` (nullable) and `subResource` (nullable).
- **Resource Key Method**: I will use `power.system.resourceKey()` to get the combined `"ResourceName:SubResource"` key for pool lookups.
- **UI Integration**: Power sheets have a dedicated section for configuring these resources.

### Pool Update Patterns
When updating actor pools, I will use one of the following methods:

```javascript
// PREFERRED FOR POWERS: Use the power's resourceKey() method.
const poolKey = power.system.resourceKey();
await actor.update({ [`system.pools.${poolKey}.value`]: newValue });

// PREFERRED FOR SINGLE CHANGES: Use a targeted update.
await actor.update({ [`system.pools.${poolKey}.value`]: newValue });

// FOR FULL REPLACEMENT (like in refresh-helpers):
const pools = foundry.utils.deepClone(actor.system.pools);
pools[poolKey].value = newValue;
await actor.update({ "system.pools": pools });

// REQUIRED FOR PRESERVING MANUAL CHANGES: When recalculating pools, I must respect user-entered overrides by checking the source data first.
const sourceValue = this.parent._source.system.pools?.[poolKey]?.value;
const currentValue = sourceValue !== undefined ? 
  Math.min(sourceValue, maxValue) : calculatedValue;
```

## Common Commands

- `npm run build`: I will run this to compile SCSS to CSS after making any changes to `.scss` files.
- `npm run watch`: I can use this to auto-compile SCSS during development.

## Development Patterns

- **Dev Documents**: Located in `docs/dev/`.
    - `knownIssues.md`: I will check this file for existing issues related to my current task and update it with any new, unaddressed problems I find.
    - `README.md`: This file explains how the dev documents are used.
    - I should use this directory for any planning documents I create.

### DO (V13 Modern)
```javascript
// Native DOM methods
element.querySelector('.selector');
element.addEventListener('change', handler);
element.dispatchEvent(new Event('input'));

// ApplicationV2 patterns
static DEFAULT_OPTIONS = { actions: { ... } };
_onRender(context, options) { /* setup */ }

// Modern data handling
actor.update({ "system.property": value });
foundry.utils.deepClone(data);
```

### DON'T (Legacy/jQuery)
```javascript
// jQuery (V13 incompatible)
$(element).find('.selector');     // ❌
$(element).trigger('change');     // ❌

// Legacy patterns  
form: { submitOnChange: true };   // ❌
new Dialog({ ... });              // ❌
```

## File Structure
- `module/data/`: Contains modern DataModel classes.
- `module/sheets/`: Contains ApplicationV2 sheet classes.
- `module/documents/`: Contains Document class extensions.
- `templates/`: Contains Handlebars templates (single root element required).
- `src/scss/`: Contains SCSS source files.

## Power & Pool System Summary
- **Features grant pools** via the `poolsGranted` schema.
- **Powers consume pools** via the `consumptions` array.
- The **Character model** recalculates pools during its `prepareData()` method.
- **Manual changes are preserved** by reading from `_source` data before calculations.

---

**My primary directive is to adhere to the Foundry V13 ApplicationV2 framework. When in doubt, I will check existing, working patterns in the codebase.**
