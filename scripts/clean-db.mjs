import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_DIR = "src/compendium-db";
const DB_PATH = path.join(DB_DIR, "compendiums.db");

async function cleanDatabase() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("=== Checking for Data Issues ===");
    
    // Find documents with null compendium
    const nullCompendiums = await db.all(`
        SELECT id, name, type, document_type 
        FROM documents 
        WHERE compendium IS NULL
    `);
    
    console.log(`Found ${nullCompendiums.length} documents with null compendium:`);
    console.table(nullCompendiums);
    
    if (nullCompendiums.length > 0) {
        console.log("\n🧹 Cleaning up null compendium entries...");
        
        // Delete system data for these documents
        for (const doc of nullCompendiums) {
            await db.run(`DELETE FROM system_data WHERE document_id = ?`, [doc.id]);
            await db.run(`DELETE FROM effects WHERE document_id = ?`, [doc.id]);
            await db.run(`DELETE FROM embedded_items WHERE actor_id = ?`, [doc.id]);
            await db.run(`DELETE FROM journal_pages WHERE journal_id = ?`, [doc.id]);
            await db.run(`DELETE FROM table_results WHERE table_id = ?`, [doc.id]);
        }
        
        // Delete the main documents
        await db.run(`DELETE FROM documents WHERE compendium IS NULL`);
        
        console.log("✅ Cleaned up null compendium entries");
    }
    
    // Check for other potential issues
    const stats = await db.get(`
        SELECT 
            COUNT(*) as total_docs,
            COUNT(DISTINCT compendium) as compendiums,
            COUNT(CASE WHEN name IS NULL THEN 1 END) as null_names,
            COUNT(CASE WHEN type IS NULL THEN 1 END) as null_types
        FROM documents 
        WHERE compendium IS NOT NULL
    `);
    
    console.log("\n=== Database Health Check ===");
    console.table(stats);
    
    await db.close();
    console.log("✅ Database cleanup complete");
}

cleanDatabase().catch(console.error);