import { promises as fs } from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "yaml";
import path from "path";
import { mapping } from "../conversion/mapping.mjs";

const SYSTEM_VERSION = "2.0.0";
const CORE_VERSION = "13.346";

/**
 * Converts CSV data to Foundry-compatible YAML files using proper field mappings
 * Usage: node scripts/csv-import/csv-to-yaml.mjs input.csv output-directory
 */

function generateRandomID(length = 16) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateFoundryMetadata(type, id) {
    const now = Date.now();
    
    const base = {
        _id: id,
        _stats: {
            compendiumSource: null,
            duplicateSource: null,
            coreVersion: CORE_VERSION,
            systemId: "swnr",
            systemVersion: SYSTEM_VERSION,
            createdTime: now,
            modifiedTime: now,
            lastModifiedBy: null,
            exportSource: null
        },
        folder: null,
        flags: {},
        sort: 0
    };

    // Actor types get different structure
    const actorTypes = ['npc', 'cyberdeck', 'drone', 'faction', 'mech', 'ship', 'vehicle'];
    if (actorTypes.includes(type)) {
        return {
            ...base,
            _key: `!actors!${id}`,
            effects: [],
            prototypeToken: generatePrototypeToken(),
        };
    }
    
    // Item types
    return {
        ...base,
        _key: `!items!${id}`,
        effects: [],
        img: "icons/svg/item-bag.svg",
        ownership: { default: 0 }
    };
}

function generatePrototypeToken() {
    return {
        name: "",
        displayName: 0,
        actorLink: false,
        appendNumber: false,
        prependAdjective: false,
        width: 1,
        height: 1,
        texture: {
            src: "",
            anchorX: 0.5,
            anchorY: 0.5,
            offsetX: 0,
            offsetY: 0,
            fit: "contain",
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            tint: "#ffffff",
            alphaThreshold: 0.75
        },
        hexagonalShape: 0,
        lockRotation: false,
        rotation: 0,
        alpha: 1,
        disposition: -1,
        displayBars: 0,
        bar1: { attribute: "health" },
        bar2: { attribute: "power" },
        light: {
            negative: false,
            priority: 0,
            alpha: 0.5,
            angle: 360,
            bright: 0,
            color: null,
            coloration: 1,
            dim: 0,
            attenuation: 0.5,
            luminosity: 0.5,
            saturation: 0,
            contrast: 0,
            shadows: 0,
            animation: {
                type: null,
                speed: 5,
                intensity: 5,
                reverse: false
            },
            darkness: { min: 0, max: 1 }
        },
        sight: {
            enabled: false,
            range: 0,
            angle: 360,
            visionMode: "basic",
            color: null,
            attenuation: 0.1,
            brightness: 0,
            saturation: 0,
            contrast: 0
        },
        detectionModes: [],
        occludable: { radius: 0 },
        ring: {
            enabled: false,
            colors: { ring: null, background: null },
            effects: 1,
            subject: { scale: 1, texture: null }
        },
        flags: {},
        randomImg: false
    };
}

function mapCsvFieldsToSystem(row, type) {
    // Get the default template for this type
    const template = mapping[type];
    if (!template) {
        console.warn(`No mapping template found for type: ${type}`);
        return { description: row.description || "" };
    }

    // Deep clone the template to avoid mutations
    const systemData = JSON.parse(JSON.stringify(template));
    
    // Map CSV fields to system data
    Object.keys(row).forEach(csvField => {
        const value = row[csvField];
        if (!value || value === '') return;

        mapFieldValue(systemData, csvField, value, type);
    });

    return systemData;
}

function mapFieldValue(systemData, csvField, value, type) {
    // Common field mappings
    const fieldMappings = {
        // Basic fields
        description: 'description',
        cost: 'cost',
        tl: 'tl',
        
        // Item fields
        quantity: 'quantity',
        encumbrance: 'encumbrance',
        location: 'location',
        quality: 'quality',
        
        // Weapon fields
        damage: 'damage',
        range_normal: 'range.normal',
        range_max: 'range.max',
        shock_damage: 'shock.dmg',
        shock_ac: 'shock.ac',
        mag: 'ammo.max',
        ammo_type: 'ammo.type',
        burst: 'ammo.burst',
        two_handed: 'isTwoHanded',
        stat: 'stat',
        skill: 'skill',
        
        // Armor fields  
        ac: 'ac',
        melee_ac: 'meleeAc',
        trauma_penalty: 'traumaDiePenalty',
        soak_value: 'soak.value',
        soak_max: 'soak.max',
        subtle: 'isSubtle',
        shield: 'shield',
        
        // Cyberware fields
        strain: 'strain',
        effect: 'effect',
        concealment: 'concealment',
        complication: 'complication',
        
        // Power fields
        level: 'level',
        subtype: 'subType',
        source: 'source',
        prepared: 'prepared',
        resource_name: 'resourceName',
        sub_resource: 'subResource',
        duration: 'duration',
        range: 'range',
        save: 'save',
        
        // Feature fields
        feature_type: 'type',
        
        // Asset fields
        category: 'category',
        asset_type: 'type',
        health: 'health.value',
        health_max: 'health.max',
        rating: 'rating',
        maintenance: 'maintenance',
        income: 'income',
        base_of_influence: 'baseOfInfluence',
        
        // NPC fields
        species: 'species',
        hd: 'hitDice',
        hp: 'health.value',
        hp_max: 'health.max',
        saves: 'saves',
        morale: 'moralScore',
        ab: 'ab',
        movement: 'speed',
        
        // Ship fields
        mass: 'mass.value',
        power: 'power.value',
        hardpoints: 'hardpoints.value',
        crew_min: 'crew.min',
        crew_max: 'crew.max',
        armor_value: 'armor.value',
        spike_drive: 'spikeDrive.value'
    };

    const systemPath = fieldMappings[csvField];
    if (systemPath) {
        setNestedValue(systemData, systemPath, parseValue(value, csvField));
    }
    
    // Handle array fields for features and powers
    if (csvField === 'pools_granted' && (type === 'feature' || type === 'focus' || type === 'edge')) {
        systemData.poolsGranted = parsePoolsGranted(value);
    }
    
    if (csvField === 'consumptions' && type === 'power') {
        systemData.consumptions = parseConsumptions(value);
    }
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
}

