# Multi-Cost Power System Implementation Plan

*Detailed implementation roadmap for hybrid consumption system*

*Target Version: v2.1.2*

---

## Implementation Phases

### Phase 1: Data Model Extension ⚡ **HIGH PRIORITY**

**Objective**: Add `consumes1` and `consumes2` fields to power data model

**Files to Modify**:
- `module/data/items/item-power.mjs`

**Tasks**:

1. **Define Consumption Schema**
   ```javascript
   // Add after existing schema fields (around line 51)
   const consumesSchema = {
     type: new fields.StringField({
       choices: ["none", "sourceEffort", "spellPoints", "systemStrain", "consumableItem", "uses"],
       initial: "none"
     }),
     usesCost: new fields.NumberField({ initial: 1, min: 0 }),
     cadence: new fields.StringField({
       choices: ["scene", "day", "commit"],
       initial: "day"
     }),
     itemId: new fields.StringField({ initial: "" }),
     uses: new fields.SchemaField({
       value: new fields.NumberField({ initial: 0, min: 0 }),
       max: new fields.NumberField({ initial: 1, min: 0 })
     })
   };

   schema.consumes1 = new fields.SchemaField(consumesSchema);
   schema.consumes2 = new fields.SchemaField(consumesSchema);
   ```

2. **Add Helper Methods**
   ```javascript
   // Add to SWNPower class
   hasConsumption() {
     return this.consumes1?.type !== "none" || this.consumes2?.type !== "none";
   }

   getConsumptions() {
     const consumptions = [];
     if (this.consumes1?.type !== "none") consumptions.push(this.consumes1);
     if (this.consumes2?.type !== "none") consumptions.push(this.consumes2);
     return consumptions;
   }
   ```

**Acceptance Criteria**:
- [ ] New fields appear in power data model
- [ ] Default values don't break existing powers
- [ ] Helper methods return expected values
- [ ] No migration errors on existing powers

**Time Estimate**: 2-3 hours

---

### Phase 2: Usage Logic Extension ⚡ **HIGH PRIORITY**

**Objective**: Extend power usage to process additional consumption types

**Files to Modify**:
- `module/data/items/item-power.mjs` (extend `use()` method)
- `module/helpers/refresh-helpers.mjs` (for uses recovery)

**Tasks**:

1. **Extend Main Usage Method**
   ```javascript
   // In existing use() method, after primary resource spending
   // Around line 150-200 in current implementation
   
   // Process additional consumptions
   for (const consumes of this.getConsumptions()) {
     const result = await this._processConsumption(actor, consumes, options);
     if (!result.success) {
       // Rollback any changes and return failure
       return result;
     }
   }
   ```

2. **Add Consumption Processing**
   ```javascript
   async _processConsumption(actor, consumes, options) {
     switch (consumes.type) {
       case "sourceEffort":
         return await this._processSourceEffort(actor, consumes);
       case "spellPoints":
         return await this._processSpellPoints(actor, consumes);
       case "systemStrain":
         return await this._processSystemStrain(actor, consumes);
       case "consumableItem":
         return await this._processConsumableItem(actor, consumes);
       case "uses":
         return await this._processInternalUses(consumes);
       default:
         return { success: true };
     }
   }
   ```

