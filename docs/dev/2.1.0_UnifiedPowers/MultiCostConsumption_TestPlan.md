# Multi-Cost Consumption System - Test Plan

*Comprehensive test validation for expandable consumption array functionality*

**Target Version**: v2.2.0  
**Test Environment**: Foundry VTT v13+ with SWNR system  
**Estimated Time**: 45-60 minutes

---

## Overview

This test plan validates the new expandable consumption array system that replaces the fixed `consumes1`/`consumes2` fields. The system supports unlimited consumption requirements per power with dynamic UI management.

## Pre-Test Setup

### Required Test World
1. Create a **new test world** with SWNR system
2. Import or create test data:
   - 1 Character actor with resource pools
   - 1-2 consumable items in inventory
   - 2-3 existing power items for testing

### Backup Preparation
1. **CRITICAL**: Create world backup before testing
2. Document any existing power items with consumption data

---

## Test Categories

## 1. Data Model Tests

### Test 1.1: New Consumption Array Schema
**Objective**: Verify the new consumptions array field is available and functional

**Steps**:
1. Create new Power item
2. Open browser console (F12)
3. Run:
   ```javascript
   // Find your power item
   const power = game.items.contents.find(i => i.type === "power");
   console.log("Consumption schema:", power.system.schema.fields.consumptions);
   console.log("Current consumptions:", power.system.consumptions);
   ```

**Expected Results**:
✅ Schema shows ArrayField for consumptions  
✅ Consumptions array exists (initially empty)  
✅ No validation errors

### Test 1.2: Consumption Entry Structure
**Objective**: Validate consumption entry data structure

**Steps**:
1. In console, create test consumption:
   ```javascript
   const testConsumption = {
     type: "sourceEffort",
     usesCost: 2,
     cadence: "day",
     itemId: "",
     uses: { value: 0, max: 1 }
   };
   
   await power.update({
     "system.consumptions": [testConsumption]
   });
   
   console.log("Updated consumptions:", power.system.consumptions);
   ```

**Expected Results**:
✅ Consumption entry saves correctly  
✅ All fields present with correct values  
✅ Array maintains structure

### Test 1.3: Helper Methods
**Objective**: Test data model helper methods

**Steps**:
1. Test helper methods:
   ```javascript
   console.log("hasConsumption():", power.system.hasConsumption());
   console.log("getConsumptions():", power.system.getConsumptions());
   
   // Add another consumption
   await power.system.addConsumption({
     type: "spellPoints",
     usesCost: 3,
     cadence: "scene"
   });
   
   console.log("After add:", power.system.consumptions.length);
   
   // Remove consumption
   await power.system.removeConsumption(0);
   console.log("After remove:", power.system.consumptions.length);
   ```

**Expected Results**:
✅ hasConsumption() returns correct boolean  
✅ getConsumptions() filters out "none" types  
✅ addConsumption() increases array length  
✅ removeConsumption() decreases array length

---

## 2. User Interface Tests

### Test 2.1: Consumption Table Display
**Objective**: Verify the consumption table renders correctly

**Steps**:
1. Open a power item sheet
2. Navigate to "Additional Consumption" section
3. Verify initial state displays "No additional consumption costs configured"
4. Click "Add Cost" button

**Expected Results**:
✅ Table appears with proper headers  
✅ New row added with dropdowns and inputs  
✅ "Add Cost" button functional  
✅ UI styling appropriate

### Test 2.2: Consumption Type Selection
**Objective**: Test all consumption type options

**Steps**:
1. In consumption table, test each type:
   - Select "Source Effort" → verify cost and cadence fields appear
   - Select "Spell Points" → verify cost field appears
   - Select "System Strain" → verify cost field appears
   - Select "Consumable Item" → verify item selector appears
   - Select "Internal Uses" → verify uses current/max fields appear

**Expected Results**:
✅ Type dropdown contains all options  
✅ UI adapts correctly for each type  
✅ Placeholders show for unused fields  
✅ All inputs accept appropriate values

### Test 2.3: Add/Remove Functionality
**Objective**: Test dynamic table management

**Steps**:
1. Add multiple consumption entries (aim for 4-5)
2. Verify each has unique index
3. Remove middle entry
4. Add another entry
5. Remove all entries

**Expected Results**:
✅ Multiple entries can be added  
✅ Remove buttons work correctly  
✅ Indices update properly after removal  
✅ UI handles empty state gracefully

