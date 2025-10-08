import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const SYSTEM_ID = process.cwd();
const BASE_LDB_PATH = "packs";
const TEMP_PATH = "temp-unpack";
const DB_DIR = "src/compendium-db";
const DB_PATH = path.join(DB_DIR, "compendiums.db");

/**
 * Initialize SQLite database with schema for Foundry documents
 */
async function initializeDatabase() {
    // Create the database directory if it doesn't exist
    await fs.mkdir(DB_DIR, { recursive: true });
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // Core documents table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            document_type TEXT, -- Actor, Item, JournalEntry, etc.
            compendium TEXT,
            img TEXT,
            folder TEXT,
            sort INTEGER,
            ownership TEXT, -- JSON
            flags TEXT, -- JSON
            stats TEXT, -- JSON
            created_time INTEGER,
            modified_time INTEGER,
            last_modified_by TEXT
        )
    `);

    // System-specific data (flexible JSON storage)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS system_data (
            document_id TEXT,
            key TEXT,
            value TEXT, -- JSON value
            value_type TEXT, -- string, number, boolean, object, array
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    `);

    // Effects table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS effects (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            name TEXT,
            data TEXT, -- JSON
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    `);

    // Embedded items (for actors)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS embedded_items (
            id TEXT PRIMARY KEY,
            actor_id TEXT,
            name TEXT,
            type TEXT,
            img TEXT,
            sort INTEGER,
            system_data TEXT, -- JSON
            effects TEXT, -- JSON
            flags TEXT, -- JSON
            FOREIGN KEY (actor_id) REFERENCES documents(id)
        )
    `);

    // Journal pages (for journal entries)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS journal_pages (
            id TEXT PRIMARY KEY,
            journal_id TEXT,
            name TEXT,
            type TEXT,
            title TEXT,
            text_content TEXT,
            text_format INTEGER,
            sort INTEGER,
            FOREIGN KEY (journal_id) REFERENCES documents(id)
        )
    `);

    // Roll table results
    await db.exec(`
        CREATE TABLE IF NOT EXISTS table_results (
            id TEXT PRIMARY KEY,
            table_id TEXT,
            type INTEGER,
            text TEXT,
            img TEXT,
            weight INTEGER,
            range_start INTEGER,
            range_end INTEGER,
            drawn BOOLEAN,
            flags TEXT, -- JSON
            FOREIGN KEY (table_id) REFERENCES documents(id)
        )
    `);

    return db;
}

/**
 * Flatten system data for storage
 */
function flattenSystemData(obj, prefix = '') {
    const flattened = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
            flattened.push({
                key: fullKey,
                value: null,
                value_type: 'null'
            });
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            // Recurse for nested objects
            flattened.push(...flattenSystemData(value, fullKey));
        } else {
            flattened.push({
                key: fullKey,
                value: JSON.stringify(value),
                value_type: Array.isArray(value) ? 'array' : typeof value
            });
        }
    }
    
    return flattened;
}

/**
 * Store a document in the database
 */
async function storeDocument(db, doc, compendium) {
    await db.run('BEGIN TRANSACTION');
    const documentType = doc._key.split('!')[1];
    
    // Insert main document
    await db.run(`
        INSERT OR REPLACE INTO documents (
            id, name, type, document_type, compendium, img, folder, sort,
            ownership, flags, stats, created_time, modified_time, last_modified_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        doc._id,
        doc.name || null,
        doc.type || null,
        documentType,
        compendium,
        doc.img || null,
        doc.folder || null,
        doc.sort || 0,
        JSON.stringify(doc.ownership || {}),
        JSON.stringify(doc.flags || {}),
        JSON.stringify(doc._stats || {}),
        doc._stats?.createdTime || null,
        doc._stats?.modifiedTime || null,
        doc._stats?.lastModifiedBy || null
    ]);

    // Store system data
    if (doc.system) {
        const systemEntries = flattenSystemData(doc.system);
        for (const entry of systemEntries) {
            await db.run(`
                INSERT OR REPLACE INTO system_data (document_id, key, value, value_type)
                VALUES (?, ?, ?, ?)
            `, [doc._id, entry.key, entry.value, entry.value_type]);
        }
    }

    // Store effects
    if (doc.effects && Array.isArray(doc.effects)) {
        for (const effect of doc.effects) {
            await db.run(`
                INSERT OR REPLACE INTO effects (id, document_id, name, data)
                VALUES (?, ?, ?, ?)
            `, [effect._id || `${doc._id}_effect_${Math.random()}`, doc._id, effect.name || null, JSON.stringify(effect)]);
        }
    }

    // Store embedded items (for actors)
    if (doc.items && Array.isArray(doc.items)) {
        for (const item of doc.items) {
            await db.run(`
                INSERT OR REPLACE INTO embedded_items (
                    id, actor_id, name, type, img, sort, system_data, effects, flags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item._id,
                doc._id,
                item.name || null,
                item.type || null,
                item.img || null,
                item.sort || 0,
                JSON.stringify(item.system || {}),
                JSON.stringify(item.effects || []),
                JSON.stringify(item.flags || {})
            ]);
        }
    }

    // Store journal pages
    if (doc.pages && Array.isArray(doc.pages)) {
        for (const page of doc.pages) {
            await db.run(`
                INSERT OR REPLACE INTO journal_pages (
                    id, journal_id, name, type, title, text_content, text_format, sort
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                page._id,
                doc._id,
                page.name || null,
                page.type || null,
                page.title?.show === false ? null : (page.title?.content || null),
                page.text?.content || null,
                page.text?.format || null,
                page.sort || 0
            ]);
        }
    }

    // Store table results
    if (doc.results && Array.isArray(doc.results)) {
        for (const result of doc.results) {
            await db.run(`
                INSERT OR REPLACE INTO table_results (
                    id, table_id, type, text, img, weight, range_start, range_end, drawn, flags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                result._id,
                doc._id,
                result.type || null,
                result.text || null,
                result.img || null,
                result.weight || 1,
                result.range?.[0] || null,
                result.range?.[1] || null,
                result.drawn || false,
                JSON.stringify(result.flags || {})
            ]);
        }
    }
    
    await db.run('COMMIT');
}

/**
 * Unpack all compendiums to database
 */
async function unpackToDatabase() {
    console.log("Initializing database...");
    const db = await initializeDatabase();
    
    // Clean up any existing temp directory
    await fs.rm(TEMP_PATH, { recursive: true, force: true });
    
    try {
        // Get all pack directories
        const dirents = await fs.readdir(BASE_LDB_PATH, { withFileTypes: true });
        const packs = dirents.filter((dirent) => dirent.isDirectory());
        
        console.log(`Found ${packs.length} compendium packs to process...`);

        for (let i = 0; i < packs.length; i++) {
            const pack = packs[i];
            const packName = path.join(pack.path, pack.name);
            const tempPackPath = path.join(TEMP_PATH, pack.name);
            
            try {
                console.log(`[${i + 1}/${packs.length}] Unpacking ${packName} to database...`);
                
                // Extract to temporary files
                await extractPack(
                    `${SYSTEM_ID}/${packName}`,
                    `${SYSTEM_ID}/${tempPackPath}`,
                    { yaml: false } // Use JSON for easier parsing
                );
                
                // Read all JSON files and store in database
                const files = await fs.readdir(tempPackPath, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile() && file.name.endsWith('.json')) {
                        const filePath = path.join(tempPackPath, file.name);
                        const content = await fs.readFile(filePath, 'utf8');
                        const doc = JSON.parse(content);
                        await storeDocument(db, doc, pack.name);
                    }
                }
                
                console.log(`✓ Processed ${pack.name}`);
                
            } finally {
                // Clean up temp files for this pack immediately
                await fs.rm(tempPackPath, { recursive: true, force: true });
            }
        }
        
        console.log("Creating indexes for better query performance...");
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
            CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
            CREATE INDEX IF NOT EXISTS idx_documents_compendium ON documents(compendium);
            CREATE INDEX IF NOT EXISTS idx_system_data_document_id ON system_data(document_id);
            CREATE INDEX IF NOT EXISTS idx_system_data_key ON system_data(key);
            CREATE INDEX IF NOT EXISTS idx_embedded_items_actor_id ON embedded_items(actor_id);
        `);
        
        console.log("✓ Database unpacking complete!");
        
    } finally {
        // Clean up temp files
        await fs.rm(TEMP_PATH, { recursive: true, force: true });
        await db.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    unpackToDatabase().catch(console.error);
}

export { unpackToDatabase, initializeDatabase };