3. **Implement Consumption Handlers**
   ```javascript
   async _processSourceEffort(actor, consumes) {
     const source = this.parent.system.source || "";
     const poolKey = `Effort:${source}`;
     const pool = actor.system.pools[poolKey];
     
     if (!pool || pool.value < consumes.usesCost) {
       return { 
         success: false, 
         reason: "insufficient-source-effort",
         poolKey,
         required: consumes.usesCost,
         available: pool?.value || 0
       };
     }
     
     await actor.update({
       [`system.pools.${poolKey}.value`]: pool.value - consumes.usesCost
     });
     
     return { success: true, spent: { [poolKey]: consumes.usesCost } };
   }

   async _processSystemStrain(actor, consumes) {
     const currentStrain = actor.system.systemStrain || 0;
     const newStrain = currentStrain + consumes.usesCost;
     
     await actor.update({
       "system.systemStrain": newStrain
     });
     
     return { success: true, spent: { strain: consumes.usesCost } };
   }

   async _processConsumableItem(actor, consumes) {
     const item = actor.items.get(consumes.itemId);
     if (!item) {
       return { 
         success: false, 
         reason: "item-not-found",
         itemId: consumes.itemId
       };
     }
     
     if (item.system.uses?.value < consumes.usesCost) {
       return {
         success: false,
         reason: "insufficient-item-uses",
         itemName: item.name,
         required: consumes.usesCost,
         available: item.system.uses?.value || 0
       };
     }
     
     await item.system.removeOneUse();
     return { success: true, spent: { [item.name]: consumes.usesCost } };
   }

   async _processInternalUses(consumes) {
     if (consumes.uses.value <= 0) {
       return {
         success: false,
         reason: "no-uses-remaining",
         maxUses: consumes.uses.max
       };
     }
     
     const newValue = consumes.uses.value - 1;
     await this.parent.update({
       [`system.consumes${this === this.parent.system.consumes1 ? '1' : '2'}.uses.value`]: newValue
     });
     
     return { success: true, spent: { uses: 1 } };
   }
   ```

4. **Add Recovery Logic**
   ```javascript
   // In refresh-helpers.mjs, extend refresh functions
   async function refreshConsumptionUses(actor, cadence) {
     const updates = {};
     
     for (const item of actor.items) {
       if (item.type !== "power") continue;
       
       const power = item.system;
       for (const [index, consumes] of [power.consumes1, power.consumes2].entries()) {
         if (consumes?.type === "uses" && consumes.cadence === cadence) {
           updates[`items.${item.id}.system.consumes${index + 1}.uses.value`] = consumes.uses.max;
         }
       }
     }
     
     if (Object.keys(updates).length > 0) {
       await actor.update(updates);
     }
   }
   ```

**Acceptance Criteria**:
- [ ] All consumption types process correctly
- [ ] Failed consumption doesn't partially spend resources
- [ ] Recovery works for "uses" type consumptions
- [ ] Error messages are descriptive and helpful
- [ ] Existing power usage unaffected

**Time Estimate**: 6-8 hours

---

### Phase 3: UI Template Updates ⚡ **HIGH PRIORITY**

**Objective**: Add consumption editor to power item sheet

**Files to Modify**:
- `templates/item/attribute-parts/power.hbs`

**Tasks**:

1. **Add Consumption Section**
   ```handlebars
   <!-- Add after existing resource configuration section -->
   <div class="consumption-section">
     <h3>{{localize "SWN.AdditionalConsumption"}}</h3>
     
     {{> consumptionEditor consumption=system.consumes1 name="system.consumes1" label="Consumes 1"}}
     {{> consumptionEditor consumption=system.consumes2 name="system.consumes2" label="Consumes 2"}}
   </div>
   ```

