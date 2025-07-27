# Move NPC Species/Homeworld Fields to Biography Section

## Background and Motivation
Currently, NPC character sheets display Species and Homeworld fields in the top header area alongside other stats like AC, Attack Bonus, etc. However, these fields are more descriptive/biographical in nature rather than mechanical stats. PC characters have their descriptive fields (Class, Species, Homeworld, Background, Employer) positioned above the Biography section in a dedicated area. For consistency and better organization, NPC Species and Homeworld fields should be moved from the header to above the biography section, matching the PC layout pattern.

## Key Challenges and Analysis
1. **Header Layout**: Remove Species and Homeworld from the NPC header grid without breaking layout
2. **Biography Section**: Add a new section above the biography for NPC descriptive fields
3. **Template Structure**: NPCs use header.hbs for the top section and npc.hbs for the body content
4. **Field Consistency**: Ensure the moved fields maintain proper styling and data binding
5. **Layout Harmony**: Match the visual style used by PC character sheets for consistency

## High-level Task Breakdown

### Task 1: Analyze Current NPC Layout Structure
**Success Criteria**: Understand how NPC sheets are organized and where fields are located
- [ ] Examine header.hbs to locate Species and Homeworld fields in NPC section
- [ ] Check npc.hbs to understand the biography section structure
- [ ] Compare with PC character sheet layout for consistency reference
- [ ] Identify the exact field elements that need to be moved

### Task 2: Design New NPC Biography Header Section
**Success Criteria**: Plan the layout for descriptive fields above biography
- [ ] Design a section similar to PC character details area
- [ ] Plan field arrangement (Species, Homeworld in appropriate layout)
- [ ] Ensure styling matches PC character sheet aesthetic
- [ ] Consider responsive design and field sizing

### Task 3: Remove Fields from Header
**Success Criteria**: Clean up NPC header section
- [ ] Remove Species field from header.hbs NPC section
- [ ] Remove Homeworld field from header.hbs NPC section
- [ ] Verify other header fields remain properly aligned
- [ ] Test that grid layout still works correctly

### Task 4: Add Fields to Biography Section
**Success Criteria**: Implement new descriptive section in NPC template
- [ ] Add new section above biography in npc.hbs
- [ ] Implement Species and Homeworld fields with proper styling
- [ ] Ensure data binding remains intact (system.species, system.homeworld)
- [ ] Match visual styling from PC character sheets

### Task 5: Style and Layout Polish
**Success Criteria**: Ensure professional and consistent appearance
- [ ] Apply appropriate CSS classes for field styling
- [ ] Ensure proper spacing and alignment
- [ ] Test field responsiveness with long text values
- [ ] Verify consistency with PC sheet styling

### Task 6: Test and Validate
**Success Criteria**: Confirm all functionality works correctly
- [ ] Test Species field editing and saving on NPC sheets
- [ ] Test Homeworld field editing and saving on NPC sheets
- [ ] Verify header layout looks correct without removed fields
- [ ] Check biography section displays properly with new fields
- [ ] Compare visual consistency with PC character sheets

## Project Status Board
- [x] Task 1: Analyze Current NPC Layout Structure
- [x] Task 2: Design New NPC Biography Header Section
- [x] Task 3: Remove Fields from Header
- [x] Task 4: Add Fields to Biography Section
- [x] Task 5: Style and Layout Polish
- [ ] Task 6: Test and Validate

## Executor's Feedback or Assistance Requests
### Task 1 Progress: Analyzed Current NPC Layout Structure ✓
- **NPC Header Fields**: Located in header.hbs lines 313-314
  - `{{formGroup systemFields.species value=system.species localize=true widget=headerWidget}}`
  - `{{formGroup systemFields.homeworld value=system.homeworld localize=true widget=headerWidget}}`
- **NPC Template**: npc.hbs currently has no biography section - only 3 columns with stats, rollables, and inventory
- **PC Pattern**: biography.hbs has descriptive fields above biography in a flex container (lines 10-15)
  - Uses `<div class="flex flexrow" style="margin:2px;gap:2px;">` container
  - Shows Class, Species, Homeworld, Background, Employer for PCs

### Task 2 Progress: Designed New NPC Biography Header Section ✓
Based on PC pattern, NPCs will get a similar section but only with Species and Homeworld:
```handlebars
<div class="flex flexrow" style="margin:2px;gap:2px;">
  {{formGroup systemFields.species value=system.species localize=true}}
  {{formGroup systemFields.homeworld value=system.homeworld localize=true}}
</div>
```
This will be added at the top of npc.hbs, creating a descriptive section that matches PC styling.

### Task 3 & 4 Progress: Successfully Relocated Fields ✓
- **Removed from Header**: Species and Homeworld fields removed from header.hbs NPC section (lines 313-314)
- **Added to Biography Tab**: Fields added to biography.hbs for NPCs
- **Implementation**: Uses same styling pattern as PC biography section
  - Added conditional section for `{{#if (eq actor.type 'npc')}}`
  - Flex row container with `margin:2px;gap:2px;`
  - `{{formGroup}}` pattern for consistency
  - Data binding preserved (`system.species`, `system.homeworld`)

### UPDATE: Moved to Biography Tab
- **Removed from NPC Details**: Fields removed from npc.hbs 
- **Added to Biography**: Fields now appear on Biography tab alongside PC descriptive fields
- **Better Organization**: Descriptive fields are now grouped together on Biography tab for both PCs and NPCs

### Task 5 Progress: Styling Complete ✓
- No additional CSS needed - using existing `formGroup` styling from PC templates
- Layout matches PC character sheet pattern exactly
- Fields maintain proper responsive behavior

### Next Steps
- Test field functionality and visual appearance in Foundry

## Lessons
- Foundry chat messages are rendered differently than regular HTML and require special event handling
- Combined injuries/wounds fields use existing nested-field styles effectively
- Conditional field hiding based on game settings works well for organizing relevant information
- Layout changes require careful consideration of both header.hbs and individual sheet templates
