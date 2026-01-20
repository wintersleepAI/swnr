# CHANGELOG

All notable changes to the Systems Without Number Redux (SWNR) system for Foundry VTT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] 2025-11-04 More XWN support

- Custom currency system configuration supported. Base currency and up to 5 custom currencies. Old debt, balance, and owed fields are deprecated and will be removed in a future version.  They should be migrated to the new system, but the old values are shown in the tweaks section as readonly.
- Added readied and stowed modifiers to character sheet (under features/tweaks)
- Fixed capt support department bug
- Added stress button to character sheet to modify and roll stress, along with tracking breakdowns (page 57 of AWN).
- Auto show power type on features tab when type is first added
- Setting to not roll damage/trauma dice on attack roll automatically with button to roll
- Added GM notes to item description (under description tab). GM notes are hidden by default and can be shown to players by checking the box.

## [2.2.1] 2025-11-11 CWN Cyberware compendium

- Re-added CWN Cyberware compendium

## [2.2.0] 2025-11-03 More AWN support

### Fixes:
- Bulk add skills dialog now has a dropdown for skill lists
- Moved movement attribute to Features tab
- Changed header layout to be more compact
- Added fuel to vehicle sheet (behind AWN setting)
- Added run time to vehicle sheet (behind AWN setting)
- Added cargo to vehicle sheet (tracks cargo and gear carried)
- NPC reaction roll now uses a private roll and takes a modifier
- Fixed issues for ship / mech attack
- Removed roll formula from item description by default
- Updated WWN / OSE compendium content
- Updated NPC import from CSV for compendium import
- Added condition to item description and chat messages. Not yet automated. Behind AWN setting.
- Shock damage now uses dice string
- Changed several fields to validate that they are valid dice strings (such as damage, trauma, etc)
- Misc fixes and more AWN support

## [2.1.0] - 2025-09-30 Unified Power System and AWN 

This comprehensive migration transforms the legacy effort system into the new resource pool system, 
populates power resource fields, converts legacy configurations to consumption arrays, and creates pool-granting features 
for characters. All worlds from 2.0.12 or earlier have been fully migrated to the new system. See the notes 
at <a href='https://github.com/wintersleepAI/swnr/wiki/Powers---Resource-Pools' target='_blank'>this wiki page</a> for more information.

**NOTE** v13 support only from this version onwards.

**NOTE** you may have old compendiums from previous versions. You will need to manually delete empty compendium folders.

### Major Features

#### Unified Power System
- **Complete overhaul of the power/effort resource system** - Legacy effort system has been transformed into a comprehensive resource pool system
- **Resource Field Integration** - Powers now include `resourceName` and `subResource` fields for precise pool targeting
- **Dynamic Pool System** - Pools are computed dynamically with support for manual overrides and committed resources
- **Resource Key Method** - New `power.system.resourceKey()` method returns standardized "ResourceName:SubResource" format
- **Pool Update Patterns** - Standardized patterns for updating pools while preserving manual changes

#### Advanced Consumption System
- **Multi-Cost Consumption Arrays** - Powers support multiple consumption types in expandable arrays
- **Enhanced Resource Timing** - New three-option timing system replaces boolean `spendOnPrep`:
  - **"Pay on Prep"** - Resources consumed during power preparation (no chat buttons)
  - **"Pay via Chat"** - Resources consumed via interactive chat card buttons (original behavior)
  - **"Pay Immediately"** - Resources consumed immediately when sending power to chat (new option)
- **Flexible Resource Types** - Support for pool resources, system strain, internal uses, and item consumption
- **Consumption Validation** - Comprehensive validation system ensures resources are available before consumption
- **Restoration Support** - Proper resource restoration when unpreparing powers or effects end

### Enhancements

#### Power System Improvements
- **Enhanced Power UI** - Improved power sheet interface with resource configuration section including timing dropdown
- **Better Power Display** - Enhanced UI/UX for powers display with clearer resource information
- **Improved Preparation Icons** - Brain icons now appear after power names for better alignment and visual clarity
- **Prepared Spell Support** - Full support for spell preparation mechanics with new timing system
- **Power Chat Cards** - Improved chat integration showing resource costs and consumption details
- **Passive Power Support** - Better handling of powers without casting costs

#### Compendium & Content
- **AWN Content Integration** - Extensive AWN additions including:
  - AWN-specific armor, weapons, and equipment
  - Mutation system support with roll tables
  - AWN edges and features
  - Wasteland-specific items and gear
- **CSV Import Tools** - New utility scripts for importing compendium content from CSV templates
- **Enhanced Compendium Support** - Improved tracking and management of compendium YAML files
- **Content Organization** - Better organization of features tab and power displays

#### User Interface
- **Improved Resource Management** - Better pool manager interface with clearer status indicators
- **Enhanced Chat Cards** - Power usage chat cards now show detailed consumption information
- **Container System**
  - Mark any gear item as a container with capacity max/value and open/closed state
  - Drag-and-drop items into open containers; auto-updates capacity and highlights valid drops
  - Drag items out to remove; contained item encumbrance recalculates capacity
  - Container location propagates to contained items; prevents container-in-container nesting; only gear/weapon/armor allowed
  - Dedicated Containers section in the items list with capacity display and toggle icon
- **Languages Management**
  - New world settings: Available Languages (comma-separated list) and Preset selector (Earth, WWN, Both)
  - Biography tab languages UI: open add panel with +, pick from available (excluding known), add, and remove per-language
  - Add panel only shown when at least one available language is configured; styles for a clean, concise flow

### Technical Changes

