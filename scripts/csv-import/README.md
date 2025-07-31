# CSV to YAML Converter for SWNR Compendia

This tool converts CSV data into Foundry VTT compatible YAML files for the Stars Without Number Redux system.

## Usage

```bash
node scripts/csv-import/csv-to-yaml.mjs
```

**Input Directory**: `scripts/csv-import/data/` (processes all `.csv` files)  
**Output Directory**: `scripts/csv-import/output/<csv-name>/` (creates subdirectories)

## Features

- **Auto-generates** all Foundry metadata (`_id`, `_stats`, `_key`, timestamps)
- **Complete field mapping** using existing system schema
- **Array field support** for `poolsGranted` and `consumptions`
- **Multi-type support** for all document types

## Supported Document Types

- `item` - General equipment, tools, trade goods
- `weapon` - Ranged and melee weapons with full stats
- `armor` - Protection with AC, soak, trauma penalties
- `cyberware` - Implants with strain and effects
- `power` - Psychic powers with resource consumption
- `feature` - Foci, edges with resource pool grants
- `npc` - NPCs with full combat stats
- `asset` - Faction assets with maintenance costs
- `ship`, `drone`, `vehicle` - Vehicles with mass/power
- `program` - Hacking programs
- `shipWeapon`, `shipFitting`, `shipDefense` - Ship components

## Array Field Formats

### Features - poolsGranted

**Format:** `"ResourceName:SubResource;cadence;formula;condition"`

**Field Descriptions:**
- **ResourceName:SubResource** - Pool identifier (e.g., `Effort:Psychic`, `Slots:Lv1`, `Points:Gunnery`)
- **cadence** - When pool refreshes: `scene`, `day`, `hour`, `week`, `month`
- **formula** - JavaScript expression for pool maximum value
- **condition** - Optional condition when pool is granted (leave empty if always granted)

**Formula Examples:**
```csv
# Basic stat modifier
"Effort:Psychic;day;@stats.wis.mod"

# Skill-based with minimum
"Effort:Psychic;day;Math.max(1, @skills.psychic.highest)"

# Complex formula with multiple sources
"Effort:Psychic;day;1+@skills.psychic.highest+Math.max(@stats.wis.mod,@stats.con.mod)"

# Level-dependent with condition
"Slots:Lv2;day;Math.max(0,@stats.int.mod-1);@lvl >= 3"

# Multiple pools granted by one feature
"Slots:Lv1;day;@stats.int.mod|Slots:Lv2;day;Math.max(0,@stats.int.mod-1);@lvl >= 3"
```

**Available Formula Variables:**
- `@stats.str.mod`, `@stats.dex.mod`, `@stats.con.mod`, `@stats.int.mod`, `@stats.wis.mod`, `@stats.cha.mod`
- `@stats.str.score`, `@stats.dex.score`, etc. (raw ability scores)
- `@skills.skillname.rank` - Skill rank (-1 for untrained, 0-4 for trained)
- `@skills.skillname.highest` - Highest skill rank in discipline
- `@lvl` - Character level
- `Math.max()`, `Math.min()`, `Math.floor()`, `Math.ceil()` - JavaScript math functions

### Powers - consumptions

**Format:** `"type;parameter1;parameter2;..."`

#### poolResource Type
**Format:** `"poolResource;ResourceName:SubResource;cost;cadence;spendOnPrep"`

**Field Descriptions:**
- **ResourceName:SubResource** - Pool to consume from (must match a granted pool)
- **cost** - Number of points to consume (integer)
- **cadence** - Consumption duration: `scene`, `day`, `hour`, `activation`, `permanent`
- **spendOnPrep** - When to spend: `true` (when prepared), `false` (when activated)

#### systemStrain Type
**Format:** `"systemStrain;cost"`

**Field Descriptions:**
- **cost** - System strain points to add (integer, typically 1-3)

#### uses Type
**Format:** `"uses;cost"`

**Field Descriptions:**
- **cost** - Internal power uses to consume (integer)

**Consumption Examples:**
```csv
# Basic effort consumption
"poolResource;Effort:Psychic;1;scene;false"

# Spell slot consumption when prepared
"poolResource;Slots:Lv1;1;day;true"

# Multiple consumption types
"poolResource;Effort:Biopsychic;1;scene;false|systemStrain;1"

# High-cost power
"poolResource;Effort:Telekinetic;2;day;false|systemStrain;2"

# Power with internal uses
"uses;1"
```

**Common Resource Pool Names:**
- **Effort** - Psychic effort pools (`Effort:Psychic`, `Effort:Telekinetic`, `Effort:Biopsychic`, etc.)
- **Slots** - Spell slots (`Slots:Lv1`, `Slots:Lv2`, `Slots:Lv3`, etc.)
- **Points** - Skill points (`Points:Gunnery`, `Points:Navigation`, etc.)
- **Charges** - Equipment charges (`Charges:Device`, `Charges:Weapon`, etc.)

## Templates

Located in `scripts/csv-import/templates/`:

- `item-template.csv` - Basic items and equipment
- `weapon-template.csv` - Weapons with damage, range, etc.
- `armor-template.csv` - Armor with AC and protection
- `cyberware-template.csv` - Implants with strain
- `power-template.csv` - Basic psychic powers
- `power-advanced-template.csv` - Powers with consumptions
- `feature-template.csv` - Features with poolsGranted
- `npc-template.csv` - NPCs with combat stats

## Workflow

