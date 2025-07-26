# Debug "Click to Expand" Functionality

## Background and Motivation
The "Click to expand" button in the Critical Injury chat message is not functioning properly. When clicked, it should reveal the detailed breakdown of the severity calculation, but it appears to be non-responsive. This is a critical UX issue as it prevents players from understanding how the injury severity was calculated.

## Key Challenges and Analysis
1. **Event Binding**: The click handler may not be properly bound to the expand button
2. **Chat Message Rendering**: Foundry chat messages require special handling for interactive elements
3. **CSS/HTML Structure**: The expandable content may have incorrect styling or structure
4. **JavaScript Execution**: The handler code may have errors or may not be loaded

## High-level Task Breakdown

### Task 1: Investigate Current Implementation
**Success Criteria**: Understand how the expand functionality is currently implemented
- [ ] Examine the wound-roll.hbs template for the expand button structure
- [ ] Check chat.mjs for any click handlers related to chat messages
- [ ] Look for any JavaScript that handles expandable content
- [ ] Verify CSS classes for collapsible content

### Task 2: Debug Event Handlers
**Success Criteria**: Identify why click events aren't firing
- [ ] Check if chat message click handlers are registered
- [ ] Verify the data-action or class used for the expand button
- [ ] Test if the handler is being called using console.log
- [ ] Check browser console for JavaScript errors

### Task 3: Analyze Foundry Chat Message Patterns
**Success Criteria**: Understand best practices for interactive chat messages
- [ ] Search for other expandable/collapsible content in the codebase
- [ ] Check how other interactive chat elements work (e.g., roll buttons)
- [ ] Review Foundry documentation for chat message interactivity
- [ ] Identify the correct way to bind events to chat messages

### Task 4: Fix the Click Handler
**Success Criteria**: Implement working expand/collapse functionality
- [ ] Add proper event listener for the expand button
- [ ] Ensure event delegation works for dynamically added chat messages
- [ ] Toggle visibility of the calculation breakdown
- [ ] Update button text between "Click to expand" and "Click to collapse"

### Task 5: Style the Expandable Content
**Success Criteria**: Ensure smooth UX for expand/collapse
- [ ] Add CSS transitions for smooth expand/collapse
- [ ] Ensure proper spacing and layout when expanded
- [ ] Test with various severity calculations
- [ ] Verify mobile responsiveness

### Task 6: Test and Validate
**Success Criteria**: Confirm functionality works in all scenarios
- [ ] Test with new wound rolls
- [ ] Test with existing chat messages after reload
- [ ] Verify multiple expandable messages work independently
- [ ] Check for any performance issues
- [ ] Test in different browsers

## Project Status Board
- [x] Task 1: Investigate Current Implementation
- [x] Task 2: Debug Event Handlers
- [x] Task 3: Analyze Foundry Chat Message Patterns
- [x] Task 4: Fix the Click Handler
- [ ] Task 5: Style the Expandable Content
- [ ] Task 6: Test and Validate

## Executor's Feedback or Assistance Requests
### Task 1 Progress: Investigated Current Implementation ✓
- The wound-roll.hbs template has an expandable section using `.inline-roll` class and `.dice-tooltip` div
- The inline-roll link is supposed to toggle the visibility of dice-tooltip div
- However, there's NO click handler in chat.mjs for this specific pattern

### Task 2 Progress: Debugged Event Handlers ✓
- Found existing expandable content pattern that WORKS in power-roll.hbs and program-roll.hbs
- These use `.longShowDesc`/`.longHideDesc` buttons with `.hiddenShort`/`.hiddenLong` spans
- These DO have working handlers in chat.mjs (lines 23-45)
- The wound-roll template uses a different pattern that lacks a handler

### Task 3 Progress: Analyzed Foundry Chat Message Patterns ✓
- The `chatListeners` function in chat.mjs is called for ALL chat messages
- This is where event handlers are attached to chat message elements
- The existing expandable content uses event delegation with html.find() and .on("click")
- Need to add a similar handler for `.inline-roll` elements in the chatListeners function

### Task 4 Progress: Fixed the Click Handler ✓
- Added a click handler for `.inline-roll` elements in the chatListeners function
- The handler:
  - Prevents default action
  - Finds the `.dice-tooltip` within the same `.severity-section`
  - Toggles its visibility
  - Updates the tooltip text between "Click to expand" and "Click to collapse"
- Implementation follows the existing pattern used for other expandable content

### UPDATE: Changed Approach
- Click handler wasn't working as expected
- User requested to show calculation always visible instead
- Modified `wound-roll.hbs` template to:
  - Remove the clickable link wrapper
  - Show the dice calculation div by default (removed `display: none`)
  - Changed class from `dice-tooltip` to `dice-calculation` for clarity
- Removed the unused click handler from `chat.mjs`

### Next Steps
- Test the functionality in Foundry
- Add CSS transitions for smooth expand/collapse if needed

## Lessons
- Foundry chat messages are rendered differently than regular HTML and require special event handling
- The previous UI consistency update was successfully implemented and accepted
- Sometimes simpler solutions (always visible) are better than complex interactions (expandable) when the content is important and not too large
