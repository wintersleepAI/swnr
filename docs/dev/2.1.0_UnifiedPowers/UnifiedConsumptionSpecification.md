# Multi-Cost Power System Specification (v2.1.1)

*Hybrid Multi-Cost Extension for SWNR Unified Power System — Foundry VTT v13*

*Based on project lead's consumption design with practical simplifications*

*Last compiled: 19 Jul 2025*

---

## 1 Design Principles

1. **Structured Multi-Cost.** Support up to 2 additional consumption types using fixed structure (covers 99% of use cases).
2. **Rich Consumption Types.** Granular consumption types including item consumption, strain, and effort variants.
3. **Backward Compatible.** Zero breaking changes to existing power system.
4. **Maintainable.** Fixed structure easier to validate and maintain than unlimited arrays.
5. **Item Integration.** Direct support for consuming physical items from inventory.

---

## 2 Schema Extension

### 2.1 Consumption Fields (New)

Add two structured consumption fields to existing item-power.mjs schema:

```javascript
// Add to existing item-power.mjs schema (alongside existing fields)
schema.consumes1 = new fields.SchemaField({
  type: new fields.StringField({
    choices: ["none", "sourceEffort", "spellPoints", "systemStrain", "consumableItem", "uses"],
    initial: "none"
  }),
  usesCost: new fields.NumberField({ initial: 1, min: 0 }),
  cadence: new fields.StringField({
    choices: ["scene", "day", "commit"],
    initial: "day" 
  }),
  // For consumableItem type - ID of inventory item to consume
  itemId: new fields.StringField(),
  // For uses type - internal power usage tracking
  uses: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0, min: 0 }),
    max: new fields.NumberField({ initial: 1, min: 0 })
  })
});

schema.consumes2 = new fields.SchemaField({
  // Identical structure to consumes1
  type: new fields.StringField({
    choices: ["none", "sourceEffort", "spellPoints", "systemStrain", "consumableItem", "uses"],
    initial: "none"
  }),
  usesCost: new fields.NumberField({ initial: 1, min: 0 }),
  cadence: new fields.StringField({
    choices: ["scene", "day", "commit"],
    initial: "day"
  }),
  itemId: new fields.StringField(),
  uses: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0, min: 0 }),
    max: new fields.NumberField({ initial: 1, min: 0 })
  })
});
```

### 2.2 Existing Fields (Unchanged)

All current power fields remain as the **primary cost**:

```javascript
// Primary resource cost (existing fields - no changes)
schema.resourceName     // "Effort", "Slots", "Points", "Strain", "Uses"
schema.subResource      // "Psychic", "Lv1", etc.
schema.resourceCost     // Amount to spend
schema.resourceLength   // "commit", "scene", "day"
schema.sharedResource   // Use actor pools vs internal
schema.strainCost       // Additional strain (existing pattern)

// Additional consumption (new fields)
schema.consumes1        // First optional consumption
schema.consumes2        // Second optional consumption
```

---

## 3 Properties Table

### 3.1 Consumption Properties (New)

| Field | Type | Description | Examples | Notes |
|-------|------|-------------|----------|-------|
| `consumes1.type` | `enum` | Type of consumption | `"sourceEffort"`, `"systemStrain"`, `"consumableItem"`, `"uses"` | What gets consumed |
| `consumes1.usesCost` | `number` | Amount consumed | `1`, `2`, `0` | For most consumption types |
| `consumes1.cadence` | `enum` | Recovery timing | `"scene"`, `"day"`, `"commit"` | When resource recovers |
| `consumes1.itemId` | `string` | Item ID to consume | `"abc123"` | Only for `consumableItem` type |
| `consumes1.uses` | `object` | Internal usage tracking | `{value: 0, max: 1}` | Only for `uses` type |
| `consumes2.*` | `*` | Second consumption | *Same as consumes1* | Identical structure |

### 3.2 Consumption Type Definitions

