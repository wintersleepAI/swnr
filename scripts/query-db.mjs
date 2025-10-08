import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_DIR = "src/compendium-db";
const DB_PATH = path.join(DB_DIR, "compendiums.db");

async function queryDatabase() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("=== Compendium Summary ===");
    const summary = await db.all(`
        SELECT compendium, document_type, COUNT(*) as count 
        FROM documents 
        GROUP BY compendium, document_type 
        ORDER BY compendium, document_type
    `);
    
    console.table(summary);

    console.log("\n=== Sample Items ===");
    const sampleItems = await db.all(`
        SELECT name, type, compendium 
        FROM documents 
        WHERE document_type = 'items' 
        LIMIT 10
    `);
    
    console.table(sampleItems);

    console.log("\n=== System Data Sample ===");
    const systemSample = await db.all(`
        SELECT d.name, s.key, s.value_type, 
               CASE WHEN length(s.value) > 50 THEN substr(s.value, 1, 50) || '...' ELSE s.value END as value_preview
        FROM documents d 
        JOIN system_data s ON d.id = s.document_id 
        WHERE d.document_type = 'items' 
        LIMIT 10
    `);
    
    console.table(systemSample);

    await db.close();
}

queryDatabase().catch(console.error);