### Test 2.4: Form Validation and Saving
**Objective**: Test field validation and persistence

**Steps**:
1. Create consumption entry with:
   - Type: "Source Effort"
   - Cost: 2
   - Cadence: "Commit"
2. Save item and reopen
3. Modify values and save again

**Expected Results**:
✅ Form data persists correctly  
✅ No validation errors  
✅ Changes save and reload properly

---

## 3. Consumption Processing Tests

### Test 3.1: Source Effort Consumption
**Objective**: Test source-based effort consumption

**Steps**:
1. Create character with "Effort:Psychic" pool (value: 3, max: 5)
2. Create power consuming 2 Source Effort (commit cadence)
3. Use the power
4. Check actor pools and effort commitments

**Expected Results**:
✅ Power usage succeeds  
✅ Source effort decreases by 2  
✅ Effort commitment recorded  
✅ Chat card shows consumption cost

### Test 3.2: Multiple Consumption Types
**Objective**: Test power with multiple consumption requirements

**Steps**:
1. Create power with:
   - Primary: 1 Effort (Psychic)
   - Consumption 1: 2 System Strain
   - Consumption 2: 1 Internal Use (max: 3)
2. Ensure actor has sufficient resources
3. Use the power
4. Verify all resources consumed correctly

**Expected Results**:
✅ All consumption types processed  
✅ Resources deducted correctly  
✅ Chat card shows all costs  
✅ Usage result includes consumption details

### Test 3.3: Insufficient Resources Handling
**Objective**: Test failure when resources are insufficient

**Steps**:
1. Create power requiring multiple resources
2. Set one resource to insufficient amount
3. Attempt to use power
4. Verify no resources are consumed

**Expected Results**:
✅ Power usage fails gracefully  
✅ No resources consumed on failure  
✅ Appropriate error message shown  
✅ Failure reason indicates which resource

### Test 3.4: Consumable Item Integration
**Objective**: Test consumable item consumption

**Steps**:
1. Create consumable item with uses (e.g., "Healing Potion")
2. Add to character inventory
3. Create power consuming 1 of this item
4. Use the power
5. Check item uses

**Expected Results**:
✅ Item selector populated with consumables  
✅ Item uses decrease correctly  
✅ Power fails if item has no uses  
✅ Chat card shows item consumption

---

## 4. Chat Integration Tests

### Test 4.1: Enhanced Chat Cards
**Objective**: Verify consumption costs appear in chat

**Steps**:
1. Create power with multiple consumption types
2. Use the power
3. Check chat message content
4. Verify icons and styling

**Expected Results**:
✅ Chat card shows all consumption costs  
✅ Different icons for each consumption type  
✅ Costs displayed with appropriate context  
✅ Styling matches system theme

### Test 4.2: Chat Card Content Accuracy
**Objective**: Ensure chat displays match actual consumption

**Steps**:
1. Use power with:
   - 2 Source Effort (commit)
   - 1 Spell Point
   - Internal use (2/3 remaining)
2. Compare chat display with actual consumption

**Expected Results**:
✅ Numbers match actual consumption  
✅ Cadence information shown correctly  
✅ Remaining counts accurate for uses  
✅ Item names shown for consumables

---

## 6. Performance Tests

### Test 6.1: Large Consumption Arrays
**Objective**: Test system with many consumption entries

**Steps**:
1. Create power with 10+ consumption entries
2. Test UI responsiveness
3. Test save/load performance
4. Use the power and measure response time

**Expected Results**:
✅ UI remains responsive  
✅ Save/load times reasonable  
✅ Power usage completes without timeout  
✅ No performance degradation

### Test 6.2: Concurrent Usage with Consumption
**Objective**: Test mutex protection with consumption

**Steps**:
1. Create power with multiple consumption types
2. In console, attempt concurrent usage:
   ```javascript
   const promises = [];
   for (let i = 0; i < 5; i++) {
     promises.push(power.system.use());
   }
   const results = await Promise.all(promises.map(p => p.catch(e => ({ error: e.message }))));
   console.log("Concurrent results:", results);
   ```

**Expected Results**:
✅ Only one usage succeeds  
✅ Others blocked by mutex  
✅ No race conditions in resource spending  
✅ System state remains consistent

---

## 7. Integration Tests

### Test 7.1: Refresh System Integration
**Objective**: Test consumption with refresh mechanics

**Steps**:
1. Use power with "day" cadence consumption
2. Trigger day refresh
3. Verify consumption resources restored
4. Test with mixed cadences

