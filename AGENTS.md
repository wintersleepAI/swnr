# Repository Guidelines (Concise)

## Foundry V13 ApplicationV2
- No jQuery: use native DOM (`querySelector`, `addEventListener`).
- No `submitOnChange`: wire listeners in `_onRender()`.
- Static action handlers: `static async _onActionHandler(event, target)`.
- Templates must have a single root element.
- Use `foundry.applications.api.DialogV2` (not legacy `Dialog`).
  - Note: One existing consumable selection dialog still uses legacy `Dialog`. Do not add new legacy dialogs; prefer DialogV2 for future work.

### Embedded Documents (Items) Updates
- Do not use flattened `items.{id}.system...` paths in `actor.update()`; in V13 these do not modify embedded Items.
- Use `actor.updateEmbeddedDocuments('Item', payload)` where `payload` is an array of `{ _id, system: { ... } }` changes.
- Batch multiple item changes in one call for performance and consistency.

Example:
```js
// Reset internal uses for multiple power items
const payload = powerItems.map(p => ({
  _id: p.id,
  "system.consumptions": resetConsumptionsFor(p)
}));
await actor.updateEmbeddedDocuments('Item', payload);
```

## Pools & Powers
- Use `actor.system.pools` (computed) and preserve `_source` manual overrides when recalculating.
- `power.system.resourceKey()` returns the pool key (e.g., `Effort:Psychic`).
- Update pattern: `await actor.update({ [\`system.pools.${key}.value\`]: newValue })` (batch when possible).
- Consumption types: `poolResource`, `systemStrain`, `consumableItem`, `uses`.
  - `consumableItem` without `itemId`: show selection dialog; spend exactly user‑chosen amounts across items.
  - `uses`: subtract 1 per use; cadence refresh in helpers.

## Refresh Orchestration
- Use the orchestrator helper for all refresh flows:
  - Per-actor: `refreshOrchestrator.refreshActor({ actor, cadence: 'scene'|'day', frail? })`
  - Global/GM: `refreshOrchestrator.refreshMany({ cadence: 'scene'|'day', actors? })`
- Engine (`refresh-helpers.mjs`) exposes `refreshActorPools(actor, cadenceLevel)` for data updates only — do not create chat in the engine.
- Removed: `refreshPools(cadence)` — call the orchestrator or the global API (`globalThis.swnr.refreshScene/refreshDay`).

## Docs & Planning
- Development notes live in `docs/dev/` (see `knownIssues.md` and `README.md`). Keep known issues updated as you work.
 - Media capture guide in `docs/dev/media-shots.md` lists required screenshots/GIFs and naming.

## Containers & Languages
- Containers: Items can be marked as containers with `system.container.isContainer`, capacity, and `isOpen`. Use `ContainerHelper` for drag/drop; no nesting.
- Languages: GM sets `availableLanguages` and optional preset; actors add/remove on the Biography tab. Only show the add panel if at least one language is configured.

## Theming
- Do not toggle dark classes in JS. Use `.swnr ...` and `.theme-dark .swnr ...` selectors.

## CSS/SCSS Development
- **NEVER edit `css/swnr.css` directly** - it's compiled from SCSS sources.
- Make style changes in `src/scss/` files:
  - Main file: `src/scss/swnr.scss`
  - Components: `src/scss/components/*.scss` (e.g., `_chat.scss` for pools styling)
  - Utilities: `src/scss/utils/*.scss`
- After SCSS changes, run `npm run build` to compile CSS.
- For development, use `npm run watch` for auto-compilation.
