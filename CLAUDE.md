# CLAUDE.md

Concise guidance for Claude Code on this Foundry VTT v13+/v14 system.

## Core Version Target

`system.json` declares `minimum: 13.345`, `verified: 14.365`. **Code must run on both
v13 and v14** — when an API differs between them, add a small compat helper rather than
branching inline or dropping v13.

## Namespaced Globals

Bare globals still work on v14 but are removed in v15. Always use the namespaced form:

| Deprecated global | Use instead |
|---|---|
| `Actors`, `Items` | `foundry.documents.collections.*` |
| `ActorSheet`, `ItemSheet` | `foundry.appv1.sheets.*` |
| `renderTemplate`, `loadTemplates` | `foundry.applications.handlebars.*` |
| `TextEditor` | `foundry.applications.ux.TextEditor.implementation` |
| `DragDrop` | `new foundry.applications.ux.DragDrop.implementation(...)` |

## Document Lifecycle

- **Always call `super` in `prepareBaseData()`.** Core's implementation runs `_clearData()`,
  which initializes `overrides`, `statuses`, and `tokenActiveEffectChanges`. Skipping it
  makes `applyActiveEffects()` throw during document construction on v14.
- Guard optional data in `static migrateData()` — it receives partial source data for
  newly-created documents (e.g. check `data.trauma` before reading `data.trauma.rating`).

## Chat Messages

- **Visibility:** never read `core.rollMode` directly. v14 renamed the setting to
  `core.messageMode` and changed its values (`gmroll` → `gm`, etc.); the old key still
  exists but reads back `null`, which silently makes private rolls public. Use the
  helpers in `helpers/utils.mjs`: `getChatMessageMode()`, `applyChatMessageMode(chatData)`,
  and `chatMode("gm")` for an explicit visibility.
- **Rolls:** attach rolls with `rolls: [roll]`. The legacy singular `roll:` field is no
  longer honoured, leaving `message.rolls` empty (breaks Dice So Nice and roll inspection).
- **Hook:** listen to `renderChatMessageHTML`, not `renderChatMessage`. It passes an
  `HTMLElement` where the old hook passed jQuery.
- **Markup:** the roll container is `.dice-roll`; `.roll` is on each individual die
  (`<li class="roll die d20">`). Selecting `.roll` for a container finds nothing.

## Application / Sheet Conventions

- Prefer native DOM APIs in new code. (`helpers/chat.mjs` is still jQuery-based and is
  adapted at the hook boundary; porting it is tracked separately.)
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

## CSS/SCSS Development
- **NEVER edit `css/swnr.css` directly** - it's compiled from SCSS sources.
- Make style changes in `src/scss/` files:
  - Main file: `src/scss/swnr.scss`
  - Components: `src/scss/components/*.scss`
  - Utilities: `src/scss/utils/*.scss`
- After SCSS changes, run `npm run build` to compile CSS.
- For development, use `npm run watch` for auto-compilation.
