# CHANGELOG

All notable changes to the Stars Without Number Redux (SWNR) system for Foundry VTT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-08-XX

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
- **AWN Content Integration** - Extensive After the War Never additions including:
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
- **Container System** - Functional container support for organizing gear and equipment
- **Language Support** - Improved localization and language functionality

### Technical Changes

#### Migration System
- **Comprehensive v2.1.0 Migration** - Automatic migration transforms legacy data:
  - Populates `resourceName` and `subResource` fields based on power subtypes
  - Converts legacy effort configurations to consumption arrays
  - Creates pool-granting features for existing characters
  - Preserves existing resource values and committed effort
  - Handles strain costs, internal resources, and legacy configurations
- **Safe Migration Process** - Robust error handling and rollback support
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

### Bug Fixes

- Fixed compendium tracking and git integration issues
- Corrected migration versioning and proper system updates

### Developer Notes

- **Breaking Changes**: This version includes significant data model changes. The migration system handles the transition automatically, but custom modules interfacing with the power system may need updates.
- **Pool System**: Developers should use the new `resourceKey()` method and standardized pool update patterns when working with character resources.
- **Backward Compatibility**: Legacy effort-based worlds will be automatically migrated to the new system on first load.

---

*This version represents a major milestone in the SWNR system's evolution, providing a robust foundation for resource management across all Kevin Crawford game systems (SWN, WWN, CWN, AWN).*