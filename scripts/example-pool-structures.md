# SWNR Pool and Consumption Data Structures

This document shows examples of the actual data structures used in the SWNR system for poolsGranted and consumptions arrays.

## poolsGranted Array Structure (Features/Foci/Edges)

Features, foci, and edges can grant resource pools to characters using the `poolsGranted` array. Each entry has the following structure:

```yaml
poolsGranted:
  - resourceName: "Effort"           # Required: Resource type (Effort, Slots, Points, Strain, Uses)
    subResource: "Psychic"           # Optional: Sub-resource identifier
    cadence: "day"                   # Required: Refresh cadence (commit, scene, day)
    formula: "1 + @skills.psychic.highest + Math.max(@stats.wis.mod, @stats.con.mod)"
    condition: ""                    # Optional: Condition for granting pool

  - resourceName: "Slots"
    subResource: "SpellsCast"
    cadence: "day"
    formula: "Math.ceiling(@level/2)"
    condition: ""

  - resourceName: "Slots"
    subResource: "SpellsPrepared"
    cadence: "day"
    formula: "+1"                    # Additive formula
    condition: "@level <= 1"         # Only granted at level 1 or below
```

### Real Examples from Compendium:

**Psychic Effort Feature:**
```yaml
poolsGranted:
  - resourceName: Effort
    subResource: Psychic
    formula: 1 + @skills.psychic.highest + Math.max(@stats.wis.mod, @stats.con.mod)
    condition: ''
    cadence: day
```

**High Mage Spells Feature:**
```yaml
poolsGranted:
  - resourceName: Slots
    subResource: SpellsCast
    cadence: day
    formula: 'Math.ceiling(@level/2)'
    condition: ''
  - resourceName: Slots
    subResource: SpellsPrepared
    cadence: day
    formula: '@level + 1'
    condition: ''
  - resourceName: Slots
    subResource: SpellsPrepared
    cadence: day
    formula: '+1'
    condition: '@level <= 1'
  - resourceName: Effort
    subResource: HighMage
    cadence: day
    formula: 'Math.max(1, @skills.magic.rank + Math.max(@stats.int.mod, @stats.cha.mod))'
    condition: ''
```

## consumptions Array Structure (Powers)

Powers can consume resources using the `consumptions` array. Each entry has the following structure:

```javascript
consumptions: [
  {
    type: "poolResource",             // Type: poolResource, systemStrain, consumableItem, uses, none
    resourceName: "Effort",           // For poolResource type: resource name
    subResource: "Psychic",           // For poolResource type: sub-resource
    usesCost: 1,                      // Amount to consume
    cadence: "scene",                 // Consumption cadence (commit, scene, day)
    spendOnPrep: false,              // If true, cost paid during preparation; if false, during casting
    
    // For consumableItem type:
    itemId: "abc123def456",           // ID of item to consume
    
    // For uses type (internal power uses):
    uses: {
      value: 3,                       // Current uses
      max: 5                          // Maximum uses
    }
  },
  {
    type: "systemStrain",
    usesCost: 2,                      // System strain to add
    cadence: "day",
    spendOnPrep: false
  },
  {
    type: "uses",
    usesCost: 1,                      // Always 1 for internal uses
    cadence: "day",                   // Refresh cadence for internal uses
    spendOnPrep: false,
    uses: {
      value: 2,                       // Current internal uses
      max: 3                          // Maximum internal uses
    }
  }
]
```

## Pool Key Format

Both systems use a consistent pool key format: `"ResourceName:SubResource"`

Examples:
- `"Effort:Psychic"` - Psychic effort pool
- `"Slots:SpellsCast"` - Spell casting slots
- `"Effort:"` - Generic effort pool (empty sub-resource, serves as fallback for any Effort consumption)
- `"Points:Gunnery"` - Gunnery points pool

**Pool Fallback Behavior**: When a power needs a specific sub-resource (e.g., "Effort:Psychic") but that pool is unavailable or has insufficient resources, the system automatically falls back to the corresponding generic pool (e.g., "Effort:") if available.

## Configuration Options

### Pool Resource Names (CONFIG.SWN.poolResourceNames):
- "Effort"
- "Slots" 
- "Points"
- "Strain"
- "Uses"

### Consumption Types (CONFIG.SWN.consumptionTypes):
- "none" - No consumption
- "poolResource" - Consume from a resource pool
- "systemStrain" - Add system strain
- "consumableItem" - Consume from an item's uses
- "uses" - Consume internal power uses

### Cadences (CONFIG.SWN.poolCadences / CONFIG.SWN.consumptionCadences):
- "commit" - Committed until released
- "scene" - Refreshes each scene
- "day" - Refreshes each day

## Usage Patterns

### Features Granting Pools:
1. Character has feature with `poolsGranted` array
2. During `prepareData()`, character model processes all pool-granting features
3. Pools are calculated and stored in `actor.system.pools[poolKey]`

### Powers Consuming Resources:
1. Power has `consumptions` array with consumption configurations
2. When power is used, each consumption is validated and processed
3. Resources are deducted from appropriate pools or items
4. Consumption results are tracked in chat messages

### Resource Key Resolution:
- Powers use `power.system.resourceKey()` method to get primary resource key
- Pool lookups use format `actor.system.pools[poolKey]`
- Pool updates use targeted update paths like `system.pools.${poolKey}.value`