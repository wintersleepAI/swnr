# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Stars Without Number Redux (SWN, CWN, AWN)** system for Foundry VTT - a complete JavaScript rewrite of the original TypeScript system. The system supports:
- **SWN** (Stars Without Number) - primary focus
- **CWN** (Cities Without Number) - enabled through system settings
- **AWN** (Ashes Without Number) - initial support
- **WWN** (Worlds Without Number) - planned future support

## Common Development Commands

### Building and Development
- `npm run build` - Compile SCSS to CSS (required after stylesheet changes)
- `npm run watch` - Watch and auto-compile SCSS changes during development

### Compendium Management
- `npm run pack-compendium` - Pack compendium data from YAML source files
- `npm run unpack-compendium` - Unpack compendium data to YAML files for editing
- `npm run convert-yaml` - Convert YAML format for compendium data

### Code Quality
- ESLint configuration uses `@eslint/js` with stylistic rules enforcing 2-space indentation and semicolons
- No specific test framework configured - check README or ask user for testing approach

## Architecture Overview

### Document System (Foundry VTT Pattern)
The system follows Foundry VTT's Document-DataModel-Sheet architecture:

**Documents** (`module/documents/`):
- `SWNActor` - Base actor document with specialized behavior
- `SWNItem` - Base item document with specialized behavior

**Data Models** (`module/data/`):
- **Actors**: `SWNCharacter`, `SWNNPC`, `SWNShip`, `SWNMech`, `SWNDrone`, `SWNCyberdeck`, `SWNFaction`, `SWNVehicle`
- **Items**: `SWNItemItem`, `SWNFeature`, `SWNPower`, `SWNSkill`, `SWNArmor`, `SWNWeapon`, `SWNCyberware`, `SWNProgram`, `SWNAsset`, ship components

**Sheets** (`module/sheets/`):
- `SWNActorSheet` - Characters and NPCs
- `SWNVehicleSheet` - Ships, mechs, drones, vehicles
- `SWNCyberdeckSheet` - Cyberdeck actors
- `SWNFactionSheet` - Faction management
- `SWNItemSheet` - All item types

### Unified Power System (v2.1.0+)
The system implements a comprehensive unified power system supporting all game variants:

**Actor Pool System** (`actor.system.pools`):
- Dynamic resource pools using `${resourceName}:${subResource}` keys
- Supports: Effort, Slots, Points, Strain, Uses, and custom types
- Pool structure: `{ value, max, cadence }` for each resource
- Runtime extensible via `CONFIG.SWN.poolResourceNames`

**Feature-Based Pool Generation** (`SWNFeature` data model):
- **Features/Foci/Edges grant resource pools** (proper SWN/CWN mechanics)
- `poolsGranted` schema: resourceName, subResource, baseAmount, perLevel, cadence, formula, condition
- Dynamic pool calculation based on character level and stats
- Comprehensive UI in Feature item sheets for pool configuration

**Power Schema** (`SWNPower` data model):
- Unified schema supporting psychic, art, adept, spell, and mutation powers
- **Powers consume from shared actor pools** (do not generate pools)
- Resource configuration: type, cost, duration, sharing model
- Mutex-protected usage prevents race conditions
- Enhanced chat cards with resource cost display

**Migration System** (v2.1.0 & v2.1.1):
- v2.1.0: Automatic conversion of legacy effort system to pools
- v2.1.1: Architectural fix - converts power-based pools to feature-based
- Comprehensive error handling and progress reporting
- Backward-compatible during transition period

### Key Configuration
- **Initiative**: `1d8 + @stats.dex.mod` with 2 decimal places
- **Primary Token Attribute**: health
- **Secondary Token Attribute**: power
- **Grid**: 5ft squares with standard diagonal movement

### File Organization
- `assets/` - Artwork, fonts, icons (artwork by Grzegorz Pedrycz)
- `css/` - Compiled CSS output
- `src/scss/` - SCSS source files
- `lang/` - Localization files (English)
- `module/` - Core system JavaScript
- `templates/` - Handlebars templates for actors, items, chat, dialogs
- `packs/` - Compendium data (packed format)
- `src/packs/` - YAML source files for compendium content
- `scripts/` - Build and conversion utilities

### Data Management
- Compendium content is authored in YAML format in `src/packs/`
- Use pack/unpack scripts to manage compendium data
- System includes extensive item compendiums organized by type and game system (SWN/CWN/WWN)

### System Settings
- CWN features are enabled/disabled through system settings
- Migration system tracks and handles data model changes between versions
- Settings include NPC HD rolling, and system-specific configurations

### Important Notes
- Characters have lock toggles that must be enabled to edit skills
- **Migration from v2.0.x**: Foundry backup recommended before upgrading to v2.1.0+ (unified power system)
- The system supports hot reload for CSS, HTML, HBS, and JSON files during development
- Active Effects use modern transfer system (legacyTransferral: false)
- **Power System**: Legacy effort data automatically converts to pool system on first load

### Common Patterns
- Data models inherit from base classes (`base-actor.mjs`, `base-item.mjs`, etc.)
- Vehicle types share common functionality through `base-vehicle.mjs`
- Gear items use `base-gear-item.mjs` for shared equipment behavior
- Chat system includes specialized roll templates for different action types
- Initiative system supports custom actor-based rolling

## Development Documentation

### Known Issues and Technical Debt
See `docs/dev/knownIssues.md` for a comprehensive list of known issues, code structure problems, and GitHub issues. When making changes:

1. **Check for related known issues** - Before starting work, review if your changes are close to any tracked issues
2. **Consider addressing nearby problems** - If fixing a known issue requires minimal additional work, consider including it
3. **Think through implications** - Known issues often exist because they're complex; ensure fixes don't break other functionality
4. **Update documentation** - Remove resolved issues from the known issues list

The known issues document tracks code structure problems, runtime issues, active GitHub bugs, and provides guidelines for when and how to address them during development work.