| Type | Description | Pool/Target | Uses Fields |
|------|-------------|-------------|-------------|
| `"none"` | No consumption | N/A | None |
| `"sourceEffort"` | Effort pool by source | `Effort:{source}` | `usesCost`, `cadence` |
| `"spellPoints"` | Spell points pool | `Points:Spell` | `usesCost`, `cadence` |
| `"systemStrain"` | System strain | `Strain:` | `usesCost`, `cadence` |
| `"consumableItem"` | Physical inventory item | Item by ID | `usesCost`, `itemId` |
| `"uses"` | Internal power uses | Power's own tracker | `uses.value/max`, `cadence` |

### 3.3 Existing Power Properties (Unchanged)

| Field | Type | Description | Current Usage |
|-------|------|-------------|---------------|
| `resourceName` | `enum` | Primary resource type | `"Effort"`, `"Slots"`, `"Points"`, `"Strain"`, `"Uses"` |
| `subResource` | `string` | Primary resource subtype | `"Psychic"`, `"Lv1"`, etc. |
| `resourceCost` | `number` | Primary resource amount | `1`, `2`, `0` |
| `resourceLength` | `enum` | Primary resource cadence | `"commit"`, `"scene"`, `"day"` |
| `sharedResource` | `boolean` | Use actor pools vs internal | `true` (actor pools), `false` (item internal) |
| `strainCost` | `number` | Additional strain cost | `0`, `1`, `2` |

---

## 4 Usage Examples

### 4.1 Your Use Case: Commit Effort + Daily Use

```javascript
{
  // Primary cost (existing fields)
  resourceName: "Effort",
  subResource: "Psychic", 
  resourceCost: 1,
  resourceLength: "commit",
  sharedResource: true,
  
  // Additional costs (new fields)
  consumes1: {
    type: "uses",
    uses: { value: 0, max: 1 },
    cadence: "day"
  },
  consumes2: {
    type: "none"
  }
}
```

### 4.2 Mutation with Strain + Scene Uses

```javascript
{
  // Primary cost
  resourceName: "Uses",
  resourceCost: 0, // no primary cost
  
  // Additional costs
  consumes1: {
    type: "systemStrain",
    usesCost: 1,
    cadence: "scene"
  },
  consumes2: {
    type: "uses",
    uses: { value: 0, max: 1 },
    cadence: "scene"
  }
}
```

### 4.3 Spell with Material Component

```javascript
{
  // Primary cost
  resourceName: "Slots",
  subResource: "Lv3",
  resourceCost: 1,
  resourceLength: "day",
  
  // Additional costs
  consumes1: {
    type: "consumableItem",
    itemId: "diamond-dust-abc123", // ID of inventory item
    usesCost: 1
  },
  consumes2: {
    type: "none"
  }
}
```

### 4.4 Source-Based Effort Power

```javascript
{
  // Primary cost
  resourceName: "Effort",
  subResource: "Mentalist", // source-based
  resourceCost: 1,
  resourceLength: "day",
  
  // Additional costs
  consumes1: {
    type: "sourceEffort", // Alternative effort pool
    usesCost: 1,
    cadence: "scene"
  },
  consumes2: {
    type: "systemStrain",
    usesCost: 1,
    cadence: "day"
  }
}
```

### 4.5 Simple Power (No Additional Costs)

```javascript
{
  // Primary cost only (existing behavior)
  resourceName: "Effort",
  subResource: "Psychic",
  resourceCost: 1,
  resourceLength: "scene",
  
  // No additional costs needed
  consumes1: { type: "none" },
  consumes2: { type: "none" }
}
```

---

## 5 Migration Strategy

### 5.1 Zero Migration Required

**No data changes needed:**
- New `additionalCosts` field defaults to empty array `[]`
- All existing powers continue working unchanged
- No breaking changes to existing data model

### 5.2 Optional Strain Cost Migration

If desired, existing `strainCost` field could be migrated to `additionalCosts`:

