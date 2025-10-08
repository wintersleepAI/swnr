import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const SYSTEM_ID = process.cwd();
const BASE_LDB_PATH = "packs";
const TEMP_PATH = "temp-pack";
const DB_DIR = "src/compendium-db";
const DB_PATH = path.join(DB_DIR, "compendiums.db");

/**
 * Open the SQLite database
 */
async function openDatabase() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    return db;
}

/**
 * Get all compendiums from the database
 */
async function getCompendiums(db) {
    const compendiums = await db.all(`
        SELECT DISTINCT compendium 
        FROM documents 
        WHERE compendium IS NOT NULL
        ORDER BY compendium
    `);
    return compendiums.map(row => row.compendium);
}

/**
 * Get all documents for a specific compendium
 */
async function getDocumentsForCompendium(db, compendium) {
    const documents = await db.all(`
        SELECT * FROM documents 
        WHERE compendium = ? AND compendium IS NOT NULL
        ORDER BY document_type, name
    `, [compendium]);
    
    return documents;
}

/**
 * Get system data for a document and unflatten it
 */
async function getSystemData(db, documentId) {
    const systemRows = await db.all(`
        SELECT key, value, value_type 
        FROM system_data 
        WHERE document_id = ?
        ORDER BY key
    `, [documentId]);
    
    return unflattenSystemData(systemRows);
}

/**
 * Unflatten system data from key-value pairs back to nested object
 */
function unflattenSystemData(systemRows) {
    const result = {};
    
    for (const row of systemRows) {
        if (row.value === null) continue;
        
        const keys = row.key.split('.');
        let current = result;
        
        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the final value with proper type conversion
        const finalKey = keys[keys.length - 1];
        current[finalKey] = parseValue(row.value, row.value_type);
    }
    
    return result;
}

/**
 * Parse a value based on its stored type
 */
function parseValue(value, valueType) {
    if (value === null) return null;
    
    switch (valueType) {
        case 'null':
            return null;
        case 'boolean':
            return value === 'true';
        case 'number':
            return Number(value);
        case 'string':
            return JSON.parse(value); // Remove quotes
        case 'object':
        case 'array':
            return JSON.parse(value);
        default:
            return value;
    }
}

/**
 * Get effects for a document
 */
async function getEffects(db, documentId) {
    const effects = await db.all(`
        SELECT data FROM effects 
        WHERE document_id = ?
    `, [documentId]);
    
    return effects.map(row => JSON.parse(row.data));
}

/**
 * Get embedded items for an actor
 */
async function getEmbeddedItems(db, actorId) {
    const items = await db.all(`
        SELECT id, name, type, img, sort, system_data, effects, flags
        FROM embedded_items 
        WHERE actor_id = ?
        ORDER BY sort, name
    `, [actorId]);
    
    return items.map(item => ({
        _id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        sort: item.sort,
        system: JSON.parse(item.system_data || '{}'),
        effects: JSON.parse(item.effects || '[]'),
        flags: JSON.parse(item.flags || '{}'),
        folder: null,
        ownership: { default: 0 },
        _key: `!actors.items!${actorId}.${item.id}`
    }));
}

/**
 * Get journal pages for a journal entry
 */
async function getJournalPages(db, journalId) {
    const pages = await db.all(`
        SELECT id, name, type, title, text_content, text_format, sort
        FROM journal_pages 
        WHERE journal_id = ?
        ORDER BY sort, name
    `, [journalId]);
    
    return pages.map(page => ({
        _id: page.id,
        name: page.name,
        type: page.type,
        title: {
            show: page.title !== null,
            content: page.title || ""
        },
        text: {
            content: page.text_content || "",
            format: page.text_format || 1
        },
        sort: page.sort,
        ownership: { default: 0 },
        flags: {},
        _key: `!journal.pages!${journalId}.${page.id}`
    }));
}

/**
 * Get table results for a roll table
 */
async function getTableResults(db, tableId) {
    const results = await db.all(`
        SELECT id, type, text, img, weight, range_start, range_end, drawn, flags
        FROM table_results 
        WHERE table_id = ?
        ORDER BY range_start, id
    `, [tableId]);
    
    return results.map(result => ({
        _id: result.id,
        type: result.type,
        text: result.text,
        img: result.img,
        weight: result.weight,
        range: [result.range_start, result.range_end],
        drawn: result.drawn,
        flags: JSON.parse(result.flags || '{}'),
        _key: `!tables.results!${tableId}.${result.id}`
    }));
}

/**
 * Reconstruct a complete document from database components
 */