1. **Choose Template**: Copy appropriate template from `templates/` to `data/`
2. **Fill Data**: Edit your CSV files in `scripts/csv-import/data/`
3. **Convert**: `node scripts/csv-import/csv-to-yaml.mjs` (processes all CSV files)
4. **Copy Output**: Move YAML files from `output/<csv-name>/` to appropriate `src/packs/` directory
5. **Pack**: Use `npm run build` to compile into compendium

## Field Reference

### Common Fields (All Types)
- **name** - Item/document name (required)
- **type** - Document type: `item`, `weapon`, `armor`, `cyberware`, `power`, `feature`, `npc`, etc. (required)
- **description** - Full text description
- **cost** - Cost in credits (integer)
- **tl** - Tech Level 0-5 (integer)
- **img** - Image path (optional, defaults to system icon)

### Item Fields
- **quantity** - Number of items (integer, default: 1)
- **encumbrance** - Encumbrance rating (integer)
- **location** - Storage location: `readied`, `stowed`, `other`
- **quality** - Item quality: `stock`, `pretech`, `postech`

### Weapon Fields
- **damage** - Damage roll (e.g., `1d6`, `1d8+2`)
- **range_normal** - Normal range in meters (integer)
- **range_max** - Maximum range in meters (integer)
- **shock_damage** - Shock damage amount (integer)
- **shock_ac** - Shock AC threshold (integer)
- **mag** - Magazine/ammo capacity (integer)
- **ammo_type** - Ammunition type: `ammo`, `power_cell`, `none`
- **burst** - Burst fire capable: `true`/`false`
- **two_handed** - Two-handed weapon: `true`/`false`
- **stat** - Primary attribute: `str`, `dex`, `con`, `int`, `wis`, `cha`
- **skill** - Required skill name (e.g., `shoot`, `stab`, `punch`)

### Armor Fields
- **ac** - Armor Class rating (integer)
- **melee_ac** - Separate melee AC (integer, optional)
- **trauma_penalty** - Trauma die penalty (integer, 0-3)
- **soak_value** - Soak damage amount (integer)
- **soak_max** - Maximum soak capacity (integer)
- **subtle** - Subtle armor: `true`/`false`
- **shield** - Is a shield: `true`/`false`

### Cyberware Fields
- **strain** - System strain cost (integer, 1-6)
- **effect** - Mechanical effect description
- **concealment** - Detection difficulty: `none`, `sight`, `medical`, `impossible`
- **complication** - Side effects or complications

### Power Fields
- **level** - Power level (integer, 0-9)
- **subtype** - Power category: `psychic`, `arcane`, `divine`
- **source** - Discipline source (e.g., `biopsionics`, `precognition`)
- **prepared** - Requires preparation: `true`/`false`
- **consumptions** - Resource consumption array (see Array Fields section)
- **duration** - Effect duration (e.g., `Instant`, `Scene`, `Day`)
- **range** - Power range (e.g., `Self`, `Touch`, `Close`, `Distant`)
- **save** - Saving throw type (e.g., `Mental`, `Physical`, `None`)

### Feature Fields
- **level** - Feature level (integer, 1-2 for foci)
- **feature_type** - Feature category: `focus`, `edge`, `class`
- **pools_granted** - Resource pools granted array (see Array Fields section)

### NPC Fields
- **species** - Creature species/type
- **hd** - Hit dice expression (e.g., `2d8`, `5d6+10`)
- **hp** - Hit points (integer)
- **hp_max** - Maximum hit points (integer)
- **ac** - Armor Class (integer)
- **saves** - Save target number (integer, typically 15 - level)
- **morale** - Morale rating (integer, 2-12)
- **ab** - Attack bonus (integer)
- **movement** - Movement speed in meters (integer)

### Asset Fields
- **category** - Asset type: `cunning`, `force`, `wealth`
- **asset_type** - Specific asset category
- **health** - Asset health points (integer)
- **health_max** - Maximum health (integer)
- **rating** - Asset rating (integer, 1-8)
- **maintenance** - Maintenance cost per turn (integer)
- **income** - Income generated per turn (integer)
- **base_of_influence** - Is base of influence: `true`/`false`

### Ship/Vehicle Fields
- **mass** - Mass units consumed (integer)
- **power** - Power units consumed (integer)
- **hardpoints** - Hardpoints required (integer)
- **crew_min** - Minimum crew required (integer)
- **crew_max** - Maximum crew capacity (integer)
- **armor_value** - Armor rating (integer)
- **spike_drive** - Spike drive rating (integer, 0-6)

## Example

```bash
# Copy templates and edit with your data
cp scripts/csv-import/templates/weapon-template.csv scripts/csv-import/data/new-weapons.csv
cp scripts/csv-import/templates/armor-template.csv scripts/csv-import/data/new-armor.csv

# Convert all CSV files to YAML (processes entire data/ folder)
node scripts/csv-import/csv-to-yaml.mjs

# Output structure:
# scripts/csv-import/output/new-weapons/*.yml
# scripts/csv-import/output/new-armor/*.yml

# Move to appropriate packs
cp scripts/csv-import/output/new-weapons/*.yml src/packs/weapons/
cp scripts/csv-import/output/new-armor/*.yml src/packs/armor/

# Pack into compendium
npm run build
```

## Notes

- All Foundry metadata is auto-generated (no manual `_id` needed)
- Uses semicolons (`;`) for array field separators to avoid CSV comma conflicts
- Pipe (`|`) separates multiple array items
- Boolean fields accept: `true/false`, `1/0`, `yes/no`
- Numeric fields are automatically parsed
- Each CSV file creates its own output subdirectory