2. **Create Consumption Editor Partial**
   ```handlebars
   <!-- templates/item/partials/consumption-editor.hbs -->
   <div class="consumption-group" data-consumption="{{name}}">
     <div class="consumption-header">
       <label class="consumption-label">{{label}}:</label>
       <select name="{{name}}.type" class="consumption-type">
         <option value="none" {{#eq consumption.type "none"}}selected{{/eq}}>{{localize "SWN.None"}}</option>
         <option value="sourceEffort" {{#eq consumption.type "sourceEffort"}}selected{{/eq}}>{{localize "SWN.SourceEffort"}}</option>
         <option value="spellPoints" {{#eq consumption.type "spellPoints"}}selected{{/eq}}>{{localize "SWN.SpellPoints"}}</option>
         <option value="systemStrain" {{#eq consumption.type "systemStrain"}}selected{{/eq}}>{{localize "SWN.SystemStrain"}}</option>
         <option value="consumableItem" {{#eq consumption.type "consumableItem"}}selected{{/eq}}>{{localize "SWN.ConsumableItem"}}</option>
         <option value="uses" {{#eq consumption.type "uses"}}selected{{/eq}}>{{localize "SWN.Uses"}}</option>
       </select>
     </div>
     
     <!-- Conditional fields based on type -->
     <div class="consumption-details">
       {{#unless (eq consumption.type "none")}}
         <!-- Cost field (for most types) -->
         {{#unless (eq consumption.type "uses")}}
           <div class="consumption-field">
             <label>{{localize "SWN.Cost"}}:</label>
             <input type="number" name="{{name}}.usesCost" value="{{consumption.usesCost}}" min="0">
           </div>
         {{/unless}}
         
         <!-- Cadence field -->
         {{#unless (eq consumption.type "consumableItem")}}
           <div class="consumption-field">
             <label>{{localize "SWN.Cadence"}}:</label>
             <select name="{{name}}.cadence">
               <option value="scene" {{#eq consumption.cadence "scene"}}selected{{/eq}}>{{localize "SWN.Scene"}}</option>
               <option value="day" {{#eq consumption.cadence "day"}}selected{{/eq}}>{{localize "SWN.Day"}}</option>
               <option value="commit" {{#eq consumption.cadence "commit"}}selected{{/eq}}>{{localize "SWN.Commit"}}</option>
             </select>
           </div>
         {{/unless}}
         
         <!-- Item selection (for consumableItem type) -->
         {{#eq consumption.type "consumableItem"}}
           <div class="consumption-field">
             <label>{{localize "SWN.Item"}}:</label>
             <select name="{{name}}.itemId" class="item-selector">
               <option value="">{{localize "SWN.SelectItem"}}</option>
               {{#each @root.consumableItems}}
                 <option value="{{id}}" {{#eq ../consumption.itemId id}}selected{{/eq}}>{{name}}</option>
               {{/each}}
             </select>
           </div>
         {{/eq}}
         
         <!-- Uses tracking (for uses type) -->
         {{#eq consumption.type "uses"}}
           <div class="consumption-field uses-field">
             <label>{{localize "SWN.Uses"}}:</label>
             <div class="uses-inputs">
               <input type="number" name="{{name}}.uses.value" value="{{consumption.uses.value}}" min="0" max="{{consumption.uses.max}}">
               <span>/</span>
               <input type="number" name="{{name}}.uses.max" value="{{consumption.uses.max}}" min="1">
             </div>
           </div>
         {{/eq}}
       {{/unless}}
     </div>
   </div>
   ```

