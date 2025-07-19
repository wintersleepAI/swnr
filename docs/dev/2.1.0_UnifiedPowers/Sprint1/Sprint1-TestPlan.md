# Sprint 1 - Unified Power System Foundation Test Plan

*Test validation document for Sprint S-1 deliverables*

**Target Version**: v2.1.0  
**Test Environment**: Foundry VTT v13+ with SWNR system  
**Estimated Time**: 30-45 minutes

---

## Pre-Test Setup

### Required Test World
1. Create a **new test world** with SWNR system
2. Import or create test data:
   - 1 Character actor with existing powers (if available)
   - 1 NPC actor  
   - 2-3 existing power items (if available from compendiums)

### Backup Preparation
1. **CRITICAL**: Create world backup before testing migration
2. Note current system version in settings
3. Document any existing power items and their current `effort` values

---

## Test Categories

## 1. Power Schema Foundation Tests

### Test 1.1: New Power Item Creation
**Objective**: Verify new power schema fields are accessible and functional

**Steps**:
1. Navigate to Items directory
2. Create new Item → Select "Power" type
3. Open the newly created power item sheet

**Expected Results**:
✅ Power sheet opens without errors  
✅ All new fields are visible with proper labels:
- Power Type (dropdown: Psychic, Art, Adept, Spell, Mutation)
- Resource Type (dropdown: Effort, Slots, Points, Strain, Uses)
- Sub-Resource (text input with placeholder)
- Resource Cost (number input)
- Duration (dropdown: Commit, Scene, Day, Rest, Custom)
- Shared Resource (checkbox)
- Leveled Resource (checkbox)
- Strain Cost (number input)
- Internal Current/Max (number inputs)
- Uses Current/Max (number inputs)

**Pass/Fail**: Pass

### Test 1.2: Power Field Validation
**Objective**: Ensure schema validation works correctly

**Steps**:
1. In the new power item:
   - Select "Psychic" from Power Type dropdown
   - Select "Effort" from Resource Type dropdown
   - Enter "Psychic" in Sub-Resource field
   - Set Resource Cost to 1
   - Check "Shared Resource"
   - Select "Scene" from Duration
2. Save the item (Ctrl+S or close sheet)
3. Reopen the item

**Expected Results**:
✅ No validation errors in console  
✅ All field values persist correctly  
✅ Item saves and reopens with same values

**Pass/Fail**: Pass

### Test 1.3: Resource Key Generation
**Objective**: Verify resourceKey() method works correctly

**Steps**:
1. Open browser console (F12)
2. Create a power with:
   - Resource Type: "Effort"
   - Sub-Resource: "Psychic"
3. In console, find the power item and run:
   ```javascript
   // Find your power item (replace ID with actual ID)
   const power = game.items.contents.find(i => i.id === "Item-UUID");
   console.log("Resource Key:", power.system.resourceKey());
   ```

**Expected Results**:
✅ Console shows: `Resource Key: Effort:Psychic`  
✅ No errors in console

**Pass/Fail**: pass

---

## 2. Actor Pool System Tests

### Test 2.1: Actor Pool Schema
**Objective**: Verify actors have pools field available

**Steps**:
1. Open a Character actor sheet
2. Open browser console (F12)
3. In console, run:
   ```javascript
   // Replace with your actor's ID
   const actor = game.actors.contents.find(i => i.id === "OiuYlY6rOSb24SD5");
   console.log("Actor pools schema:", actor.system.schema.fields.pools);
   console.log("Current pools:", actor.system.pools);
   ```

**Expected Results**:
✅ Schema shows ObjectField for pools  
✅ Pools object exists (may be empty)  
✅ No errors in console

**Pass/Fail**: Pass

### Test 2.2: Manual Pool Creation
**Objective**: Test pool creation and manipulation

**Steps**:
1. With character actor open in console:
   ```javascript
   // Create a test pool
   const testPools = {
     "Effort:Psychic": { value: 3, max: 5, cadence: "scene" },
     "Slots:Lv1": { value: 1, max: 2, cadence: "day" }
   };
   
   actor.update({"system.pools": testPools});
   ```
2. Check actor data after update:
   ```javascript
   console.log("Updated pools:", actor.system.pools);
   ```

**Expected Results**:
✅ Actor updates successfully  
✅ Pools data persists in actor.system.pools  
✅ Pool structure matches input

**Pass/Fail**: pass

---

## 3. Configuration System Tests

