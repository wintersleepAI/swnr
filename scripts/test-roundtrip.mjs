import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_DIR = "src/compendium-db";
const DB_PATH = path.join(DB_DIR, "compendiums.db");

async function testRoundtrip() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("=== Testing Database Round-trip ===");
    
    // Find a weapon to test with
    const weapon = await db.get(`
        SELECT d.id, d.name, d.compendium
        FROM documents d
        WHERE d.type = 'weapon' 
        AND d.compendium = 'awn-items'
        LIMIT 1
    `);
    
    if (!weapon) {
        console.log("❌ No weapon found for testing");
        await db.close();
        return;
    }
    
    console.log(`📋 Testing with: ${weapon.name} (${weapon.id})`);
    
    // Get current damage value
    const currentDamage = await db.get(`
        SELECT value FROM system_data 
        WHERE document_id = ? AND key = 'damage'
    `, [weapon.id]);
    
    console.log(`🔍 Current damage: ${currentDamage?.value || 'not found'}`);
    
    // Change the damage value
    const newDamage = '"d10+2"'; // JSON string format
    await db.run(`
        UPDATE system_data 
        SET value = ? 
        WHERE document_id = ? AND key = 'damage'
    `, [newDamage, weapon.id]);
    
    console.log(`✏️  Updated damage to: ${newDamage}`);
    
    // Verify the change
    const updatedDamage = await db.get(`
        SELECT value FROM system_data 
        WHERE document_id = ? AND key = 'damage'
    `, [weapon.id]);
    
    console.log(`✅ Verified new damage: ${updatedDamage.value}`);
    console.log(`📦 Now run: npm run pack-from-db ${weapon.compendium}`);
    console.log(`🔄 Then check that ${weapon.name} has damage ${JSON.parse(newDamage)} in Foundry`);
    
    await db.close();
}

testRoundtrip().catch(console.error);