async function reconstructDocument(db, docRow) {
    // Base document structure
    const doc = {
        _id: docRow.id,
        name: docRow.name,
        type: docRow.type,
        img: docRow.img,
        folder: docRow.folder,
        sort: docRow.sort,
        ownership: JSON.parse(docRow.ownership || '{}'),
        flags: JSON.parse(docRow.flags || '{}'),
        _stats: JSON.parse(docRow.stats || '{}'),
        _key: `!${docRow.document_type}!${docRow.id}`
    };
    
    // Add system data
    doc.system = await getSystemData(db, docRow.id);
    
    // Add effects
    doc.effects = await getEffects(db, docRow.id);
    
    // Add type-specific embedded collections
    switch (docRow.document_type) {
        case 'actors':
            doc.items = await getEmbeddedItems(db, docRow.id);
            // Add prototype token and other actor-specific fields if needed
            break;
            
        case 'journal':
            doc.pages = await getJournalPages(db, docRow.id);
            break;
            
        case 'tables':
            doc.results = await getTableResults(db, docRow.id);
            break;
    }
    
    return doc;
}

/**
 * Generate filename for a document (same format as unpack script)
 */
function getDocumentFilename(doc) {
    const safeFileName = (doc.name || 'unnamed').replace(/[^a-zA-Z0-9А-я]/g, '_');
    const documentType = doc._key.split('!')[1];
    const prefix = ['actors', 'items'].includes(documentType) ? doc.type : documentType;
    
    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.json`;
}

/**
 * Backup existing packs
 */
async function backupExistingPacks(compendiums) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `packs-backup-${timestamp}`;
    
    try {
        await fs.mkdir(backupDir, { recursive: true });
        
        for (const compendium of compendiums) {
            const sourcePath = path.join(BASE_LDB_PATH, compendium);
            const destPath = path.join(backupDir, compendium);
            
            try {
                await fs.cp(sourcePath, destPath, { recursive: true });
                console.log(`✓ Backed up ${compendium}`);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.warn(`⚠ Could not backup ${compendium}: ${err.message}`);
                }
            }
        }
        
        console.log(`📁 Backups created in: ${backupDir}`);
        return backupDir;
    } catch (err) {
        console.error(`❌ Failed to create backup directory: ${err.message}`);
        throw err;
    }
}

/**
 * Pack all compendiums from database back to LevelDB format
 */
async function packFromDatabase(selectedCompendiums = null) {
    console.log("Opening database...");
    const db = await openDatabase();
    
    // Clean up any existing temp directory
    await fs.rm(TEMP_PATH, { recursive: true, force: true });
    
    try {
        // Get compendiums to process
        const allCompendiums = await getCompendiums(db);
        const compendiums = selectedCompendiums || allCompendiums;
        
        console.log(`Found ${allCompendiums.length} compendiums in database`);
        if (selectedCompendiums) {
            console.log(`Processing selected: ${compendiums.join(', ')}`);
        } else {
            console.log(`Processing all compendiums...`);
        }
        
        // Create backup
        await backupExistingPacks(compendiums);
        
        for (let i = 0; i < compendiums.length; i++) {
            const compendium = compendiums[i];
            const tempCompendiumPath = path.join(TEMP_PATH, compendium);
            
            try {
                console.log(`[${i + 1}/${compendiums.length}] Processing ${compendium}...`);
                
                // Create temp directory for this compendium
                await fs.mkdir(tempCompendiumPath, { recursive: true });
                
                // Get all documents for this compendium
                const documents = await getDocumentsForCompendium(db, compendium);
                console.log(`  Found ${documents.length} documents`);
                
                // Reconstruct and write each document
                for (const docRow of documents) {
                    const doc = await reconstructDocument(db, docRow);
                    const filename = getDocumentFilename(doc);
                    const filePath = path.join(tempCompendiumPath, filename);
                    
                    await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
                }
                
                // Compile to LevelDB format
                const destPath = path.join(BASE_LDB_PATH, compendium);
                await compilePack(
                    `${SYSTEM_ID}/${tempCompendiumPath}`,
                    `${SYSTEM_ID}/${destPath}`,
                    { yaml: false, log: false }
                );
                
                console.log(`✓ Packed ${compendium}`);
                
            } finally {
                // Clean up temp files for this compendium immediately
                await fs.rm(tempCompendiumPath, { recursive: true, force: true });
            }
        }
        
        console.log("✓ Database packing complete!");
        
    } finally {
        // Final cleanup
        await fs.rm(TEMP_PATH, { recursive: true, force: true });
        await db.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // Allow specifying specific compendiums as arguments
    const selectedCompendiums = process.argv.slice(2);
    packFromDatabase(selectedCompendiums.length > 0 ? selectedCompendiums : null)
        .catch(console.error);
}

export { packFromDatabase };