### Test 3.1: Power Presets Availability
**Objective**: Verify CONFIG.SWN.powerPresets are loaded

**Steps**:
1. Open browser console
2. Run:
   ```javascript
   console.log("Pool Resource Names:", CONFIG.SWN.poolResourceNames);
   console.log("Power Presets:", CONFIG.SWN.powerPresets);
   console.log("Psychic Preset:", CONFIG.SWN.powerPresets.psychic);
   ```

**Expected Results**:
✅ poolResourceNames shows: `["Effort", "Slots", "Points", "Strain", "Uses"]`  
✅ powerPresets contains all 5 types: psychic, art, adept, spell, mutation  
✅ Psychic preset shows:
```javascript
{
  resourceName: "Effort",
  resourceCost: 1,
  subResource: "Psychic", 
  sharedResource: true,
  resourceLength: "scene"
}
```

**Pass/Fail**: ___________

---

## 4. Migration System Tests

### Test 4.1: Pre-Migration State Check
**Objective**: Document current state before migration

**Steps**:
1. In console, check current actors with effort:
   ```javascript
   // Check all actors for effort data
   game.actors.forEach(actor => {
     if (actor.system.effort) {
       console.log(`Actor ${actor.name}:`, actor.system.effort);
     }
   });
         //Document:
         VM654:3 Actor Adrien: {bonus: 0, current: 0, scene: 0, day: 0, max: 3, …}
         VM654:3 Actor Archaeologist Gadly Weavesworn: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Botanist Brindal Thistlewane: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Gunvinder "Gunny": {bonus: 0, current: 0, scene: 0, day: 0, max: 2, …}
         VM654:3 Actor Heyu: {bonus: 0, current: 0, scene: 0, day: 0, max: 2, …}
         VM654:3 Actor Large Mining Drone: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Pipkin Bramblefoot: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Small Sandworm Pack: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Speaker Jonas: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Tony: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor WW's Pet: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor Whisperer Scales: {bonus: 0, current: 0, scene: 0, day: 0, max: 0, …}
         VM654:3 Actor William "Wasp" Higarashi: {bonus: 0, current: 1, scene: 0, day: 0, max: 3, …}
         VM654:3 Actor Zayr Buendia: {bonus: 0, current: 0, scene: 0, day: 0, max: 2, …}
         VM654:3 Actor test: {bonus: 0, current: 0, scene: 0, day: 0, max: 1, …}
   
   // Check power items for effort field
   game.items.filter(i => i.type === "power").forEach(item => {
     console.log(`Power ${item.name}:`, item.system.effort);
   });

   //Document:
   Power Change Form: day
   VM1326:2 Power Dragon’s Beauty: null
   VM1326:2 Power Eyes of the Dragon: null
   VM1326:2 Power The Flame Within: current
   VM1326:2 Power The Flame Without: null
   ```
2. **Document results** for comparison after migration

**Expected Results**:
✅ Current effort data logged  
✅ Power items with effort field noted

**Pass/Fail**: Pass

### Test 4.2: Migration Execution
**Objective**: Test v2.1.0 migration runs successfully

**Steps**:
1. **ENSURE BACKUP IS CREATED FIRST**
2. In console, manually trigger migration:
   ```javascript
   // Get current version
   console.log("Current version:", game.settings.get("swnr", "systemMigrationVersion"));
   
   // Import and run migration
   const { migrateWorld } = await import("./systems/swnr/module/migration.mjs");
   await migrateWorld("2.0.11"); // Force migration from older version
   ```
3. Watch console for migration progress messages

**Expected Results**:
✅ Migration starts with info notification  
✅ Console shows: "Running migration for 2.1.0 - Unified Power System"  
✅ Migration completes with success message  
✅ No critical errors in console

**Pass/Fail**: pass

### Test 4.3: Post-Migration Validation
**Objective**: Verify migration converted data correctly

**Steps**:
1. Check converted actor pools:
   ```javascript
   game.actors.forEach(actor => {
     console.log(`Actor ${actor.name}:`);
     console.log("  Old effort:", actor.system.effort); // Should be undefined
     console.log("  New pools:", actor.system.pools);
   });
   ```

2. Check converted power items:
   ```javascript
   game.items.filter(i => i.type === "power").forEach(item => {
     console.log(`Power ${item.name}:`);
     console.log("  subType:", item.system.subType);
     console.log("  resourceName:", item.system.resourceName);
     console.log("  resourceKey:", item.system.resourceKey());
   });
   ```

