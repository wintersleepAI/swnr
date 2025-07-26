# Hide CR and Injuries/Wounds When Death & Dismemberment is Disabled

## Background and Motivation
Currently, the Critical Resistance (CR) and Injuries/Wounds fields are always visible on both PC and NPC character sheets. However, these fields are only relevant when the Death & Dismemberment setting is enabled. When this setting is disabled, these fields should be hidden to avoid confusion and reduce clutter on the character sheets.

## Key Challenges and Analysis
1. **Setting Detection**: Need to access the death & dismemberment game setting in the template
2. **Conditional Rendering**: Wrap the CR and Injuries/Wounds fields in conditional blocks
3. **Setting Name**: Identify the exact setting key used for death & dismemberment
4. **Template Access**: Ensure the setting value is available in the handlebars context
5. **Consistency**: Apply changes to both PC and NPC sections in header.hbs

## High-level Task Breakdown

### Task 1: Identify Setting Usage Pattern
**Success Criteria**: Understand how game settings are accessed in templates
- [ ] Find the death & dismemberment setting key
- [ ] Check how other game settings are used in templates
- [ ] Verify the setting is available in template context
- [ ] Confirm the setting variable name (likely `gameSettings.useDeathAndDismemberment`)

### Task 2: Plan Conditional Structure
**Success Criteria**: Design the conditional wrapper for the fields
- [ ] Determine the correct Handlebars syntax for the condition
- [ ] Plan which fields need to be wrapped (CR and Injuries/Wounds)
- [ ] Ensure the grid layout remains intact when fields are hidden
- [ ] Consider spacing/layout implications

### Task 3: Implement PC Sheet Changes
**Success Criteria**: Hide fields for PC characters when setting is disabled
- [ ] Wrap CR field in conditional block
- [ ] Wrap combined Injuries/Wounds field in conditional block
- [ ] Test that other fields still display correctly
- [ ] Verify grid alignment is maintained

### Task 4: Implement NPC Sheet Changes
**Success Criteria**: Hide fields for NPCs when setting is disabled
- [ ] Apply same conditional wrapping as PC section
- [ ] Ensure consistency with PC implementation
- [ ] Test NPC-specific layout
- [ ] Verify no visual glitches

### Task 5: Test Setting Toggle
**Success Criteria**: Fields show/hide properly based on setting
- [ ] Test with death & dismemberment enabled - fields should show
- [ ] Test with death & dismemberment disabled - fields should hide
- [ ] Verify no console errors
- [ ] Check that data is preserved even when fields are hidden
- [ ] Test on both new and existing characters

## Project Status Board
- [x] Task 1: Identify Setting Usage Pattern
- [x] Task 2: Plan Conditional Structure
- [x] Task 3: Implement PC Sheet Changes
- [x] Task 4: Implement NPC Sheet Changes
- [ ] Task 5: Test Setting Toggle

## Executor's Feedback or Assistance Requests
### Task 1 Progress: Identified Setting Usage Pattern ✓
- **Setting Key**: `useDeathAndDismemberment` (confirmed in register-settings.mjs line 176)
- **Template Access**: Available as `gameSettings.useDeathAndDismemberment`
- **Pattern Examples**: 
  - `{{#if (eq gameSettings.useDeathAndDismemberment true)}}` for explicit true check
  - `{{#if gameSettings.useDeathAndDismemberment}}` for truthy check
- **Confirmed**: Setting is already available in template context via gameSettings object

### Task 2 Progress: Planned Conditional Structure ✓
The fields will be wrapped with `{{#if (eq gameSettings.useDeathAndDismemberment true)}}` blocks:

**For PC Characters (lines ~195-220):**
```handlebars
{{#if (eq gameSettings.useDeathAndDismemberment true)}}
  {{! Critical Resistance field }}
  <div class="resource flex-group-center">
    <!-- CR field content -->
  </div>
  
  {{! Combined Injuries/Wounds field }}
  <div class="resource flex-group-center">
    <!-- Injuries/Wounds field content -->
  </div>
{{/if}}
```

**For NPCs (similar structure in else block)**
This will wrap both CR and Injuries/Wounds fields together to maintain grid layout integrity.

### Task 3 & 4 Progress: Implemented Conditional Hiding ✓
- Successfully wrapped CR and Injuries/Wounds fields with `{{#if (eq gameSettings.useDeathAndDismemberment true)}}` blocks
- **PC Section**: Lines ~183-218 now conditionally show CR and Injuries/Wounds fields
- **NPC Section**: Lines ~270-306 now conditionally show CR and Injuries/Wounds fields  
- Both sections use identical conditional structure for consistency
- Grid layout integrity maintained - fields are hidden as a group

### Implementation Details:
- Conditional blocks wrap BOTH CR and combined Injuries/Wounds fields together
- When `useDeathAndDismemberment` is `true`: Fields are visible
- When `useDeathAndDismemberment` is `false`: Fields are hidden
- Other fields (AB, speed, etc.) remain unaffected

### Next Steps
- Test the setting toggle functionality in Foundry

## Lessons
- Foundry chat messages are rendered differently than regular HTML and require special event handling
- The previous UI consistency update was successfully implemented and accepted
- Sometimes simpler solutions (always visible) are better than complex interactions (expandable) when the content is important and not too large
- The critical injury calculation display was successfully simplified to always show
- Combined injuries/wounds fields use existing nested-field styles effectively
