# Power Resource Integration Implementation Guide

*Implementation Date: 21 Jul 2025*  
*System Version: v2.2.1*  
*For: SWNR Unified Power System*

## Overview

This guide documents the complete implementation of power resource field integration, providing developers with understanding of the architecture, implementation patterns, and maintenance procedures.

## Architecture Overview

### Resource Pool System Flow
```
Features/Foci/Edges → Grant Pools → Actor Calculates → Powers Consume
     (Create)           (Store)        (Manage)        (Use)
```

### Pool Key Format
**Standard Format**: `"ResourceName:SubResource"`  
**Examples**: 
- `"Effort:Psychic"` - Psychic effort pool
- `"Slots:Lv3"` - 3rd level spell slots  
- `"Uses:Mutation"` - Mutation-specific uses
- `""` - Passive power (no resource consumption)

## Implementation Details

### 1. Schema Architecture

**File**: `module/data/items/item-power.mjs`

```javascript
// Resource identification fields
schema.resourceName = new fields.StringField({
  choices: ["Effort", "Slots", "Points", "Strain", "Uses"],
  initial: null,      // ⚠️ CRITICAL: Must be null for V13 validation
  required: false,
  nullable: true
});
schema.subResource = new fields.StringField({
  initial: null,      // ⚠️ CRITICAL: Must be null for V13 validation  
  required: false,
  nullable: true
});
```

**Key Design Decisions**:
- **Nullable Fields**: Required for Foundry V13 schema validation
- **No Empty String Initial**: Foundry rejects `""` even in choices
- **Optional Fields**: Powers can be passive (no resource consumption)

### 2. Resource Key Method

**File**: `module/data/items/item-power.mjs`

```javascript
/**
 * Generate the pool key for this power's resource consumption
 * @returns {string} Pool key in format "ResourceName:SubResource"
 */
resourceKey() {
  if (!this.resourceName) {
    return ""; // Passive power, no resource consumption
  }
  return `${this.resourceName}:${this.subResource || ""}`;
}
```

**Usage Pattern**:
```javascript
// In consumption handlers
const poolKey = power.system.resourceKey();
const pool = actor.system.pools[poolKey];
if (pool && pool.value >= cost) {
  await actor.update({ [`system.pools.${poolKey}.value`]: pool.value - cost });
}
```

### 3. Migration System

**File**: `module/migration.mjs` (v2.2.1)

**Migration Logic**:
```javascript
// Map subType to appropriate resource configuration
switch (system.subType) {
  case "psychic":
  case "art":
  case "adept":
    system.resourceName = "Effort";
    system.subResource = system.source || system.subType;
    break;
  case "spell":
    system.resourceName = "Slots";  
    system.subResource = `Lv${system.level || 1}`;
    break;
  case "mutation":
    system.resourceName = "Uses";
    system.subResource = system.source || "";
    break;
}
```

**Migration Safety**:
- Only migrates powers with `null` resourceName (avoids re-migration)
- Handles both world items and actor-embedded powers
- Comprehensive error handling and logging
- Preserves all existing power data

### 4. User Interface Integration

**File**: `templates/item/attribute-parts/power.hbs`

**UI Architecture**: Follows ApplicationV2 patterns exactly
- Uses existing grid layout (`grid grid-4col`)
- Standard form submission (`form.submitOnChange: true`)
- No custom JavaScript handlers needed
- Consistent with existing resource field patterns

**Template Pattern**:
```handlebars
<div class="resource">
  <label class="resource-label">Resource Pool</label>
  <select name="system.resourceName" data-dtype="String">
    <option value="" {{#unless system.resourceName}}selected{{/unless}}>None (Passive)</option>
    <option value="Effort" {{#if (eq system.resourceName "Effort")}}selected{{/if}}>Effort</option>
    <!-- ... other options -->
  </select>
</div>
```