**Expected Results**:
✅ Actor.system.effort is undefined (removed)  
✅ Actor.system.pools contains "Effort:Psychic" entries  
✅ Pool values match sum of old effort values  
✅ Power items have subType: "psychic"  
✅ Power items have resourceName: "Effort"  
✅ resourceKey() returns "Effort:Psychic"

**Pass/Fail**: pass

---

## 5. User Interface Tests

### Test 5.1: Power Sheet UI/UX
**Objective**: Validate new power sheet interface

**Steps**:
1. Open any power item sheet
2. Test each field:
   - Change Power Type dropdown to "Spell"
   - Change Resource Type to "Slots"
   - Enter "Lv3" in Sub-Resource
   - Set Resource Cost to 2
   - Change Duration to "Day"
   - Toggle Leveled Resource checkbox
3. Save and reopen

**Expected Results**:
✅ All dropdowns work correctly  
✅ All inputs accept and save values  
✅ Checkboxes toggle properly  
✅ Field labels are clear and descriptive  
✅ No console errors during interaction

**Pass/Fail**: pass

### Test 5.2: Conditional Field Display
**Objective**: Test conditional UI elements

**Steps**:
1. Create new power item
2. Uncheck "Shared Resource" checkbox
3. Observe if Internal Resource fields appear
4. Re-check "Shared Resource"
5. Verify Internal Resource fields hide

**Expected Results**:
✅ Internal Resource fields show/hide based on "Shared Resource" state  
✅ Conditional rendering works smoothly

**Pass/Fail**: pass

---

## 6. Integration Tests

### Test 6.1: Power Item on Actor
**Objective**: Test power items work correctly when owned by actors

**Steps**:
1. Drag a power item to a character actor
2. Open the embedded power item from actor sheet
3. Modify the power's resource settings
4. Save changes

**Expected Results**:
✅ Power item embeds successfully  
✅ Power sheet opens from actor context  
✅ Changes save to embedded item  
✅ No ownership or permission errors

**Pass/Fail**: pass

### Test 6.2: System Compatibility
**Objective**: Ensure no breaking changes to existing functionality

**Steps**:
1. Open character actor sheet - verify it renders
2. Open existing non-power items - verify they work
3. Test rolling dice from character sheet
4. Open NPC actor sheet - verify functionality

**Expected Results**:
✅ All existing actor sheets work normally  
✅ Non-power items unaffected  
✅ Core functionality preserved  
✅ No regression in existing features

**Pass/Fail**: pass

---

## 7. Error Handling Tests

### Test 7.1: Migration Error Recovery
**Objective**: Test migration handles errors gracefully

**Steps**:
1. Create an invalid power item (manually corrupt data in console):
   ```javascript
   // Create corrupted power for testing
   const badPower = await Item.create({
     name: "Corrupted Power",
     type: "power", 
     system: { invalidField: "bad data" }
   });
   ```
2. Run migration again to see error handling

**Expected Results**:
✅ Migration reports errors but continues  
✅ Error messages are informative  
✅ Migration doesn't crash completely  
✅ Valid items still migrate successfully

**Pass/Fail**: ___________

---

## Test Summary

### Overall Results
- **Tests Passed**: _____ / 15
- **Tests Failed**: _____ / 15
- **Critical Issues**: ___________
- **Non-Critical Issues**: ___________

### Critical Success Criteria (Must Pass)
- [ ] Power schema loads without errors
- [ ] Actor pools system functional
- [ ] Migration completes successfully
- [ ] No data loss during migration
- [ ] Power item sheets render correctly

### Sprint 1 Sign-Off
**Tester**: ___________  
**Date**: ___________  
**Overall Status**: ✅ PASS / ❌ FAIL  

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

---

## Troubleshooting

### Common Issues & Solutions

**Issue**: "Non-existent data field" errors  
**Solution**: Reload Foundry VTT to ensure data models are registered

**Issue**: Migration doesn't run  
**Solution**: Check system version, may need to manually set older version first

**Issue**: Console errors about choices  
**Solution**: Verify CONFIG.SWN is loaded properly, check for import errors

**Issue**: Power sheets don't save  
**Solution**: Check browser console for validation errors, verify all required fields

### Rollback Procedure
If critical issues found:
1. Restore world from backup created in Pre-Test Setup
2. Document all issues found
3. Report to development team with console logs

---

*End of Test Plan*