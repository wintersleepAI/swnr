# Repository Guidelines

## Project Structure & Module Organization
- `module/`: Foundry VTT system logic (`.mjs` ES modules: documents, sheets, helpers).
- `templates/`: Handlebars HTML templates used by system sheets and UI.
- `src/scss/` → `css/`: Author styles in SCSS; compiled CSS output is generated. Do not edit `css/` by hand.
- `src/packs/` ↔ `packs/`: YAML sources for compendium content and compiled Foundry compendium folders.
- `assets/`, `lang/`, `system.json`: Static assets, localization JSON, and system manifest.

## Build, Test, and Development Commands
- `npm run build`: Compile SCSS `src/scss/swnr.scss` to `css/swnr.css` (no source map).
- `npm run watch`: Watch and recompile SCSS with source maps during development.
- `npm run pack-compendium`: Build compendiums from `src/packs/*` YAML into `packs/*` using Foundry CLI.
- `npm run unpack-compendium`: Extract `packs/*` into `src/packs/*` (useful before editing or reviewing changes).
- `npm run convert-csv` / `npm run convert-yaml`: Import/export helpers under `scripts/` for content workflows.
- Lint (local): `npx eslint module scripts --ext .mjs,.js`.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indentation, semicolons required, braces enforced (`curly`). See `eslint.config.mjs`.
- Modules: ES modules (`.mjs`), kebab‑case filenames; classes in PascalCase (e.g., `SWNActor`).
- Localization: Add keys under `lang/en.json` with `SWN.*` namespacing; use `game.i18n.localize` in code.
- Styles: Place new SCSS under `src/scss/{global,components,utils}`; run build/watch to generate CSS.

## Foundry V13 ApplicationV2
- No jQuery: use native DOM (`querySelector`, `addEventListener`).
- No `submitOnChange`: wire listeners in `_onRender()`.
- Static action handlers: `static async _onActionHandler(event, target)`.
- Templates must have a single root element.
- Use `foundry.applications.api.DialogV2` (not legacy `Dialog`).

## Pools & Powers
- Pools are computed vs stored: use `actor.system.pools`; preserve manual overrides from `actor._source.system.pools` when recalculating.
- Use `power.system.resourceKey()` to locate the correct pool (e.g., `Effort:Psychic`).
- Update pattern: `await actor.update({ [\`system.pools.${key}.value\`]: newValue });` (batch multiple updates when possible).

## Testing Guidelines
- No unit test suite yet. Validate changes by loading this system in Foundry, reloading the world, and exercising affected sheets, chat cards, and migrations.
- Run ESLint clean before PRs; for compendium edits, prefer editing `src/packs/` and repack.

## Commit & Pull Request Guidelines
- Messages: Imperative, concise. Prefer Conventional Commits (`feat:`, `fix:`, `docs:`) and keep CHANGELOG style in mind.
- PRs: Describe the change, link issues, include screenshots/GIFs for UI updates, list migration steps if data/schema changed.
- Before opening: `npm run build`, lint clean, and if content changed, run `npm run pack-compendium`. Update `CHANGELOG.md` for user‑facing changes.

## Docs & Planning
- Development notes live in `docs/dev/` (see `knownIssues.md` and `README.md`). Keep known issues updated as you work.