**Null Value Handling**:
```handlebars
<!-- Safe null handling in templates -->
<input value="{{#if system.subResource}}{{system.subResource}}{{/if}}" />
```

## Usage Patterns

### For Power Consumption
```javascript
// Get the power's resource pool key
const poolKey = power.system.resourceKey();

// Check if power has a resource requirement
if (poolKey) {
  const pool = actor.system.pools[poolKey];
  if (pool && pool.value >= requiredAmount) {
    // Consume resource
    await actor.update({ 
      [`system.pools.${poolKey}.value`]: pool.value - requiredAmount 
    });
  }
}
```

### For Pool Management
```javascript
// Features grant pools using same key format  
const poolKey = `${resourceName}:${subResource || ""}`;
pools[poolKey] = {
  value: currentValue,
  max: maxValue, 
  cadence: cadenceType
};
```

### For Chat Templates
```javascript
// In power usage chat cards
const templateData = {
  resourceName: power.system.resourceName || power.system.source || "Unknown",
  resourceKey: power.system.resourceKey(),
  isPassive: !power.system.resourceKey()
};
```

## Testing & Validation

### Test Resource Key Method
```javascript
// Test passive power
const passivePower = { resourceName: null, subResource: null };
assert(passivePower.resourceKey() === "");

// Test effort power  
const effortPower = { resourceName: "Effort", subResource: "Psychic" };
assert(effortPower.resourceKey() === "Effort:Psychic");

// Test spell power
const spellPower = { resourceName: "Slots", subResource: "Lv3" };
assert(spellPower.resourceKey() === "Slots:Lv3");
```

### Migration Validation
```javascript
// Validate migration mapping
const testCases = [
  { input: { subType: "psychic", source: "Mentalist" }, 
    expected: { resourceName: "Effort", subResource: "Mentalist" }},
  { input: { subType: "spell", level: 3 }, 
    expected: { resourceName: "Slots", subResource: "Lv3" }},
  { input: { subType: "mutation", source: "Alien" }, 
    expected: { resourceName: "Uses", subResource: "Alien" }}
];
```

## Troubleshooting

### Common Issues

**Schema Validation Errors**:
- ✅ **Solution**: Ensure `initial: null` (not `""`) for nullable string fields
- ❌ **Wrong**: `initial: ""` causes Foundry V13 validation failures
- ✅ **Right**: `initial: null` passes validation

**Pool Lookup Failures**:
- ✅ **Solution**: Verify feature and power use same pool key format
- Check: `feature.poolsGranted.resourceName:subResource` matches `power.resourceKey()`

**Migration Not Running**:
- Check system version is incremented (v2.2.1)
- Verify migration function is in migrations object
- Migration only runs on powers with null resourceName

**UI Not Updating**:
- ApplicationV2 handles form submission automatically
- No custom JavaScript needed if following existing patterns
- Check template uses correct `name="system.fieldName"` format

## Maintenance Guidelines

### When Adding New Resource Types
1. Add to `resourceName` choices in schema
2. Update migration logic if needed  
3. Add to UI dropdown options
4. Update validation tests

### When Modifying Pool System
1. Maintain `"ResourceName:SubResource"` key format
2. Update both feature granting and power consumption
3. Test migration with existing data
4. Validate pool key consistency

### ApplicationV2 Compatibility
- Always use existing working patterns
- No custom form handlers needed
- Follow KISS principles
- Test with actual Foundry V13 instance

## Performance Considerations

- `resourceKey()` method is lightweight (string concatenation)
- Migration runs once per world on version update
- UI uses standard ApplicationV2 rendering (no performance impact)
- Pool lookup is O(1) object property access

## Security Notes

- No user input validation needed (choices constrained by schema)
- Migration preserves all existing data
- No new attack vectors introduced
- Follows Foundry security best practices

---

**Implementation Status**: ✅ Complete and Production Ready  
**Last Updated**: 21 Jul 2025  
**System Version**: v2.2.1