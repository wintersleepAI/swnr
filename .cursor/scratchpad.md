# Combine Injuries/Wounds Display on Character Sheets

## Background and Motivation
The current PC and NPC character sheets display injuries and wounds as separate fields. The user wants to combine these into a single line with two input fields side by side, showing "(injuries) / (wounds)" with a unified label "Inj/Wnd" underneath. This will provide a more compact and visually cohesive display of these related statistics.

## Key Challenges and Analysis
1. **Layout Changes**: Need to modify the HTML structure to display two inputs on the same line
2. **Styling**: Ensure proper spacing and alignment between the two fields
3. **Label Positioning**: Place the "Inj/Wnd" label below both inputs as a unified label
4. **Consistency**: Apply changes to both PC and NPC sheets
5. **Data Binding**: Ensure the input fields remain properly bound to the actor data

## High-level Task Breakdown

### Task 1: Analyze Current Implementation
**Success Criteria**: Understand how injuries/wounds are currently displayed
- [ ] Examine header.hbs for PC sheet injuries/wounds display
- [ ] Examine npc.hbs for NPC sheet injuries/wounds display  
- [ ] Identify the data paths and binding structure
- [ ] Check for any special styling or classes used

### Task 2: Design New Layout Structure
**Success Criteria**: Create HTML structure for combined display
- [ ] Design a container div for both inputs
- [ ] Structure two inline input fields with "/" separator
- [ ] Position unified label below both inputs
- [ ] Ensure responsive design considerations

### Task 3: Implement PC Sheet Changes
**Success Criteria**: Update header.hbs with new combined layout
- [ ] Replace separate injury/wound sections with combined display
- [ ] Apply proper CSS classes for styling
- [ ] Test data binding functionality
- [ ] Verify visual appearance matches requirements

### Task 4: Implement NPC Sheet Changes
**Success Criteria**: Update npc.hbs with matching combined layout
- [ ] Apply same layout pattern as PC sheet
- [ ] Ensure consistency in styling
- [ ] Test NPC-specific functionality
- [ ] Verify both fields update correctly

### Task 5: Style and Polish
**Success Criteria**: Ensure professional appearance
- [ ] Add appropriate spacing between inputs
- [ ] Style the "/" separator appropriately
- [ ] Ensure label is properly centered below both inputs
- [ ] Test with various values (0-99)
- [ ] Check mobile/small screen compatibility

### Task 6: Test and Validate
**Success Criteria**: Confirm all functionality works correctly
- [ ] Test updating injury values on PC sheets
- [ ] Test updating wound values on PC sheets
- [ ] Test same on NPC sheets
- [ ] Verify data saves correctly
- [ ] Check for any visual glitches or alignment issues

## Project Status Board
- [x] Task 1: Analyze Current Implementation
- [x] Task 2: Design New Layout Structure
- [x] Task 3: Implement PC Sheet Changes
- [x] Task 4: Implement NPC Sheet Changes
- [x] Task 5: Style and Polish
- [ ] Task 6: Test and Validate

### Task 2 Progress: Designed New Layout Structure ✓
Based on existing patterns (XP field), the new combined structure will be:
```html
<div class="resource flex-group-center">
  <div class="field resource-content">         
    <input
      type='number'
      name='system.injuries'
      value='{{system.injuries}}'
      data-dtype='Number'
      class='nested-field header'
    />
    <span class="nested-sep">/</span>
    <input
      type='number'
      name='system.wounds'
      value='{{system.wounds}}'
      data-dtype='Number'
      class='nested-field header'
    />
  </div>
  <label class='resource-label'>
    Inj/Wnd         
  </label>
</div>
```
This will replace the two separate blocks for injuries and wounds.

### Task 3 & 4 Progress: Implemented Sheet Changes ✓
- Successfully replaced separate injuries/wounds fields with combined display
- Both PC and NPC sections were updated in header.hbs (lines 203-233 and 294-320)
- The new layout uses:
  - Single container div with two inputs side by side
  - `<span class="nested-sep">/</span>` as separator
  - "Inj/Wnd" as the unified label
- Data binding remains intact with `system.injuries` and `system.wounds`

### Task 5 Progress: Styles Verified ✓
- Checked existing CSS for nested fields and separators
- `.nested-field` class already has proper styling:
  - Width: `calc(50% - 30px)` - perfect for two fields side by side
  - Transparent background and no border for seamless appearance
  - Inherits font size and color from parent
- `.nested-sep` has padding of `0.25rem` on sides
- No additional CSS changes needed - existing styles will work perfectly

## Executor's Feedback or Assistance Requests
### Task 1 Progress: Analyzed Current Implementation ✓
- **PC Sheet (header.hbs)**:
  - Injuries field is at lines 203-213
  - Wounds field is at lines 216-226
  - Both are separate `<div class="resource flex-group-center">` blocks
  - Each has its own input field and label
  - Located in the header section grid with other stats
  
- **NPC Sheet (header.hbs)**:
  - NPCs also use the header.hbs template (lines 274-318)
  - Injuries field is at lines 294-304
  - Wounds field is at lines 307-317
  - Same structure as PC fields, just in a different conditional block
  
- **Data paths**:
  - Injuries: `system.injuries`
  - Wounds: `system.wounds`
  - Both use number input types with class `nested-field header`

### Next Steps
- Test the functionality in Foundry

## Lessons
- Foundry chat messages are rendered differently than regular HTML and require special event handling
- The previous UI consistency update was successfully implemented and accepted
- Sometimes simpler solutions (always visible) are better than complex interactions (expandable) when the content is important and not too large
- The critical injury calculation display was successfully simplified to always show
