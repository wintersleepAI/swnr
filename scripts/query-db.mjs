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

    console.log("\n=== Embedded Items Summary ===");
    const embeddedSummary = await db.all(`
        SELECT 
            ei.type as item_type, 
            COUNT(*) as count,
            COUNT(DISTINCT ei.actor_id) as unique_actors
        FROM embedded_items ei
        GROUP BY ei.type 
        ORDER BY count DESC
    `);
    
    console.table(embeddedSummary);

    console.log("\n=== Actors with Most Items ===");
    const actorsWithItems = await db.all(`
        SELECT 
            d.name as actor_name,
            d.type as actor_type,
            COUNT(ei.id) as item_count
        FROM documents d
        LEFT JOIN embedded_items ei ON d.id = ei.actor_id
        WHERE d.document_type = 'actors'
        GROUP BY d.id, d.name, d.type
        HAVING item_count > 0
        ORDER BY item_count DESC
        LIMIT 10
    `);
    
    console.table(actorsWithItems);

    console.log("\n=== Embedded Item System Data Sample ===");
    const embeddedSystemSample = await db.all(`
        SELECT 
            ei.name as item_name,
            ei.type as item_type,
            esd.key,
            esd.value_type,
            CASE WHEN length(esd.value) > 30 THEN substr(esd.value, 1, 30) || '...' ELSE esd.value END as value_preview
        FROM embedded_items ei
        JOIN embedded_item_system_data esd ON ei.id = esd.item_id
        LIMIT 15
    `);
    
    console.table(embeddedSystemSample);

    console.log("\n=== Complex Query: Actors with Specific Item Types ===");
    const complexQuery = await db.all(`
        SELECT 
            d.name as actor_name,
            d.compendium,
            GROUP_CONCAT(DISTINCT ei.type) as item_types,
            COUNT(ei.id) as total_items
        FROM documents d
        JOIN embedded_items ei ON d.id = ei.actor_id
        WHERE d.document_type = 'actors'
        GROUP BY d.id, d.name, d.compendium
        HAVING total_items >= 3
        ORDER BY total_items DESC
        LIMIT 10
    `);
    
    console.table(complexQuery);

    await db.close();
}

queryDatabase().catch(console.error);