# CSV to YAML Converter for SWNR Compendia

This tool converts CSV data into Foundry VTT compatible YAML files for the Stars Without Number Redux system.

## Usage

```bash
node scripts/csv-import/csv-to-yaml.mjs input.csv output-directory/
```

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

Format: `"ResourceName:SubResource;cadence;formula;condition"`

Examples:
```csv
"Effort:Psychic;day;1+@skills.psychic.highest+Math.max(@stats.wis.mod,@stats.con.mod)"
"Slots:Lv1;day;@stats.int.mod|Slots:Lv2;day;Math.max(0,@stats.int.mod-1);@lvl >= 3"
```

### Powers - consumptions

Format: `"type;details;..."`

Types:
- `poolResource;ResourceName:SubResource;cost;cadence;spendOnPrep`
- `systemStrain;cost`
- `uses;cost`

Examples:
```csv
"poolResource;Effort:Telekinetic;1;scene;false"
"poolResource;Effort:Biopsychic;1;scene;false|systemStrain;1"
```

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

1. **Choose Template**: Copy appropriate template from `templates/`
2. **Fill Data**: Add your items using normal CSV editing
3. **Convert**: Run the converter script
4. **Pack**: Use `npm run build` to compile into compendium

## Field Mappings

The converter uses your existing `mapping.mjs` for accurate field translation:

- CSV `damage` → YAML `system.damage`
- CSV `shock_damage` → YAML `system.shock.dmg`
- CSV `ac` → YAML `system.ac`
- CSV `strain` → YAML `system.strain`
- etc.

## Notes

- All Foundry metadata is auto-generated (no manual `_id` needed)
- Uses semicolons (`;`) for array field separators to avoid CSV comma conflicts
- Pipe (`|`) separates multiple array items
- Boolean fields accept: `true/false`, `1/0`, `yes/no`
- Numeric fields are automatically parsed