#### Migration System
- **Comprehensive v2.1.0 Migration** - Automatic migration transforms legacy data:
  - Populates `resourceName` and `subResource` fields based on power subtypes
  - Converts legacy effort configurations to consumption arrays
  - Creates pool-granting features for existing characters
  - Preserves existing resource values and committed effort
  - Handles strain costs, internal resources, and legacy configurations
- **Safe Migration Process** - Robust error handling and reporting; migration version is only updated on success
- **Migration Reporting** - Detailed logging and user notifications of migration results

#### Data Model Updates
- **Power Data Model** - Extensive updates to power schema:
  - New resource fields with proper validation
  - Consumption array with complete configuration options
  - Support for preparation mechanics
  - Enhanced derived data preparation
- **Pool System Architecture** - Clear separation between stored (`_source`) and computed data
- **Resource Pool Structure** - Standardized pool format with value, max, cadence, and commitment tracking

#### Developer Features
- **Development Documentation** - Enhanced developer documentation in `docs/dev/`
- **Build Tools** - Improved build process and development workflow
- **Template System** - CSV templates for creating new compendium content

#### Refresh Orchestration
- Introduced a clean split between orchestration and engine:
  - Orchestrator: `module/helpers/refresh-orchestrator.mjs` provides `refreshActor({ actor, cadence, frail? })` and `refreshMany({ cadence, actors? })`, owns HP/strain updates and chat creation.
  - Engine: `module/helpers/refresh-helpers.mjs` provides `refreshActorPools(actor, cadenceLevel)`, item updates, and cadence utilities; now chat-free.
- Global API updated: `globalThis.swnr.refreshScene()` and `globalThis.swnr.refreshDay()` now call the orchestrator (`refreshMany`).
- NPC and Character sheet buttons now call the orchestrator (`refreshActor`) for a single, consistent path.

#### Removed
- Deprecated helper `refreshPools(cadence)` removed. Use `refreshMany({ cadence })` instead for global refresh and `refreshActor({ actor, cadence })` for a single actor.

### Bug Fixes

- Fixed compendium tracking and git integration issues
- Corrected migration versioning and proper system updates

### Developer Notes

- **Breaking Changes**: This version includes significant data model changes. The migration system handles the transition automatically, but custom modules interfacing with the power system may need updates.
- **Pool System**: Developers should use the new `resourceKey()` method and standardized pool update patterns when working with character resources.
- **Backward Compatibility**: Legacy effort-based worlds will be automatically migrated to the new system on first load.
 - **Refresh API Changes**: The old helper `refreshPools(cadence)` was removed. For global/GM flows call `globalThis.swnr.refreshScene()` / `globalThis.swnr.refreshDay()` (which delegate to the orchestrator’s `refreshMany`). For targeted flows, call `refreshOrchestrator.refreshActor({ actor, cadence })` directly.

---

*This version represents a major milestone in the SWNR system's evolution, providing a robust foundation for resource management across all Kevin Crawford game systems (SWN, WWN, CWN, AWN).*


## [2.0.13] - 2025-07-30

### Fixed
- Keep 0 qty consumables
- Porting in NPC item bug

## [2.0.12] - 2025-07-17

### Fixed
- Fix for showing gear and consumables

## [2.0.11] - 2025-07-16

This version adds the ability for items to be marked as consumable (partially for AWN support) with the ability to track empty 'containers'. Ammo is treated as a consumable, which means a weapon should have the ammo source selected to reload. Shift+clicking reload will bypass this logic.


### Added
- Consumable item system with ability to track empty 'containers'
- Ammo specific reload functionality
- Ammo indicators on character sheets
- Shift+click reload to bypass reload logic
- Add/remove use buttons for consumables
- Ammo selector for matching types

### Fixed
- Secondary stat on weapon breaking NPC rolls
- Right click on mech/ship/etc functionality

### Changed
- Ammo is treated as a consumable - weapons need ammo source selected to reload
- Item list formatting improvements

## [2.0.10] - 2025-06-19

### Fixed
- MacroBar bug fix - limited to intercept hook to cases that the system function handled

## [2.0.9] - 2025-06-15

### Fixed
- Chat card now properly displays damage buttons for v13
- Character header issue
- Description boxes and text alignment
- Side bar context menu issue
- Prose-mirror box fixes

## [2.0.8] - 2025-05-30

This migration adds a 'melee' flag to weapons which is used for determining what attack bonus to use with CWN Armor setting enabled. <b>You will need to set this flag manually for existing items.</b>


### Added
- Melee flag to weapons for determining attack bonus with CWN Armor setting
- Ability to add powers/weapons/armor from compact list
- Melee AB display on character sheet
- Melee AC for NPCs
- Version migration logging

### Fixed
- Allow AB to be negative for weapons
- Mech calculation of PMH
- Rolls data for HP for dice so nice
- More accessible beige color

### Changed
- Adding melee tag to SWN weapons

## [2.0.7] - 2025-05-13

### Changed
- System bump

## [2.0.6] - 2025-04-09

### Added
- Reload on combat functionality
- Rank as slider with max value
- Skill select for weapons

### Fixed
- Cargo fix
- Skill remember setting
- Modifier modifier to break limit
- Remember dice setting fix
- Migrate invalid cyberware type and concealment

## [2.0.5]
 Cyber type and concealment 

## [2.0.3]
Remember and ask weapon fixes 

## [2.0.2]
Adding the image for system

## [2.0.1]
flag for access/stress. limit access max to 0. small UI tweak

## [2.0.0]
Initial release of the system rewrite. Original system can be found at 
https://github.com/wintersleepAI/foundry-swnr