3. **Add CSS Styling**
   ```scss
   // src/scss/components/_power-consumption.scss
   .consumption-section {
     margin-top: 1rem;
     border-top: 1px solid var(--color-border-light);
     padding-top: 1rem;
     
     h3 {
       margin-bottom: 0.5rem;
       font-size: 0.9rem;
       font-weight: bold;
     }
   }
   
   .consumption-group {
     margin-bottom: 1rem;
     padding: 0.5rem;
     border: 1px solid var(--color-border-light);
     border-radius: 4px;
     
     .consumption-header {
       display: flex;
       align-items: center;
       gap: 0.5rem;
       margin-bottom: 0.5rem;
       
       .consumption-label {
         font-weight: bold;
         min-width: 80px;
       }
       
       .consumption-type {
         flex: 1;
       }
     }
     
     .consumption-details {
       display: none;
       
       &.show {
         display: block;
       }
       
       .consumption-field {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         margin-bottom: 0.25rem;
         
         label {
           min-width: 60px;
           font-size: 0.8rem;
         }
         
         input, select {
           flex: 1;
         }
       }
       
       .uses-field .uses-inputs {
         display: flex;
         align-items: center;
         gap: 0.25rem;
         
         input {
           width: 60px;
         }
       }
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Consumption editors appear in power item sheet
- [ ] Type selector shows/hides appropriate fields
- [ ] Item selector populated with consumable items
- [ ] Uses fields work correctly
- [ ] Styling matches existing power sheet design

**Time Estimate**: 4-5 hours

---

### Phase 4: UI JavaScript Handlers 🔧 **MEDIUM PRIORITY**

**Objective**: Add interactivity to consumption UI

**Files to Modify**:
- `module/sheets/item-sheet.mjs`

**Tasks**:

1. **Add Event Listeners**
   ```javascript
   // In SWNItemSheet activateListeners method
   html.find('.consumption-type').change(this._onConsumptionTypeChange.bind(this));
   html.find('.item-selector').change(this._onConsumptionItemChange.bind(this));
   ```

2. **Implement Event Handlers**
   ```javascript
   async _onConsumptionTypeChange(event) {
     const select = event.currentTarget;
     const consumptionGroup = select.closest('.consumption-group');
     const details = consumptionGroup.querySelector('.consumption-details');
     const type = select.value;
     
     // Show/hide details based on type
     if (type === "none") {
       details.classList.remove('show');
     } else {
       details.classList.add('show');
     }
     
     // Update form data
     const name = consumptionGroup.dataset.consumption;
     const formData = { [name]: { type } };
     
     // Set sensible defaults for new type
     switch (type) {
       case "sourceEffort":
       case "spellPoints":
       case "systemStrain":
         formData[name].usesCost = 1;
         formData[name].cadence = "day";
         break;
       case "uses":
         formData[name].uses = { value: 1, max: 1 };
         formData[name].cadence = "day";
         break;
     }
     
     await this.document.update(formData);
   }

   async _onConsumptionItemChange(event) {
     const select = event.currentTarget;
     const itemId = select.value;
     const consumptionGroup = select.closest('.consumption-group');
     const name = consumptionGroup.dataset.consumption;
     
     await this.document.update({
       [name]: { itemId }
     });
   }
   ```

3. **Add Data Preparation**
   ```javascript
   // In SWNItemSheet getData method, add:
   if (this.document.type === "power") {
     // Get consumable items for dropdowns
     const actor = this.document.actor;
     if (actor) {
       context.consumableItems = actor.items.filter(i => 
         i.type === "item" && i.system.uses?.consumable !== "none"
       ).map(i => ({ id: i.id, name: i.name }));
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Type selector shows/hides appropriate fields dynamically
- [ ] Item selector updates when changed
- [ ] Form updates properly without page refresh
- [ ] Default values set correctly for each consumption type

**Time Estimate**: 3-4 hours

---

### Phase 5: Enhanced Chat Cards 🔧 **MEDIUM PRIORITY**

**Objective**: Display consumption information in power usage chat cards

**Files to Modify**:
- `templates/chat/power-usage.hbs`
- `module/helpers/chat.mjs`

**Tasks**:

1. **Update Chat Template**
   ```handlebars
   <!-- Add to existing power-usage.hbs template -->
   {{#if consumptions}}
     <div class="consumption-display">
       <h4>{{localize "SWN.ResourcesConsumed"}}</h4>
       <div class="consumption-list">
         {{#each consumptions}}
           <div class="consumption-item">
             <span class="consumption-type">{{localize type}}</span>
             {{#if itemName}}
               <span class="consumption-item-name">{{itemName}}</span>
             {{/if}}
             {{#if cost}}
               <span class="consumption-cost">{{cost}}</span>
             {{/if}}
             {{#if cadence}}
               <span class="consumption-cadence">({{localize cadence}})</span>
             {{/if}}
           </div>
         {{/each}}
       </div>
     </div>
   {{/if}}
   ```

2. **Update Chat Helper**
   ```javascript
   // In chat.mjs, extend power usage chat creation
   static async createPowerUsageChat(power, actor, result) {
     const chatData = {
       // ... existing chat data
       consumptions: this._formatConsumptions(power, result.consumptions)
     };
     
     return ChatMessage.create(chatData);
   }

   static _formatConsumptions(power, consumptions) {
     if (!consumptions || consumptions.length === 0) return null;
     
     return consumptions.map(c => {
       const formatted = {
         type: `SWN.${c.type.charAt(0).toUpperCase()}${c.type.slice(1)}`,
         cost: c.cost,
         cadence: c.cadence ? `SWN.${c.cadence.charAt(0).toUpperCase()}${c.cadence.slice(1)}` : null
       };
       
       if (c.itemName) {
         formatted.itemName = c.itemName;
       }
       
       return formatted;
     });
   }
   ```

3. **Add CSS for Chat Display**
   ```scss
   // src/scss/components/_chat.scss
   .consumption-display {
     margin-top: 0.5rem;
     padding-top: 0.5rem;
     border-top: 1px solid var(--color-border-light);
     
     h4 {
       margin: 0 0 0.25rem 0;
       font-size: 0.8rem;
       font-weight: bold;
     }
     
     .consumption-list {
       display: flex;
       flex-direction: column;
       gap: 0.25rem;
     }
     
     .consumption-item {
       display: flex;
       align-items: center;
       gap: 0.5rem;
       font-size: 0.75rem;
       
       .consumption-type {
         font-weight: bold;
         color: var(--color-text-dark-primary);
       }
       
       .consumption-item-name {
         font-style: italic;
         color: var(--color-text-dark-secondary);
       }
       
       .consumption-cost {
         font-weight: bold;
         color: var(--color-text-dark-header);
       }
       
       .consumption-cadence {
         color: var(--color-text-dark-secondary);
         font-size: 0.7rem;
       }
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Chat cards show all consumed resources
- [ ] Consumption display is clear and informative
- [ ] Styling matches existing chat card design
- [ ] No chat cards when no additional consumption

**Time Estimate**: 2-3 hours

---

### Phase 6: Localization 🌐 **LOW PRIORITY**

**Objective**: Add localization strings for new consumption features

**Files to Modify**:
- `lang/en.json`

**Tasks**:

1. **Add Consumption Type Labels**
   ```json
   {
     "SWN": {
       "AdditionalConsumption": "Additional Consumption",
       "ConsumptionType": "Consumption Type",
       "SourceEffort": "Source Effort",
       "SpellPoints": "Spell Points", 
       "SystemStrain": "System Strain",
       "ConsumableItem": "Consumable Item",
       "Uses": "Uses",
       "None": "None",
       "Cost": "Cost",
       "Cadence": "Cadence",
       "Item": "Item",
       "SelectItem": "Select Item...",
       "Scene": "Scene",
       "Day": "Day",
       "Commit": "Commit",
       "ResourcesConsumed": "Resources Consumed",
       "InsufficientSourceEffort": "Insufficient source effort",
       "ItemNotFound": "Required item not found",
       "InsufficientItemUses": "Insufficient item uses",
       "NoUsesRemaining": "No uses remaining"
     }
   }
   ```

**Acceptance Criteria**:
- [ ] All new UI elements have localization keys
- [ ] Error messages are localized
- [ ] Strings follow existing naming conventions

**Time Estimate**: 1 hour

---

### Phase 7: Comprehensive Testing ⚡ **HIGH PRIORITY**

**Objective**: Ensure multi-cost system works correctly in all scenarios

**Test Categories**:

1. **Unit Tests for Consumption Types**
   - [ ] `sourceEffort` consumption validates and spends correctly
   - [ ] `systemStrain` adds to actor strain
   - [ ] `consumableItem` finds and consumes inventory items
   - [ ] `uses` tracks internal power usage
   - [ ] `spellPoints` works with spell point pools

2. **Integration Tests**
   - [ ] Powers with multiple consumptions work correctly
   - [ ] Failed consumption doesn't partially spend resources
   - [ ] Existing powers unaffected by changes
   - [ ] Recovery works for "uses" type consumptions
   - [ ] Chat cards display consumption information

3. **UI Tests**
   - [ ] Consumption editors appear and function correctly
   - [ ] Type changes show/hide appropriate fields
   - [ ] Item selectors populated correctly
   - [ ] Form updates save properly

4. **Edge Case Tests**
   - [ ] Invalid item IDs handled gracefully
   - [ ] Zero-cost consumptions work
   - [ ] Maximum uses validation
   - [ ] Concurrent power usage (mutex protection)

5. **Performance Tests**
   - [ ] Large number of powers doesn't slow sheet rendering
   - [ ] Consumption processing adds minimal overhead
   - [ ] Chat card generation remains fast

**Test Data Setup**:
```javascript
// Create test powers for each consumption type
const testPowers = [
  {
    name: "Source Effort Test",
    consumes1: { type: "sourceEffort", usesCost: 1, cadence: "day" }
  },
  {
    name: "Item Consumption Test", 
    consumes1: { type: "consumableItem", itemId: "test-item-id", usesCost: 1 }
  },
  {
    name: "Multi-Cost Test",
    consumes1: { type: "systemStrain", usesCost: 1, cadence: "scene" },
    consumes2: { type: "uses", uses: { value: 3, max: 3 }, cadence: "day" }
  }
];
```

**Acceptance Criteria**:
- [ ] All consumption types work as specified
- [ ] No regressions in existing functionality
- [ ] Error handling is robust and user-friendly
- [ ] Performance impact is minimal

**Time Estimate**: 6-8 hours

---

### Phase 8: Documentation Updates 📚 **LOW PRIORITY**

**Objective**: Update user documentation for multi-cost powers

**Files to Create/Modify**:
- User guide section on multi-cost powers
- Examples in system documentation
- Update changelog

**Tasks**:

1. **Create User Guide Section**
   - How to add additional consumption to powers
   - Explanation of each consumption type
   - Examples of common multi-cost scenarios

2. **Update System Documentation**
   - Add multi-cost examples to power documentation
   - Update API documentation for new fields
   - Add troubleshooting section

3. **Changelog Entry**
   - Document new multi-cost feature
   - List new consumption types
   - Note any breaking changes (should be none)

**Acceptance Criteria**:
- [ ] Users can understand how to use multi-cost powers
- [ ] Documentation includes practical examples
- [ ] Changelog is complete and accurate

**Time Estimate**: 2-3 hours

---

## Implementation Timeline

| Phase | Priority | Estimated Time | Dependencies |
|-------|----------|----------------|--------------|
| Phase 1 | HIGH | 2-3 hours | None |
| Phase 2 | HIGH | 6-8 hours | Phase 1 |
| Phase 3 | HIGH | 4-5 hours | Phase 1 |
| Phase 4 | MEDIUM | 3-4 hours | Phase 3 |
| Phase 5 | MEDIUM | 2-3 hours | Phase 2 |
| Phase 6 | LOW | 1 hour | Phase 3 |
| Phase 7 | HIGH | 6-8 hours | Phases 1-5 |
| Phase 8 | LOW | 2-3 hours | Phase 7 |

**Total Estimated Time**: 26-37 hours

**Critical Path**: Phases 1 → 2 → 7 (minimum viable implementation)

**Recommended Order**:
1. Complete Phases 1-3 for basic functionality
2. Test core consumption types (subset of Phase 7)
3. Add UI interactivity (Phase 4) and chat display (Phase 5)
4. Complete comprehensive testing (Phase 7)
5. Add localization and documentation (Phases 6, 8)

---

## Risk Mitigation

### High Risk Items:
1. **Resource Pool Integration**: Ensure consumption doesn't break existing pool logic
2. **Item Reference Handling**: Validate item IDs and handle missing items gracefully
3. **Performance Impact**: Keep consumption processing lightweight

### Mitigation Strategies:
1. **Incremental Development**: Test each consumption type individually
2. **Backward Compatibility**: Extensive testing with existing powers
3. **Error Handling**: Robust validation and user-friendly error messages
4. **Performance Monitoring**: Profile power usage before/after changes

### Rollback Plan:
- All changes are additive (new fields default to "none")
- Can disable consumption processing via feature flag if needed
- Database rollback not required (new fields are optional)

---

This implementation plan provides a structured approach to adding multi-cost functionality while maintaining the stability and performance of the existing unified power system.