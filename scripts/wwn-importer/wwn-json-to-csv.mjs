import { promises as fs } from "fs";
import path from "path";

/**
 * Converts WWN JSON data to SWNR-compatible CSV format
 * Usage: node scripts/wwn-importer/wwn-json-to-csv.mjs
 */

const INPUT_DIR = "./data";
const OUTPUT_DIR = "./output";

// CSV headers for different types
const CSV_HEADERS = {
    weapon: "name,type,description,cost,damage,range_normal,range_max,shock_damage,shock_ac,mag,ammo_type,burst,two_handed,stat,skill,attack_bonus,encumbrance,quality,tl,img",
    armor: "name,type,description,cost,ac,melee_ac,trauma_penalty,soak_value,soak_max,subtle,shield,encumbrance,quality,tl,img",
    item: "name,type,description,cost,quantity,encumbrance,location,quality,tl,img",
    spell: "name,type,description,level,subtype,source,consumptions,duration,range,save,img",
    power: "name,type,description,level,subtype,source,consumptions,duration,range,save,img",
    feature: "name,type,description,level,feature_type,pools_granted,img",
    focus: "name,type,description,level,feature_type,pools_granted,img",
    art: "name,type,description,level,subtype,source,consumptions,duration,range,save,img",
    asset: "name,type,description,category,asset_type,health,health_max,rating,maintenance,income,base_of_influence,img",
    skill: "name,type,description,img",
    npc: "name,type,biography,species,hd,hp,hp_max,ac,saves_evasion,saves_mental,saves_physical,saves_luck,morale,ab,movement,items,img",
    monster: "name,type,biography,species,hd,hp,hp_max,ac,saves_evasion,saves_mental,saves_physical,saves_luck,morale,ab,movement,items,img",
    journal: "name,type,description,content,img",
    rolltable: "name,type,description,formula,results,img"
};