**Expected Results**:
✅ Day-cadence resources refresh correctly  
✅ Committed resources handled properly  
✅ Mixed cadences work independently  
✅ Uses/consumables don't auto-refresh

### Test 7.2: Actor Sheet Integration
**Objective**: Test consumption with actor-owned powers

**Steps**:
1. Add power to character actor
2. Open embedded power sheet
3. Configure consumption from actor context
4. Use power from actor sheet

**Expected Results**:
✅ Embedded power sheet works correctly  
✅ Consumption affects actor resources  
✅ UI updates reflect actor's inventory  
✅ No ownership or permission issues

---

## 8. Error Handling Tests

### Test 8.1: Invalid Consumption Data
**Objective**: Test handling of corrupt consumption data

**Steps**:
1. Manually create invalid consumption:
   ```javascript
   await power.update({
     "system.consumptions": [{ invalidField: "bad data" }]
   });
   ```
2. Try to use power
3. Check error handling

**Expected Results**:
✅ Invalid data handled gracefully  
✅ Appropriate error messages  
✅ System doesn't crash  
✅ Other powers unaffected

### Test 8.2: Missing Resource Pools
**Objective**: Test consumption when actor lacks required pools

**Steps**:
1. Create power requiring "Effort:Special"
2. Ensure actor doesn't have this pool
3. Use the power
4. Check auto-pool creation

**Expected Results**:
✅ Missing pools auto-created with appropriate values  
✅ Power usage handles missing resources gracefully  
✅ No silent failures

---

## Test Summary Template

### Overall Results
- **Tests Passed**: _____ / 23
- **Tests Failed**: _____ / 23
- **Critical Issues**: ___________
- **Non-Critical Issues**: ___________

### Critical Success Criteria (Must Pass)
- [ ] Consumption array schema works correctly
- [ ] UI table management functional
- [ ] Multiple consumption types process correctly
- [ ] Chat cards display consumption accurately
- [ ] Performance acceptable with large arrays
- [ ] Integration with existing systems works

### Multi-Cost System Sign-Off
**Tester**: ___________  
**Date**: ___________  
**Overall Status**: ✅ PASS / ❌ FAIL

**Notes**:
_____________________________________________
_____________________________________________

---

## Quick Test Script

For rapid validation, run this comprehensive test:

```javascript
// Quick Multi-Cost Consumption Test
async function quickConsumptionTest() {
  console.log("=== Quick Multi-Cost Consumption Test ===");
  
  // Get test actor
  const actor = game.actors.contents.find(a => a.type === "character");
  if (!actor) {
    console.error("No character actor found for testing");
    return;
  }
  
  // Setup actor resources
  await actor.update({
    "system.pools.Effort:Psychic": { value: 5, max: 5, cadence: "scene" },
    "system.systemStrain.value": 0
  });
  
  // Create test power with multi-cost consumption
  const power = await Item.create({
    name: "Test Multi-Cost Power",
    type: "power",
    system: {
      subType: "psychic",
      resourceName: "Effort",
      subResource: "Psychic",
      resourceCost: 1,
      resourceLength: "scene",
      sharedResource: true,
      consumptions: [
        {
          type: "systemStrain",
          usesCost: 2,
          cadence: "day",
          itemId: "",
          uses: { value: 0, max: 1 }
        },
        {
          type: "uses",
          usesCost: 1,
          cadence: "day",
          itemId: "",
          uses: { value: 3, max: 3 }
        }
      ]
    }
  }, { parent: actor });
  
  console.log("Created test power:", power.name);
  
  // Test power usage
  const result = await power.system.use();
  console.log("Usage result:", result);
  
  // Verify results
  const tests = [
    { name: "Power usage succeeded", pass: result.success },
    { name: "Consumptions processed", pass: Array.isArray(result.consumptions) },
    { name: "System strain increased", pass: actor.system.systemStrain.value === 2 },
    { name: "Power uses decreased", pass: power.system.consumptions[1].uses.value === 2 }
  ];
  
  const passed = tests.filter(t => t.pass).length;
  console.log(`Quick test results: ${passed}/${tests.length} passed`);
  
  tests.forEach(test => {
    console.log(`${test.pass ? "✅" : "❌"} ${test.name}`);
  });
  
  // Cleanup
  await power.delete();
  
  return passed === tests.length;
}

// Run the test
quickConsumptionTest();
```

---

*End of Test Plan*