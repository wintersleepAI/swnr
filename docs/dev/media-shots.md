# Media Guide: Screenshots and GIFs

Purpose: Provide a concise list of the most useful screenshots/GIFs to document the SWNR system and how to capture them consistently.

## Capture Guidelines

- Resolution: 1280×720 or 1600×900. UI Scale 1.0.
- Themes: Capture in light and dark when relevant to styling.
- World: Use a clean demo world, default scene, and uncluttered chat log.
- Consistency: Use the same demo actor and naming in all captures.
- Focus: Crop tightly to the feature being shown; avoid personal info.
- File naming: `feature-key_variant_theme.ext` (e.g., `pools-toggle_expanded_dark.png`).
- Formats: Prefer short MP4/WebM for motion (export GIF as needed). Keep GIFs < 6s, < 1200px wide.
- Storage: Place under `docs/media/<feature>/`. Reference paths in README/dev docs.

Suggested tools
- Screenshots: OS shortcut or Flameshot/SnippingTool.
- Recording: OBS or ScreenToGif. Keep 10–15 FPS for GIFs to reduce size.
- Convert to GIF (optional):
  - `ffmpeg -i input.mp4 -vf "fps=10,scale=1280:-1:flags=lanczos" -loop 0 output.gif`
  - `ffmpeg -i input.mp4 -vf "fps=10,scale=900:-1:flags=lanczos" -loop 0 output.gif`

## Shot List (What to Capture)

### Actor Sheets
- Pools Panel (expanded): Show resource groups, current/max, bar, commitments.
  - File: `actor-pools_expanded_dark.png` (also `_light.png`)
- Pools Toggle (GIF): Click chevron to collapse/expand temp/manual fields.
  - File: `actor-pools_toggle.gif`
- Commitment Release: Show commitment entries with release button tooltip.
  - File: `actor-pools_commitments_dark.png`

### Powers and Consumption
- Power Sheet → Consumption Table: Types dropdown, cost, timing, cadence.
  - File: `power-consumption_table_dark.png`
- Manual Spend (Chat): Chat card with “Spend Resources” button visible.
  - File: `power-consumption_chat-manual_light.png`
- Immediate Spend (GIF): Send to chat and show auto-deduction + toast.
  - File: `power-consumption_immediate.gif`
- Preparation Spend: Toggle prepared state and show cost paid at prepare.
  - File: `power-consumption_preparation_dark.png`
- Internal Uses Counter: Show `value/max` next to a power + reset button.
  - File: `power-internal-uses_display_light.png`

### Consumable Items (Charges)
- Item Uses Settings: `consumable` type, `ammo`, `keepEmpty`, `emptyQuantity`.
  - File: `item-uses_settings_dark.png`
- Multi-Item Selection Dialog (GIF): Plus/minus, selected count, confirm.
  - File: `consume-select_dialog.gif`
- Post-Spend Summary: Chat card showing items and amounts spent.
  - File: `consume-select_result_light.png`

### Containers
- Mark as Container: Item sheet with `Is Container`, capacity, open state.
  - File: `container-settings_item-sheet_dark.png`
- Containers List: Actor items list container section with capacity.
  - File: `containers-list_section_light.png`
- Drag into Container (GIF): Drag item onto open container, capacity updates.
  - File: `containers_drag-in.gif`
- Drag out / Remove (GIF): Remove from container and show updated capacity.
  - File: `containers_drag-out.gif`

### Languages
- Settings → Available Languages and Presets.
  - File: `languages_settings_light.png`
- Biography Tab → Add/Remove Language (GIF): Open add panel, add, remove.
  - File: `languages_biography_add-remove.gif`

### Refresh and Timing
- Scene/Day Refresh: Show pools and internal uses refreshing after rest/scene.
  - File: `refresh_scene-day_before-after_dark.png`
- Prepared Spell Flow (GIF): Prepare (spend), cast (manual spend), unprepare (restore commitments if relevant).
  - File: `powers_prepare-cast-unprepare.gif`

### Theming
- Dark vs Light Comparison: Side-by-side pools panel and dialogs.
  - File: `theming_pools-dialogs_compare.png`

## Framing and Copy Hints

- Add 1–2 sentence captions when embedding in docs to call out:
  - What user clicks/changes, what changes in UI, and any constraints.
- For GIFs with UI interactions, include the cursor and keep 1–2 full cycles.
- Avoid chat spam; clear chat or use a new world to demo flows.

## Accessibility

- Ensure legible contrast in both themes; avoid tiny cursor.
- Provide alt text when embedding. Example: “Select Consumables dialog with multiple items and increment/decrement controls; 3 total selected.”