function parseValue(value, field) {
    // Parse boolean fields
    if (['burst', 'two_handed', 'subtle', 'shield', 'prepared', 'base_of_influence'].includes(field)) {
        return value === 'true' || value === '1' || value === 'yes';
    }
    
    // Parse numeric fields
    if (['cost', 'tl', 'quantity', 'encumbrance', 'ac', 'melee_ac', 'trauma_penalty', 
         'shock_damage', 'shock_ac', 'mag', 'strain', 'level', 'rating', 'maintenance',
         'income', 'saves', 'morale', 'ab', 'movement', 'hp', 'hp_max', 'health',
         'health_max', 'mass', 'power', 'hardpoints', 'crew_min', 'crew_max',
         'armor_value', 'spike_drive', 'range_normal', 'range_max', 'soak_value', 'soak_max'].includes(field)) {
        const num = parseInt(value);
        return isNaN(num) ? 0 : num;
    }
    
    return value;
}

function parsePoolsGranted(value) {
    if (!value || value.trim() === '') return [];
    
    try {
        // Format: "Effort:Psychic;day;1+@skills.psychic.highest|Slots:Lv1;day;@stats.int.mod"
        return value.split('|').map(poolStr => {
            const [resourceKey, cadence, formula, condition = ''] = poolStr.split(';');
            const [resourceName, subResource] = resourceKey.split(':');
            
            return {
                resourceName: resourceName.trim(),
                subResource: subResource ? subResource.trim() : null,
                cadence: cadence.trim(),
                formula: formula.trim(),
                condition: condition.trim()
            };
        });
    } catch (error) {
        console.warn(`Error parsing poolsGranted: ${value}`, error);
        return [];
    }
}

function parseConsumptions(value) {
    if (!value || value.trim() === '') return [];
    
    try {
        // Format: "poolResource;Effort:Psychic;1;scene;false|systemStrain;1"
        return value.split('|').map(consStr => {
            const parts = consStr.split(';');
            const type = parts[0].trim();
            
            if (type === 'poolResource') {
                const [, resourceKey, usesCost, cadence, spendOnPrep] = parts;
                const [resourceName, subResource] = resourceKey.split(':');
                
                return {
                    type: 'poolResource',
                    resourceName: resourceName.trim(),
                    subResource: subResource ? subResource.trim() : null,
                    usesCost: parseInt(usesCost) || 1,
                    cadence: cadence.trim(),
                    spendOnPrep: spendOnPrep === 'true'
                };
            } else if (type === 'systemStrain') {
                return {
                    type: 'systemStrain',
                    usesCost: parseInt(parts[1]) || 1
                };
            } else if (type === 'uses') {
                return {
                    type: 'uses',
                    usesCost: parseInt(parts[1]) || 1
                };
            }
            
            return { type, raw: consStr };
        });
    } catch (error) {
        console.warn(`Error parsing consumptions: ${value}`, error);
        return [];
    }
}

function csvRowToYaml(row, sortIndex) {
    const type = row.type || "item";
    const id = generateRandomID(16);
    const metadata = generateFoundryMetadata(type, id);
    
    const yamlData = {
        name: row.name,
        type: type,
        sort: sortIndex * 100000,
        system: mapCsvFieldsToSystem(row, type),
        ...metadata
    };

    // Set prototype token name for actors
    if (yamlData.prototypeToken) {
        yamlData.prototypeToken.name = row.name;
        yamlData.prototypeToken.texture.src = row.img || "";
    }

    // Set image
    if (row.img) {
        yamlData.img = row.img;
    }

    return yamlData;
}

function sanitizeFilename(name) {
    return name
        .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars except spaces, hyphens, underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_+/g, '_') // Collapse multiple underscores
        .trim();
}

async function convertCsvToYaml(csvPath, outputDir) {
    try {
        // Read and parse CSV
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        console.log(`Converting ${records.length} records from ${csvPath}...`);

        // Convert each row to YAML
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            if (!row.name) {
                console.warn(`Skipping row ${i + 1}: missing name`);
                continue;
            }

            const yamlData = csvRowToYaml(row, i);
            const yamlContent = stringify(yamlData, {
                indent: 2,
                lineWidth: 0,
                minContentWidth: 0
            });

            // Generate filename: Name_with_id.yml
            const sanitizedName = sanitizeFilename(row.name);
            const filename = `${sanitizedName}_${yamlData._id}.yml`;
            const filepath = path.join(outputDir, filename);

            await fs.writeFile(filepath, yamlContent);
            console.log(`✓ Created ${filename}`);
        }

        console.log(`\n✅ Successfully converted ${records.length} items to ${outputDir}`);
        console.log(`📝 Run 'npm run build' to pack into compendium`);

    } catch (error) {
        console.error('❌ Error converting CSV to YAML:', error);
        process.exit(1);
    }
}

// CLI usage
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('Usage: node scripts/csv-to-yaml.mjs <input.csv> <output-directory>');
    console.log('Example: node scripts/csv-to-yaml.mjs data/new-items.csv src/packs/new-items/');
    process.exit(1);
}

const [csvPath, outputDir] = args;
convertCsvToYaml(csvPath, outputDir);