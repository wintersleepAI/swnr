/*
  Fix WWN actor item icons with simple, consistent assignments.
  - Weapons get weapon-white.svg
  - Armor gets armor-white.svg  
  - Everything else gets item-white.svg
*/

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACTORS_DIR = path.join(ROOT, 'src/packs/wwn-actors');
const ICON_BASE = 'systems/swnr/assets/icons/game-icons.net/item-icons';

const ITEM_ICONS = {
  weapon: `${ICON_BASE}/weapon-white.svg`,
  armor: `${ICON_BASE}/armor-white.svg`,
  default: `${ICON_BASE}/item-white.svg`
};

function fixItemsInFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let updated = text;
  let changes = 0;

  // Split into lines for easier processing
  const lines = updated.split('\n');
  let currentItemType = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for item type declarations
    const typeMatch = line.match(/^\s*type: (weapon|armor|item|focus|class-ability|skill|power|tag|consumable|cyberware|equipment|feature)/);
    if (typeMatch) {
      currentItemType = typeMatch[1];
      continue;
    }
    
    // Look for img lines that come after a type declaration
    const imgMatch = line.match(/^(\s*img: )(.+)$/);
    if (imgMatch && currentItemType) {
      const indent = imgMatch[1];
      const currentImg = imgMatch[2].trim();
      let newIcon;
      
      // Determine icon based on type
      if (currentItemType === 'weapon') {
        newIcon = ITEM_ICONS.weapon;
      } else if (currentItemType === 'armor') {
        newIcon = ITEM_ICONS.armor;
      } else {
        newIcon = ITEM_ICONS.default;
      }
      
      // Only replace if it's different
      if (currentImg !== newIcon) {
        lines[i] = indent + newIcon;
        changes++;
      }
      
      // Reset type after processing img
      currentItemType = null;
    }
    
    // Reset if we hit a new item (starts with "- name:")
    if (line.match(/^\s*- name:/)) {
      currentItemType = null;
    }
  }

  const newText = lines.join('\n');
  if (newText !== text) {
    fs.writeFileSync(filePath, newText, 'utf8');
    return { changed: true, itemChanges: changes };
  }
  return { changed: false, itemChanges: 0 };
}

function main() {
  const files = fs.readdirSync(ACTORS_DIR).filter(f => f.endsWith('.yml'));
  let changedFiles = 0;
  let totalItemChanges = 0;

  console.log(`Processing ${files.length} actor files...`);

  for (const f of files) {
    const fp = path.join(ACTORS_DIR, f);
    const result = fixItemsInFile(fp);
    if (result.changed) {
      changedFiles++;
      totalItemChanges += result.itemChanges;
    }
  }

  console.log(`\nResults:`);
  console.log(`- Updated ${changedFiles}/${files.length} actor files`);
  console.log(`- Fixed ${totalItemChanges} item icons total`);
  console.log(`\nIcon assignments:`);
  console.log(`- Weapons: ${ITEM_ICONS.weapon}`);
  console.log(`- Armor: ${ITEM_ICONS.armor}`);
  console.log(`- Other items: ${ITEM_ICONS.default}`);
}

main();