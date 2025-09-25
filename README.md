# Systems Without Number Redux for Foundry VTT
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-10-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Foundry v13](https://img.shields.io/badge/foundry-v13-green)

A comprehensive Foundry VTT system for Stars Without Number Revised and the Kevin Crawford suite of games including Worlds Without Number (WWN), Cities Without Number (CWN), and Ashes Without Number (AWN).

## Game Support

- **Stars Without Number (SWN)** - Full support for space opera adventures
- **Worlds Without Number (WWN)** - Fantasy campaigns with spells and arts
- **Cities Without Number (CWN)** - Cyberpunk settings with hacking and cybernetics
- **Ashes Without Number (AWN)** - Post-apocalyptic survival gameplay

Game-specific features are enabled through system settings, allowing you to customize the interface and mechanics for your preferred game type.

## Key Features

- **Unified Resource Pool System** - Flexible effort, spell slots, and custom resource management
- **Character Sheets** - Complete character management with skills, equipment, and powers
- **NPC Support** - Quick NPC creation and management tools  
- **Vehicle Systems** - Ships, mechs, drones, and ground vehicles
- **Faction Management** - Track faction assets and conflicts
- **Automated Calculations** - AC, saves, skill checks, and combat rolls
- **Compendium Content** - Extensive pre-loaded equipment, powers, and creatures

## Installation

1. In Foundry VTT, go to the **Game Systems** tab
2. Click **Install System** 
3. Search for "Stars Without Number Redux" or use this manifest URL:
   ```
   https://github.com/wintersleepAI/swnr/releases/latest/download/system.json
   ```
4. Click **Install** and create a new world using the SWNR system

## Getting Started

### Character Creation

1. Create a new **Actor** of type **Character**
2. Set basic attributes (stats, background, class, level)
3. Add **Features** (foci, edges, class abilities) from compendiums
4. Add **Skills** and allocate skill points using the lock/unlock system
5. Equip **Weapons**, **Armor**, and **Items** as needed
6. Add **Powers** (psychic abilities, spells, arts) if applicable

### Using Resource Pools

The system automatically creates resource pools based on your character's features:

- **Effort Pools** - Psychic, High Mage, Necromancer etc.
- **Spell Slots** - By level (Lv1, Lv2, Lv3, etc.)  
- **Custom Pools** - Any homebrew resource system

Pools appear in the **Powers** tab with:
- Current/maximum values with visual bars
- Automatic refresh on rest/scene changes
- Manual release buttons for committed resources
- Tracking of which powers consumed resources

## Creating Custom Pools and Powers

The SWNR system provides a flexible resource pool system that works across all Kevin Crawford games (SWN, WWN, CWN, AWN). This section explains how to create custom resource pools and powers that consume them.

### Custom Resource Pools

Resource pools are granted by **Features** (foci, edges, class abilities, etc.) and consumed by **Powers** (psychic abilities, spells, arts, etc.). Each pool has a unique identifier combining a resource name and optional sub-resource.

#### Creating Pool-Granting Features

1. **Create a Feature Item** in your world
2. **Configure Pool Details** in the feature's data:
   - **Resource Type**: Main category (e.g., "Effort", "Slots", "Points", "Mana")
   - **Sub Resource**: Subcategory (e.g., "Psychic", "Lv3", "Fire", leave blank for generic)
   - **Cadence**: When it refreshes ("commit", "scene", "day")
   - **Formula**: How much the pool grants (supports dynamic calculations)
   - **Condition**: When the pool is granted (optional, leave blank for always)

#### Pool Examples

**Basic Psychic Effort Pool:**
```
Resource Type: Effort
Sub Resource: Psychic
Cadence: scene
Formula: 1 + @skills.psychic.highest + Math.max(@stats.wis.mod, @stats.con.mod)
Condition: (leave blank)
```

**Spell Slots by Level:**
```
Resource Type: Slots  
Sub Resource: Lv1
Cadence: day
Formula: @stats.int.mod
Condition: (leave blank)
```

**Conditional High-Level Spell Slot:**
```
Resource Type: Slots
Sub Resource: Lv3
Cadence: day  
Formula: Math.max(0, @stats.int.mod - 2)
Condition: @level >= 5
```

**Custom Mana Pool:**
```
Resource Type: Mana
Sub Resource: (leave blank)
Cadence: scene
Formula: @level * 2 + @stats.cha.mod
Condition: (leave blank)
```

#### Formula Variables

Your formulas can reference:
- **Stats**: `@stats.str.mod`, `@stats.dex.mod`, `@stats.con.mod`, `@stats.int.mod`, `@stats.wis.mod`, `@stats.cha.mod`
- **Level**: `@level` or `@lvl` 
- **Skills**: `@skills.skillname.rank`, `@skills.skillname.highest`
- **Math**: `Math.max()`, `Math.min()`, `Math.floor()`, `Math.ceil()`

### Custom Powers

Powers consume resources from pools when activated. The system supports flexible consumption patterns including timing control.

#### Creating Resource-Consuming Powers

1. **Create a Power Item** in your world
2. **Set Basic Power Info**:
   - **Type**: "psychic", "art", "spell", "adept", or "mutation"  
   - **Level**: Power level (0-9)
   - **Source**: Discipline or school name
3. **Configure Resource Consumption**:
   - **Resource Type**: Must match a pool's resource type exactly
   - **Sub Resource**: Must match a pool's sub-resource exactly (or leave blank for generic pools)
   - **Cost**: How much to consume
   - **Timing**: When to consume ("preparation", "manual", "immediate")
   - **Pool Fallback**: If specific sub-resource is unavailable/insufficient, will automatically use generic pools (blank sub-resource)

#### Power Consumption Examples

**Basic Psychic Power:**
```
Resource Type: Effort
Sub Resource: Psychic
Cost: 1
Timing: manual (shows buttons in chat)
```

**Spell Consuming Slot on Prep:**
```
Resource Type: Slots
Sub Resource: Lv2  
Cost: 1
Timing: preparation (consumed when prepared)
```

**Prepared Spell that Consumes on Cast:**
```
Resource Type: Slots
Sub Resource: Lv1
Cost: 1
Timing: manual (shows buttons in chat)
Prepared: Yes (must be prepared before use)
```

**Immediate Consumption Power:**
```
Resource Type: Mana
Sub Resource: (leave blank)
Cost: 3
Timing: immediate (consumed when sent to chat)
```

#### Pool Resource Fallback Behavior

When a power specifies both a resource type and sub-resource (e.g., "Effort:Psychic"), the system will:

1. **First try** the specific pool: "Effort:Psychic"
2. **If unavailable/insufficient**, fall back to generic pool: "Effort:" (blank sub-resource)

**Example Fallback Scenarios:**
- Power needs "Effort:Psychic" (1 point), character has "Effort:Psychic" (0) and "Effort:" (2) → Uses "Effort:"
- Power needs "Slots:Lv3" (1 slot), character has "Slots:Lv3" (0) and "Slots:" (1) → Uses "Slots:"
- Power needs "Points:Mana" (2 points), character has only "Points:" (3) → Uses "Points:"

This allows characters to maintain both specialized pools and flexible generic pools that can cover multiple power types.

#### Charging Items (Consumable Items)

Powers can spend charges from items (ammo, batteries, potions) on use.

- Configure in Power → Attributes → Resource Consumption:
  - Type: Consumable Item
  - Cost: Number of charges to spend
  - Item: Pick an owned item that has `Uses` configured
  - Timing: Preparation, Manual, or Immediate

Behavior and tips:
- If an Item is selected, that specific item is charged the specified amount.
- If no Item is selected, a dialog appears at use-time listing all readied consumables. You can pick multiple items and exact amounts to spend; all selected items are deducted accordingly.
- “Manual” timing shows a Spend Resources button on the chat card; “Immediate” spends on send; “Preparation” spends when preparing the power.
- Item depletion respects the item’s Uses settings (max/value) and empty handling (`keepEmpty` and `emptyQuantity`).

Example:
```
Type: Consumable Item
Cost: 1
Item: (leave blank to choose at runtime)
Timing: manual
```

#### Internal Uses (Per‑Power Counters)

Use this when a power has its own limited uses independent of pools.

- Configure in Power → Attributes → Resource Consumption:
  - Type: Uses
  - Uses: Set current `value` and `max`
  - Cadence: Optional auto-refresh on Scene or Day
  - Timing: Preparation, Manual, or Immediate

Behavior and tips:
- Each activation consumes 1 internal use. The UI shows the current `value/max` beside the power.
- If Cadence is set, internal uses refresh to max on rest/scene per cadence.
- “Manual” timing shows a Spend Resources button; “Immediate” deducts on send; “Preparation” deducts on prepare.
- You can reset a power’s uses to max from the powers list when below max.

#### Consumption Types (Summary)

- Pool Resource: Spend from any pool you grant (Effort, Slots, Points, etc.). Supports commit/scene/day cadences and commitments.
- System Strain: Applies strain directly to the actor.
- Consumable Item: Spends charges from items; supports multi-item selection if no item is preset.
- Uses: Internal per-power counter that can auto-refresh by cadence.

#### Consumption Timing Options

- **"preparation"**: Resource consumed when power is prepared (no chat buttons shown)
- **"manual"**: Resource consumed via chat card buttons (original behavior)  
- **"immediate"**: Resource consumed immediately when power is sent to chat

### Pool Management

Once created, pools appear in the **Powers tab** of character sheets with:
- **Current/Max values** with visual bars
- **Commitment tracking** showing which powers consumed resources  
- **Manual release buttons** for all commitments regardless of cadence
- **Automatic refresh** during rest/scene transitions based on cadence

#### Pool Key Format

Pools are internally identified as `"ResourceType:SubResource"`:
- `"Effort:Psychic"` - Psychic effort pool
- `"Slots:Lv3"` - 3rd level spell slots  
- `"Mana:"` - Generic mana pool (note the colon)
- `"Points:Gunnery"` - Gunnery skill points

### Advanced Features

#### Multiple Consumption Types
Powers can have multiple consumption requirements (e.g., effort + system strain).

#### Batch Pool Updates  
The system efficiently batches all pool changes in single database operations for performance.

#### Cross-Game Compatibility
The pool system works identically across SWN, WWN, CWN, and AWN - just adjust the resource names and formulas for each game's needs.

## Languages

Languages are managed per-character with a world-defined list.

- GM: System Settings → SWNR → Available Languages. Enter a comma-separated list (e.g., “Common, Elven, Dwarven”).
- Player: Actor → Biography tab → Languages.
  - Click the + button to open the add panel.
  - Choose a language from the dropdown and click Add.
  - Remove languages with the trash icon.
- Presets: GMs can use the language preset selector in settings to quickly seed the available list, then edit freely.

Notes:
- The add panel only appears if the GM has configured at least one Available Language.
- Languages are simple strings; no skill rolls or fluency levels are enforced by the system.

## Containers

You can mark items as containers and place other items inside them with capacity tracking.

- Configure a container on an Item (gear) sheet → Attributes:
  - Enable “Is Container”.
  - Set Capacity Max and toggle Open/Closed.
- On the character’s Items list:
  - A Containers section lists all container items with current/maximum capacity.
  - Click the box icon to open/close the container. Only open containers accept drops.
  - Drag items onto a container row to place them inside if capacity allows. Drag out to remove.
  - Container capacity is the sum of contained items’ encumbrance and updates automatically.
  - Changing the container’s location propagates to contained items.

Limitations:
- Nesting containers is not supported.
- Only physical items (gear, weapons, armor) can be contained.

## License and Attribution

The background art for this system is taken from the SWN Revised book download and is used per the license file. The artwork is by Grzegorz Pedrycz. Asset tokens were provided by Hawkin. Additional icons provided by game-icons.net.

---

## Development

This section is for developers who want to contribute to the SWNR system.

### Project Overview

This is a complete re-write of the Stars Without Number Revised system for Foundry VTT. The system was originally written by SpiceKing and taken over by wintersleepAI. The prior system was written in TypeScript and was not compatible with the latest version of Foundry VTT. This system is a complete re-write in JavaScript using the modern Foundry system architecture and is compatible with Foundry v13+.

### Development Notes

- Some of the data organization is changed, but most of it follows the same structure as the original system
- The UI is designed to be modular to allow for customization across different game types (SWN, CWN, AWN, WWN)
- Characters have a lock button/toggle that is needed to edit skills. Other attributes may go under locks in the future
- **Important**: Old game worlds should NOT be migrated unless a backup is made first

### Getting Started with Development

Contributing guide is in development. Please message wintersleepAI on Discord if you want to help out before making any significant PR (especially anything that changes the data model or core functionality).

For learning about the new Foundry data model and ApplicationV2 architecture, see the [tutorial on the Foundry Wiki](https://foundryvtt.wiki/en/development/guides/SD-tutorial).

### Building the System

#### Compiling CSS
Run `npm run build` to compile the SCSS to CSS

#### Other Build Commands
- `npm run build` - Compile SCSS and build system
- `npm run watch` - Auto-compile SCSS during development
- `npm run pack-compendium` - Rebuild compendium packs from source YAML files

### Architecture Notes

The system uses:
- **Modern Foundry ApplicationV2** framework (V13 compatible)
- **JavaScript** (no TypeScript compilation needed)
- **Handlebars** templates with single root elements
- **DataModel** classes for structured data
- **Native DOM APIs** (no jQuery dependencies)

### Contributing

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CyborgYeti"><img src="https://avatars.githubusercontent.com/u/4867637?v=4?s=100" width="100px;" alt="IronLlama"/><br /><sub><b>IronLlama</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=CyborgYeti" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Sealio956"><img src="https://avatars.githubusercontent.com/u/44585912?v=4?s=100" width="100px;" alt="Sealio"/><br /><sub><b>Sealio</b></sub></a><br /><a href="#infra-Sealio956" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=Sealio956" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wesleygriffin"><img src="https://avatars.githubusercontent.com/u/6266349?v=4?s=100" width="100px;" alt="Wesley Griffin"/><br /><sub><b>Wesley Griffin</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=wesleygriffin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Demonox"><img src="https://avatars.githubusercontent.com/u/189772363?v=4?s=100" width="100px;" alt="Demonox"/><br /><sub><b>Demonox</b></sub></a><br /><a href="#infra-Demonox" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/binary-idiot"><img src="https://avatars.githubusercontent.com/u/13305186?v=4?s=100" width="100px;" alt="Jonah"/><br /><sub><b>Jonah</b></sub></a><br /><a href="#infra-binary-idiot" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=binary-idiot" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wintersleepAI"><img src="https://avatars.githubusercontent.com/u/88955427?v=4?s=100" width="100px;" alt="wintersleepAI"/><br /><sub><b>wintersleepAI</b></sub></a><br /><a href="#infra-wintersleepAI" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=wintersleepAI" title="Tests">⚠️</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=wintersleepAI" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/badgkat"><img src="https://avatars.githubusercontent.com/u/109937927?v=4?s=100" width="100px;" alt="badgkat"/><br /><sub><b>badgkat</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=badgkat" title="Tests">⚠️</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=badgkat" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TheToonerfish"><img src="https://avatars.githubusercontent.com/u/120363141?v=4?s=100" width="100px;" alt="TheToonerfish"/><br /><sub><b>TheToonerfish</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=TheToonerfish" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Torticute"><img src="https://avatars.githubusercontent.com/u/30007326?v=4?s=100" width="100px;" alt="Torticute"/><br /><sub><b>Torticute</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=Torticute" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pgotsis"><img src="https://avatars.githubusercontent.com/u/7128789?v=4?s=100" width="100px;" alt="Panos Gotsis"/><br /><sub><b>Panos Gotsis</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=pgotsis" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
