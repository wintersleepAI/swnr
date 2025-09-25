# CLAUDE.md

Concise guidance for Claude Code on this Foundry VTT v13 system.

## V13 Essentials
- No jQuery; use native DOM APIs.
- Don’t rely on `submitOnChange`; wire listeners in `_onRender()`.
- Static action handlers only.
- Templates need a single root element.
- Prefer `DialogV2` (avoid adding new legacy `Dialog`).

## Pools & Powers
- Pools: `actor.system.pools` (computed), `actor._source.system.pools` (stored). Keys are `"Resource:SubResource"`.
- Powers: use `power.system.resourceKey()` to build keys.
- Update pattern: `await actor.update({ [\`system.pools.${key}.value\`]: newValue })` (batch when needed). Respect `_source` to preserve manual overrides when recalculating.

## Consumption Types & UX
- `poolResource`: spends from pools; supports cadence and commitments. Falls back to generic pools (blank subtype) when specific subtypes unavailable.
- `systemStrain`: adjusts `actor.system.systemStrain.value`.
- `consumableItem`: spends item charges; if no `itemId`, show multi‑item selection dialog and spend exactly what the user chooses.
- `uses`: internal per‑power counter; deduct 1 per use; optional cadence auto‑refresh.

Consumable dialog
- Template: `templates/dialogs/select-consumables.hbs`; attach +/- handlers on render.
- Multi‑item spend: re‑fetch the item for each decrement and call `item.system.removeOneUse()`.

## Embedded Item Updates
- Never use flattened `items.{id}` paths. Use `actor.updateEmbeddedDocuments('Item', payload)` and batch.

## Containers
- Items can be containers (`system.container.isContainer`, capacity `max/value`, `isOpen`).
- Use `ContainerHelper` for drag/drop, capacity, and location propagation. No nested containers; only gear/weapon/armor.

## Languages
- GM config: `availableLanguages` string (with presets). Biography tab provides add/remove; add panel shows only if languages exist.

## Theming
- Don’t toggle dark classes in JS. Style with `.swnr ...` and `.theme-dark .swnr ...`.

## Refresh
- Internal `uses` may auto‑refresh by cadence (scene/day). Ensure chats reflect persisted changes.