function sanitizeText(text) {
    if (!text) return "";
    
    // Remove HTML tags and convert entities
    return text
        .replace(/<[^>]*>/g, "")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeCsvValue(value) {
    if (value === null || value === undefined) return "";
    
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function mapWwnWeaponToSwnr(wwnWeapon) {
    const system = wwnWeapon.system;
    
    // Map WWN tags to SWNR properties
    let burst = false;
    let twoHanded = false;
    let ammoType = "ammo";
    
    if (system.tags) {
        const tagValues = system.tags.map(t => t.value?.toLowerCase() || t.title?.toLowerCase());
        burst = tagValues.includes("a") || tagValues.includes("auto");
        twoHanded = tagValues.includes("2h") || tagValues.includes("two-handed");
        
        // Check for energy weapons
        if (tagValues.includes("e") || tagValues.includes("energy") || 
            wwnWeapon.name.toLowerCase().includes("laser") ||
            wwnWeapon.name.toLowerCase().includes("plasma")) {
            ammoType = "power_cell";
        }
    }
    
    // Map skill (WWN uses different skill names)
    let skill = system.skill || "shoot";
    if (skill === "stab" || skill === "punch") {
        // Keep as is - these are melee skills
    } else if (skill === "shoot" || skill === "projectile") {
        skill = "shoot";
    }
    
    // Map stat (WWN might use different format)
    let stat = system.score || "dex";
    if (stat === "str" || stat === "dex" || stat === "con" || stat === "int" || stat === "wis" || stat === "cha") {
        // Keep as is
    } else {
        stat = "dex"; // Default for most weapons
    }
    
    return {
        name: wwnWeapon.name,
        type: "weapon",
        description: sanitizeText(system.description),
        cost: system.price || 0,
        damage: system.damage || "1d6",
        range_normal: system.range?.short || system.range?.medium || 0,
        range_max: system.range?.long || 0,
        shock_damage: system.shock?.damage || 0,
        shock_ac: system.shock?.ac || 15,
        mag: system.ammo || 0,
        ammo_type: ammoType,
        burst: burst,
        two_handed: twoHanded,
        stat: stat,
        skill: skill,
        attack_bonus: parseInt(system.bonus) || 0,
        encumbrance: system.weight || 1,
        quality: "stock", // WWN doesn't have quality levels like SWNR
        tl: 3, // Most WWN gear is TL3 equivalent
        img: wwnWeapon.img || ""
    };
}

function mapWwnArmorToSwnr(wwnArmor) {
    const system = wwnArmor.system;
    
    // WWN uses aac.value + aac.mod for total AC, not the separate ac field
    const totalAc = (system.aac?.value || 10) + (system.aac?.mod || 0);
    
    return {
        name: wwnArmor.name,
        type: "armor",
        description: sanitizeText(system.description),
        cost: system.price || 0,
        ac: totalAc,
        melee_ac: system.meleeAc || null,
        trauma_penalty: 0, // WWN doesn't have trauma penalties
        soak_value: system.soak?.value || 0,
        soak_max: system.soak?.max || 0,
        subtle: false, // WWN doesn't distinguish subtle armor
        shield: system.type === "shield" || wwnArmor.name.toLowerCase().includes("shield"),
        encumbrance: system.weight || 1,
        quality: "stock",
        tl: 3,
        img: wwnArmor.img || ""
    };
}

function mapWwnItemToSwnr(wwnItem) {
    const system = wwnItem.system;
    
    return {
        name: wwnItem.name,
        type: "item",
        description: sanitizeText(system.description),
        cost: system.price || 0,
        quantity: system.quantity || 1,
        encumbrance: system.weight || 1,
        location: "stowed",
        quality: "stock",
        tl: 3,
        img: wwnItem.img || ""
    };
}

function mapWwnSpellToSwnr(wwnSpell) {
    const system = wwnSpell.system;
    
    // WWN spells use a two-slot system: Prepared slots (day/preparation) and Cast slots (day/manual)
    const consumptions = "poolResource;Slots:Prepared;1;day;preparation|poolResource;Slots:Cast;1;day;manual";
    
    return {
        name: wwnSpell.name,
        type: "power",
        description: sanitizeText(system.description),
        level: system.lvl || 1,
        subtype: "arcane", // WWN spells are arcane magic
        source: system.class || "mage",
        prepared: false, // Handle via consumption system instead
        consumptions: consumptions,
        duration: system.duration || "Instant",
        range: system.range || "Self",
        save: system.save || "None",
        img: wwnSpell.img || ""
    };
}

function mapWwnActorToSwnr(wwnActor) {
    const system = wwnActor.system;
    
    // Extract saves values (WWN has evasion, mental, physical, luck)
    const saves = system.saves ? {
        evasion: system.saves.evasion?.value || 15,
        mental: system.saves.mental?.value || 15,
        physical: system.saves.physical?.value || 15,
        luck: system.saves.luck?.value || 15
    } : { evasion: 15, mental: 15, physical: 15, luck: 15 };
    
    // Serialize items array for CSV storage
    const items = wwnActor.items ? JSON.stringify(wwnActor.items) : '[]';
    
    return {
        name: wwnActor.name,
        type: wwnActor.type === "monster" ? "npc" : wwnActor.type,
        biography: sanitizeText(system.details?.biography || system.description || ''),
        species: system.details?.species || wwnActor.type || "monster",
        hd: system.hp?.hd || `${system.hp?.max || 1}d8`,
        hp: system.hp?.value || system.hp?.max || 1,
        hp_max: system.hp?.max || 1,
        ac: system.aac?.value || system.ac?.value || 10,
        saves_evasion: saves.evasion,
        saves_mental: saves.mental,
        saves_physical: saves.physical,
        saves_luck: saves.luck,
        morale: system.details?.morale || 8,
        ab: system.thac0?.bba || system.attackBonus || 0,
        movement: system.movement?.base || system.movement || 30,
        items: items,
        img: wwnActor.img || ""
    };
}

function mapWwnFocusToSwnr(wwnFocus) {
    const system = wwnFocus.system;
    
    return {
        name: wwnFocus.name,
        type: "feature",
        description: sanitizeText(system.description),
        level: system.level || 1,
        feature_type: "focus",
        pools_granted: "", // WWN foci don't directly grant pools like SWNR
        img: wwnFocus.img || ""
    };
}

function mapWwnArtToSwnr(wwnArt) {
    const system = wwnArt.system;
    
    // Arts are levelless powers that consume Effort based on their source and time
    const source = system.source || "Unknown";
    const time = system.time || "scene";
    const cadence = time.toLowerCase();
    
    // Build consumption string: poolResource;Effort:(source);1;(cadence);manual
    const consumptions = `poolResource;Effort:${source};1;${cadence};manual`;
    
    return {
        name: wwnArt.name,
        type: "power", 
        description: sanitizeText(system.description),
        level: 0, // Arts are levelless
        subtype: "arcane", // Keep this for now, can evaluate if needed
        source: source,
        prepared: false, // Arts are never prepared
        consumptions: consumptions,
        duration: system.duration || "Instant",
        range: system.range || "Self",
        save: system.save || "None", 
        img: wwnArt.img || ""
    };
}

function mapWwnAssetToSwnr(wwnAsset) {
    const system = wwnAsset.system;
    
    return {
        name: wwnAsset.name,
        type: "asset",
        description: sanitizeText(system.description),
        category: system.type || "cunning",
        asset_type: system.subtype || "Facility",
        health: system.health?.value || 1,
        health_max: system.health?.max || 1,
        rating: system.rating || 1,
        maintenance: system.maintenance || 0,
        income: system.income || 0,
        base_of_influence: false,
        img: wwnAsset.img || ""
    };
}

function mapWwnSkillToSwnr(wwnSkill) {
    return {
        name: wwnSkill.name,
        type: "item", // Skills become generic items in SWNR
        description: sanitizeText(wwnSkill.system?.description || ""),
        img: wwnSkill.img || ""
    };
}

function mapWwnJournalToSwnr(wwnJournal) {
    // Extract content from pages
    let content = "";
    if (wwnJournal.pages && wwnJournal.pages.length > 0) {
        content = wwnJournal.pages.map(page => {
            let pageContent = page.name || "";
            if (page.text && page.text.content) {
                pageContent += (pageContent ? "\n\n" : "") + sanitizeText(page.text.content);
            }
            return pageContent;
        }).join("\n\n---\n\n");
    }
    
    return {
        name: wwnJournal.name,
        type: "journal",
        description: sanitizeText(wwnJournal.system?.description || ""),
        content: content,
        img: wwnJournal.img || ""
    };
}

function mapWwnRollTableToSwnr(wwnRollTable) {
    // Extract formula from results
    let formula = "1d100"; // Default
    let results = "";
    
    if (wwnRollTable.results && wwnRollTable.results.length > 0) {
        // Build results string with ranges and descriptions
        const resultEntries = wwnRollTable.results.map(result => {
            const range = result.range ? `${result.range[0]}-${result.range[1]}` : "1";
            const description = sanitizeText(result.description || result.name || "");
            const text = result.text ? sanitizeText(result.text) : "";
            const resultText = description || text || "Empty result";
            return `${range}: ${resultText}`;
        });
        
        results = resultEntries.join(" | ");
        
        // Try to determine formula from range
        const maxRange = Math.max(...wwnRollTable.results.map(r => 
            r.range ? Math.max(r.range[0], r.range[1]) : 1
        ));
        
        if (maxRange <= 6) formula = "1d6";
        else if (maxRange <= 8) formula = "1d8";
        else if (maxRange <= 10) formula = "1d10";
        else if (maxRange <= 12) formula = "1d12";
        else if (maxRange <= 20) formula = "1d20";
        else formula = "1d100";
    }
    
    return {
        name: wwnRollTable.name,
        type: "rolltable",
        description: sanitizeText(wwnRollTable.description || ""),
        formula: formula,
        results: results,
        img: wwnRollTable.img || ""
    };
}

function convertItemsToCsv(items, type) {
    if (!items || items.length === 0) return null;
    
    const header = CSV_HEADERS[type];
    if (!header) {
        console.warn(`No CSV header defined for type: ${type}`);
        return null;
    }
    
    const csvRows = [header];
    
    for (const item of items) {
        let mappedItem;
        
        switch (type) {
            case "weapon":
                mappedItem = mapWwnWeaponToSwnr(item);
                break;
            case "armor":
                mappedItem = mapWwnArmorToSwnr(item);
                break;
            case "item":
                mappedItem = mapWwnItemToSwnr(item);
                break;
            case "spell":
            case "power":
                mappedItem = mapWwnSpellToSwnr(item);
                break;
            case "focus":
                mappedItem = mapWwnFocusToSwnr(item);
                break;
            case "art":
                mappedItem = mapWwnArtToSwnr(item);
                break;
            case "asset":
                mappedItem = mapWwnAssetToSwnr(item);
                break;
            case "skill":
                mappedItem = mapWwnSkillToSwnr(item);
                break;
            case "journal":
                mappedItem = mapWwnJournalToSwnr(item);
                break;
            case "rolltable":
                mappedItem = mapWwnRollTableToSwnr(item);
                break;
            case "npc":
            case "monster":
                mappedItem = mapWwnActorToSwnr(item);
                break;
            default:
                console.warn(`Unknown type: ${type}`);
                continue;
        }
        
        // Convert mapped item to CSV row
        const headerFields = header.split(',');
        const rowValues = headerFields.map(field => 
            escapeCsvValue(mappedItem[field] || "")
        );
        
        csvRows.push(rowValues.join(','));
    }
    
    return csvRows.join('\n');
}

async function processJsonFile(filePath) {
    try {
        const jsonData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        const fileName = path.basename(filePath, '.json');
        
        console.log(`Processing ${fileName}...`);
        console.log(`Found ${jsonData.items?.length || 0} items`);
        
        if (!jsonData.items || jsonData.items.length === 0) {
            console.log(`No items found in ${fileName}`);
            return;
        }
        
        // Group items by type, handle special naming for non-item types
        const itemsByType = {};
        for (const item of jsonData.items) {
            let type = item.type;
            
            // Handle journal entries and roll tables from their JSON file types
            if (jsonData.type === "JournalEntry") {
                type = "journal";
            } else if (jsonData.type === "RollTable") {
                type = "rolltable";
            }
            
            if (!itemsByType[type]) {
                itemsByType[type] = [];
            }
            itemsByType[type].push(item);
        }
        
        // Convert each type group to CSV
        for (const [type, items] of Object.entries(itemsByType)) {
            console.log(`Converting ${items.length} ${type} items...`);
            
            const csvContent = convertItemsToCsv(items, type);
            if (csvContent) {
                const outputFileName = `${fileName}-${type}.csv`;
                const outputPath = path.join(OUTPUT_DIR, outputFileName);
                
                await fs.writeFile(outputPath, csvContent);
                console.log(`✓ Created ${outputFileName}`);
            }
        }
        
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

async function convertAllJsonFiles() {
    try {
        // Ensure output directory exists
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        
        // Find all JSON files in input directory
        const files = await fs.readdir(INPUT_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            console.log(`No JSON files found in ${INPUT_DIR}`);
            return;
        }
        
        console.log(`Found ${jsonFiles.length} JSON file(s) to convert...\n`);
        
        for (const jsonFile of jsonFiles) {
            const filePath = path.join(INPUT_DIR, jsonFile);
            await processJsonFile(filePath);
            console.log(''); // Empty line between files
        }
        
        console.log('🎉 Conversion complete!');
        console.log(`📁 Output directory: ${OUTPUT_DIR}`);
        console.log('📝 Review the CSV files and copy them to scripts/csv-import/data/ for further processing');
        
    } catch (error) {
        console.error('❌ Error during conversion:', error);
        process.exit(1);
    }
}

// Main execution
console.log('WWN JSON to SWNR CSV Converter');
console.log(`Input directory: ${INPUT_DIR}`);
console.log(`Output directory: ${OUTPUT_DIR}\n`);

convertAllJsonFiles();