```javascript
// Current (works fine, no migration needed):
{
  resourceName: "Effort",
  resourceCost: 1,
  strainCost: 2, // existing pattern
  resourceLength: "scene"
}

// Optional migration to new pattern:
{
  resourceName: "Effort", 
  resourceCost: 1,
  strainCost: 0, // reset to 0
  resourceLength: "scene",
  additionalCosts: [
    {
      resourceType: "Strain",
      amount: 2,
      cadence: "scene"
    }
  ]
}
```

**Recommendation:** Leave existing `strainCost` alone, use `additionalCosts` for new multi-cost powers only.

---

## 6 Implementation Details

### 6.1 Code Changes Required

**1. Data Model** (item-power.mjs):
```javascript
// Add two consumption fields to existing schema
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
  itemId: new fields.StringField(),
  uses: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0, min: 0 }),
    max: new fields.NumberField({ initial: 1, min: 0 })
  })
};

schema.consumes1 = new fields.SchemaField(consumesSchema);
schema.consumes2 = new fields.SchemaField(consumesSchema);
```

**2. Usage Logic** (extend existing `use()` method):
```javascript
// After primary resource validation/spending, add:
for (const consumes of [this.consumes1, this.consumes2]) {
  if (consumes.type === "none") continue;
  
  await processConsumption(actor, consumes);
}

async function processConsumption(actor, consumes) {
  switch (consumes.type) {
    case "sourceEffort":
      const poolKey = `Effort:${actor.system.source || ""}`;
      await spendFromPool(actor, poolKey, consumes.usesCost, consumes.cadence);
      break;
    case "systemStrain":
      await addStrain(actor, consumes.usesCost);
      break;
    case "consumableItem":
      const item = actor.items.get(consumes.itemId);
      if (item) await item.system.removeOneUse();
      break;
    case "uses":
      // Handle internal power uses with recovery
      break;
  }
}
```

**3. UI Template** (power.hbs):
```handlebars
<!-- Add after existing resource fields -->
<div class="consumption-section">
  <h3>Additional Consumption</h3>
  
  <!-- Consumes 1 -->
  <div class="consumes-group">
    <label>Consumes 1:</label>
    <select name="system.consumes1.type">
      <option value="none">None</option>
      <option value="sourceEffort">Source Effort</option>
      <option value="systemStrain">System Strain</option>
      <option value="consumableItem">Inventory Item</option>
      <option value="uses">Power Uses</option>
    </select>
    <!-- Conditional fields based on type -->
  </div>
  
  <!-- Consumes 2 -->
  <div class="consumes-group">
    <label>Consumes 2:</label>
    <!-- Same structure as consumes1 -->
  </div>
</div>
```

### 6.2 Benefits of This Hybrid Approach

✅ **Fixed Structure** - Easier to validate and maintain than arrays  
✅ **Rich Types** - Granular consumption types including items  
✅ **Item Integration** - Direct inventory item consumption support  
✅ **Covers 99% of Cases** - Two additional consumptions handle complex powers  
✅ **No Breaking Changes** - Existing powers unaffected  
✅ **Type Safety** - Fixed schema prevents invalid configurations

---

## 7 Summary

This specification provides a **minimal, focused solution** to enable multi-cost powers while maintaining the stability and simplicity of your existing unified power system.

### Key Points:

1. **Single Field Addition**: Only `additionalCosts` array needs to be added
2. **Zero Breaking Changes**: All existing powers continue working unchanged  
3. **Solves Your Use Case**: Enables effort + daily use combinations
4. **Easy to Implement**: Simple extension of existing patterns
5. **Future-Proof**: Foundation for more complex consumption if needed later

### Implementation Effort:
- **Data Model**: ~5 lines (single field definition)
- **Logic**: ~10 lines (loop through additional costs)  
- **UI**: ~20 lines (additional cost editor)
- **Testing**: Focus on new multi-cost functionality only

This approach gives you the multi-cost functionality you need without the complexity and maintenance burden of a complete consumption system rewrite.