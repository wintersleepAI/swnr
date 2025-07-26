# Goblin Punch Death & Dismemberment System - Implementation Complete

## Executor's Report

### Completed Tasks

1. **✅ Data Model Updates**
   - Added `critResistance`, `injuries`, and `wounds` fields to `module/data/actors/base-actor.mjs`
   - All fields default to 0

2. **✅ Character Sheet UI - PC**
   - Added CR field after Attack Bonus in `templates/actor/header.hbs`
   - Added editable Injuries/Wounds counters below System Strain bar

3. **✅ Character Sheet UI - NPC**
   - Added CR field after Attack Bonus in `templates/actor/npc.hbs`
   - Added editable Injuries/Wounds counters in combat section

4. **✅ Settings Registration**
   - Added `useDeathAndDismemberment` setting in `module/helpers/register-settings.mjs`
   - Added localization strings in `lang/en.json`
   - Setting defaults to false

5. **✅ Damage Application Logic**
   - Modified `module/helpers/chat.mjs` to check for death & dismemberment
   - Triggers when HP reaches 0 or below (including exactly 0)
   - Calculates excess damage correctly: `Math.max(0, total - oldHealth)`
   - Wrapped defeated status to only apply when setting is disabled

6. **✅ Wound Application Method**
   - Created `applyWounds()` method in `module/documents/actor.mjs`
   - Implements full severity calculation: `1d12 + (injuries × 2) + excessDamage - critResistance`
   - Rolls location (1d12) and applies appropriate descriptions
   - Updates injury and wound counters based on severity thresholds

7. **✅ Chat Template**
   - Created `templates/chat/wound-roll.hbs` with:
     - Location display with icon
     - Severity number (no text labels)
     - Expandable calculation breakdown
     - Full effect descriptions
     - Counter updates display

### System Features Implemented

#### Severity Calculation
- Formula: `1d12 + (injuries × 2) + excessDamage - critResistance`
- 2x multiplier on injuries creates steeper death spiral

#### Location Table
- 1-2: Left/Right Arm
- 3-4: Left/Right Leg
- 5-8: Torso
- 9-12: Head

#### Effect Descriptions (Chat Only)
- **Arms**: Disabled for X days, cannot hold items
- **Legs**: Disabled for X days, prone, half movement
- **Torso**: Blood Loss for X days, max HP -1 per HD
- **Head**: Concussed for X days, act last, INT DC 12 for spells

#### Severity Thresholds
- **< 11**: Temporary effects for `severity` days
- **11-15**: +1 Wound, unconscious note, physical save reminder
- **16+**: Additional wounds = severity - 15

### What Was NOT Implemented
Per user requirements:
- ❌ Automatic unconscious condition application
- ❌ Automatic effect application (all manual GM tracking)
- ❌ Permanent effect tables/rolls
- ❌ Save DCs (no DCs in SWN)
- ❌ Integration with conditions system
- ❌ Special NPC handling (works same as PCs)

### Testing Instructions

1. **Enable the System**
   - Go to Settings → Configure Settings
   - Find "Use Death & Dismemberment?" and enable it

2. **Test Basic Functionality**
   - Create a test character
   - Set some injuries (e.g., 2)
   - Deal damage to reduce HP to 0
   - Verify wound roll occurs and chat message appears

3. **Test Edge Cases**
   - Exact damage to 0 HP (should trigger with 0 excess)
   - Damage below 0 HP (should show correct excess)
   - Healing (should NOT trigger wounds)
   - NPCs (should work identically)

4. **Verify Features**
   - CR field reduces severity
   - Injuries multiply by 2 in calculation
   - Editable injury/wound counters
   - No defeated status when setting enabled

### Files Modified
1. `module/data/actors/base-actor.mjs` - Added data fields
2. `templates/actor/header.hbs` - Added CR and counters for PCs
3. `templates/actor/npc.hbs` - Added CR and counters for NPCs
4. `module/helpers/register-settings.mjs` - Added setting
5. `lang/en.json` - Added localization
6. `module/helpers/chat.mjs` - Added wound trigger logic
7. `module/documents/actor.mjs` - Added applyWounds method
8. `templates/chat/wound-roll.hbs` - Created chat template

### System Ready
The Goblin Punch death & dismemberment system is now fully implemented and ready for use!
