# Cursor Rules for SWN Redux Project

## Project Context
This is a Systems Without Number (SWN) Foundry VTT system project. The main configuration definitions are located in `module/helpers/config.mjs`.

## Key Configuration Files
- `module/helpers/config.mjs` - Contains all CONFIG.SWN definitions and constants
- `jsconfig.json` - JavaScript configuration for the project
- `system.json` - Foundry VTT system manifest

## CONFIG.SWN Definitions
The `module/helpers/config.mjs` file exports a comprehensive SWN object containing:

### Core Game Constants
- `SWN.stats` - Character statistics (str, dex, con, int, wis, cha)
- `SWN.statAbbreviations` - Abbreviated stat names
- `SWN.maxTL` - Maximum tech level (6)
- `SWN.maxPowerLevel` - Maximum power level (10)
- `SWN.maxSkillRank` - Maximum skill rank (4)

### Item System
- `SWN.itemLocations` - Item storage locations (readied, stowed, other)
- `SWN.itemQualities` - Item quality levels (stock, juryRigged, mastercrafted)
- `SWN.itemConsumableTypes` - Consumable item types (none, count, bundle)
- `SWN.ammoTypes` - Ammunition types (none, typeAPower, typeBPower, ammo, missile, special, infinite)

### Character System
- `SWN.saveTypes` - Save types (physical, mental, evasion, luck)
- `SWN.poolResourceNames` - Pool resource names (Effort, Slots, Points, Strain, Uses)
- `SWN.poolCadences` - Pool cadences (commit, scene, day)
- `SWN.powerSubTypes` - Power subtypes (psychic, art, adept, spell, mutation)

### Vehicle System
- `SWN.vehicleTypes` - Vehicle types (ship, vehicle, drone, mech)
- `SWN.mechClasses` - Mech classes (suit, light, heavy)
- `SWN.shipClasses` - Ship classes (fighter, frigate, cruiser, capital)
- `SWN.vehicleClasses` - Vehicle classes (s, m, l)
- `SWN.shipHullTypes` - Ship hull types (strikeFighter, shuttle, freeMerchant, etc.)

### Skills System
- `SWN.skills` - Skill lists for different game modes (none, spaceMagic, classic, revised, cwn, psionic)

### Faction System
- `SWN.assetCategories` - Asset categories (force, cunning, wealth)
- `SWN.factionTags` - Faction tags with descriptions and effects

### Icons and Assets
- `SWN.itemIconPath` - Path to item icons
- `SWN.actorIconPath` - Path to actor icons
- `SWN.defaultImg` - Default images for different item types

## Import Usage
The codebase uses `CONFIG.SWN` which is assigned from the imported `SWN` object. In the main module file (`module/swnr.mjs`), you'll see:

```javascript
import { SWN } from './helpers/config.mjs';

// Later in the init hook:
CONFIG.SWN = SWN;
```

When working with CONFIG.SWN definitions in your code, you can reference them directly:
```javascript
// Access CONFIG.SWN properties
CONFIG.SWN.stats
CONFIG.SWN.skills.classic
CONFIG.SWN.vehicleTypes
```

Or import SWN directly for local use:
```javascript
import { SWN } from './module/helpers/config.mjs';
```

## Common Patterns
- Use `SWN.stats` for character statistics
- Use `SWN.skills.classic` for classic SWN skills
- Use `SWN.vehicleTypes` for vehicle type checking
- Use `SWN.itemLocations` for item location constants
- Use `SWN.saveTypes` for save type constants

## Foundry VTT Integration
This project is a Foundry VTT system, so many constants are used in:
- Actor sheets and data models
- Item sheets and data models
- Game mechanics and calculations
- Localization keys (many constants reference translation keys)

## Development Guidelines
1. Always import SWN from the config file rather than hardcoding values
2. Use the predefined constants for consistency across the codebase
3. When adding new game mechanics, consider adding them to the SWN config object
4. Follow the existing naming conventions for new constants 