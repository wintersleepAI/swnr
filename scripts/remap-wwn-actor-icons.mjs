/*
  Remap WWN actor icons based on actor names.
  - Updates root-level `img:` and `prototypeToken.texture.src`.
  - Skips item `img` fields, which are indented and unaffected.
  - Intelligently uses both creature-icons and humanoid-icons folders.
*/

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACTORS_DIR = path.join(ROOT, 'src/packs/wwn-actors');
const ICON_BASE = 'systems/swnr/assets/icons/game-icons.net';
const CREATURE_BASE = `${ICON_BASE}/creature-icons`;
const HUMANOID_BASE = `${ICON_BASE}/humanoid-icons`;
const ANIMAL_BASE = `${ICON_BASE}/animal-icons`;

/** 
 * Ordered mapping of regex -> icon info
 * folder: 'creature' | 'humanoid' | 'animal' | 'auto' (auto picks best folder)
 * priority: higher numbers are checked first for tie-breaking
 */
const RULES = [
  // === PRIORITY MATCHES - Very specific creatures first ===
  { re: /sea\s*dragon|dragon.*sea/i, folder: 'creature', icon: 'sea-dragon.svg', priority: 100 },
  { re: /will\s*o'?\s*the\s*wisp|wisp/i, folder: 'creature', icon: 'spark-spirit.svg', priority: 100 },
  { re: /hellhound/i, folder: 'creature', icon: 'unfriendly-fire.svg', priority: 100 },

  // === UNDEAD ===
  { re: /skeleton/i, folder: 'creature', icon: 'grim-reaper.svg', priority: 80 },
  { re: /mummy/i, folder: 'creature', icon: 'mummy-head.svg', priority: 80 },
  { re: /wight|spectre/i, folder: 'creature', icon: 'spectre.svg', priority: 80 },
  { re: /ghoul/i, folder: 'creature', icon: 'shambling-zombie.svg', priority: 80 },
  { re: /ghost|shade/i, folder: 'creature', icon: 'floating-ghost.svg', priority: 80 },
  { re: /zombie|husk|raised\s*corpse|shambling\s*corpse/i, folder: 'creature', icon: 'shambling-zombie.svg', priority: 80 },
  { re: /bat.*vampire|vampire.*bat/i, folder: 'animal', icon: 'evil-bat.svg', priority: 85 },
  { re: /vampire/i, folder: 'auto', icon: 'vampire-dracula.svg', priority: 75 },

  // === OOZES / SLIMES ===
  { re: /black\s*pudding/i, folder: 'creature', icon: 'vile-fluid.svg', priority: 80 },
  { re: /ochre\s*jelly|jelly\s*spawn|slime|ooze/i, folder: 'creature', icon: 'transparent-slime.svg', priority: 80 },

  // === DRAGONS AND SERPENTS ===
  { re: /hydra/i, folder: 'creature', icon: 'hydra.svg', priority: 80 },
  { re: /wyvern/i, folder: 'creature', icon: 'wyvern.svg', priority: 80 },
  { re: /dragon/i, folder: 'creature', icon: 'dragon-head.svg', priority: 75 },
  { re: /sea\s*serpent/i, folder: 'animal', icon: 'sea-serpent.svg', priority: 85 },
  { re: /snake|serpent|cobra/i, folder: 'animal', icon: 'snake.svg', priority: 70 },

  // === HUMANOIDS - Specific types first ===
  { re: /orc\s+(?:chief|leader|captain|warlord|king)/i, folder: 'humanoid', icon: 'overlord-helm.svg', priority: 90 },
  { re: /orc/i, folder: 'auto', icon: 'orc-head.svg', priority: 70 },
  { re: /goblin\s+(?:chief|leader|captain|king)/i, folder: 'humanoid', icon: 'brutal-helm.svg', priority: 90 },
  { re: /goblin/i, folder: 'auto', icon: 'goblin-head.svg', priority: 70 },
  { re: /hobgoblin/i, folder: 'humanoid', icon: 'barbute.svg', priority: 75 },
  { re: /bugbear/i, folder: 'creature', icon: 'bully-minion.svg', priority: 85 },  // Higher priority to beat "bear" match
  { re: /ogre/i, folder: 'auto', icon: 'ogre.svg', priority: 70 },
  { re: /troll/i, folder: 'auto', icon: 'troll.svg', priority: 70 },
  { re: /minotaur/i, folder: 'auto', icon: 'minotaur.svg', priority: 80 },
  { re: /centaur/i, folder: 'creature', icon: 'centaur.svg', priority: 80 },
  { re: /cyclops/i, folder: 'creature', icon: 'cyclops.svg', priority: 80 },
  { re: /medusa|gorgon/i, folder: 'creature', icon: 'medusa-head.svg', priority: 80 },
  { re: /lizardfolk|lizardman|lizard\s*person/i, folder: 'creature', icon: 'lizardman.svg', priority: 80 },
  { re: /kenku/i, folder: 'auto', icon: 'kenku-head.svg', priority: 80 },

  // === HUMAN CLASSES AND PROFESSIONS ===
  { re: /sorcerer|warlock/i, folder: 'humanoid', icon: 'warlock-hood.svg', priority: 85 },
  { re: /mage|wizard/i, folder: 'humanoid', icon: 'wizard-face.svg', priority: 85 },
  { re: /witch/i, folder: 'humanoid', icon: 'witch-face.svg', priority: 85 },
  { re: /priest|cleric|monk/i, folder: 'humanoid', icon: 'monk-face.svg', priority: 80 },
  { re: /nun|priestess/i, folder: 'humanoid', icon: 'nun-face.svg', priority: 80 },
  { re: /cultist/i, folder: 'humanoid', icon: 'cultist.svg', priority: 80 },
  { re: /executioner/i, folder: 'humanoid', icon: 'executioner-hood.svg', priority: 80 },
  
  // === PIRATES AND BUCCANEERS (new icons) ===
  { re: /buccaneer.*(?:captain|commander|leader)/i, folder: 'humanoid', icon: 'pirate-captain.svg', priority: 85 },
  { re: /pirate.*(?:captain|commander|leader)/i, folder: 'humanoid', icon: 'pirate-captain.svg', priority: 85 },
  { re: /buccaneer|pirate/i, folder: 'humanoid', icon: 'man-bandana.svg', priority: 80 },
  
  // === OTHER PROFESSIONS ===
  { re: /bandit.*leader|brigand.*leader/i, folder: 'humanoid', icon: 'overlord-helm.svg', priority: 85 },
  { re: /brigand.*(?:commander|captain)/i, folder: 'humanoid', icon: 'overlord-helm.svg', priority: 85 },
  { re: /bandit|brigand|highwayman/i, folder: 'humanoid', icon: 'bandit.svg', priority: 80 },
  { re: /reaver|raider/i, folder: 'humanoid', icon: 'man-bandana.svg', priority: 80 },  // Use bandana for raiders
  { re: /barbarian/i, folder: 'humanoid', icon: 'barbarian.svg', priority: 80 },
  { re: /warrior|veteran|soldier|guard|knight/i, folder: 'humanoid', icon: 'visored-helm.svg', priority: 75 },
  { re: /leader|commander|captain|chief|lord|king/i, folder: 'humanoid', icon: 'overlord-helm.svg', priority: 80 },

  // === RACIAL VARIANTS ===
  { re: /dwarf.*(?:lord|king|chief)/i, folder: 'humanoid', icon: 'dwarf-helmet.svg', priority: 85 },
  { re: /dwarf|dwarven/i, folder: 'humanoid', icon: 'dwarf-face.svg', priority: 70 },
  { re: /elf.*(?:lord|lady|noble)/i, folder: 'humanoid', icon: 'elf-helmet.svg', priority: 85 },
  { re: /elf.*(?:woman|female|lady)/i, folder: 'humanoid', icon: 'woman-elf-face.svg', priority: 80 },
  { re: /elf|elven/i, folder: 'humanoid', icon: 'elf-helmet.svg', priority: 70 },

  // === GENERIC HUMANS ===
  { re: /human|villager|normal\s*humans?|commoner|peasant/i, folder: 'humanoid', icon: 'cowled.svg', priority: 50 },
  { re: /footman|cavalry/i, folder: 'humanoid', icon: 'barbute.svg', priority: 75 },

  // === MAGICAL CREATURES ===
  { re: /pixie|fairy|fae|houri/i, folder: 'creature', icon: 'fairy.svg', priority: 80 },
  { re: /pegasus/i, folder: 'animal', icon: 'pegasus.svg', priority: 85 },
  { re: /unicorn/i, folder: 'creature', icon: 'unicorn.svg', priority: 85 },

  // === SPECIFIC ANIMALS (using animal-icons) ===
  // Large mammals (note: bugbear handled above with higher priority)
  { re: /polar\s*bear/i, folder: 'animal', icon: 'polar-bear.svg', priority: 85 },
  { re: /\bbear\b|grizzly|cave\s*bear/i, folder: 'animal', icon: 'bear-head.svg', priority: 80 },  // Word boundary to avoid bugbear
  { re: /sabre[-\s]*tooth.*tiger|sabre[-\s]*tooth/i, folder: 'animal', icon: 'tiger.svg', priority: 85 },
  { re: /tiger/i, folder: 'animal', icon: 'tiger.svg', priority: 80 },
  { re: /lion/i, folder: 'animal', icon: 'lion.svg', priority: 80 },
  { re: /panther|lynx/i, folder: 'animal', icon: 'lynx-head.svg', priority: 80 },
  { re: /wolf/i, folder: 'animal', icon: 'wolf-head.svg', priority: 80 },
  { re: /elephant|mastodon/i, folder: 'animal', icon: 'elephant.svg', priority: 80 },
  { re: /rhinoceros|woolly.*rhinoceros/i, folder: 'animal', icon: 'rhinoceros-horn.svg', priority: 80 },
  { re: /bull/i, folder: 'animal', icon: 'bull.svg', priority: 80 },
  { re: /boar|pig/i, folder: 'animal', icon: 'pig.svg', priority: 80 },
  { re: /gorilla|ape/i, folder: 'animal', icon: 'gorilla.svg', priority: 80 },
  
  // Hoofed animals
  { re: /elk|stag/i, folder: 'animal', icon: 'stag-head.svg', priority: 80 },
  { re: /deer|caribou/i, folder: 'animal', icon: 'deer-track.svg', priority: 80 },
  { re: /antelope/i, folder: 'animal', icon: 'deer-track.svg', priority: 75 },
  { re: /camel/i, folder: 'animal', icon: 'camel-head.svg', priority: 80 },
  { re: /goat/i, folder: 'animal', icon: 'goat.svg', priority: 80 },
  { re: /sheep/i, folder: 'animal', icon: 'sheep.svg', priority: 80 },
  { re: /cow/i, folder: 'animal', icon: 'cow.svg', priority: 80 },

  // Small mammals
  { re: /rat/i, folder: 'animal', icon: 'rat.svg', priority: 80 },
  { re: /ferret/i, folder: 'animal', icon: 'feline.svg', priority: 80 },
  { re: /rabbit/i, folder: 'animal', icon: 'rabbit.svg', priority: 80 },
  { re: /mouse/i, folder: 'animal', icon: 'mouse.svg', priority: 80 },

  // Flying creatures
  { re: /bat/i, folder: 'animal', icon: 'bat.svg', priority: 70 },
  { re: /eagle/i, folder: 'animal', icon: 'eagle-head.svg', priority: 80 },
  { re: /raven|crow/i, folder: 'animal', icon: 'raven.svg', priority: 80 },
  { re: /owl/i, folder: 'animal', icon: 'owl.svg', priority: 80 },
  { re: /vulture/i, folder: 'animal', icon: 'vulture.svg', priority: 80 },
  { re: /falcon/i, folder: 'animal', icon: 'falcon-moon.svg', priority: 80 },

  // Aquatic creatures
  { re: /shark/i, folder: 'animal', icon: 'shark-jaws.svg', priority: 80 },
  { re: /whale|sperm\s*whale/i, folder: 'animal', icon: 'sperm-whale.svg', priority: 80 },
  { re: /octopus/i, folder: 'animal', icon: 'octopus.svg', priority: 80 },
  { re: /squid|kraken/i, folder: 'animal', icon: 'giant-squid.svg', priority: 80 },
  { re: /jellyfish/i, folder: 'animal', icon: 'jellyfish.svg', priority: 80 },
  { re: /crab/i, folder: 'animal', icon: 'crab.svg', priority: 80 },
  { re: /dolphin/i, folder: 'animal', icon: 'dolphin.svg', priority: 80 },

  // Reptiles and amphibians
  { re: /crocodile|alligator/i, folder: 'animal', icon: 'croc-jaws.svg', priority: 80 },
  { re: /turtle|tortoise/i, folder: 'animal', icon: 'turtle.svg', priority: 80 },
  { re: /gecko/i, folder: 'animal', icon: 'gecko.svg', priority: 80 },
  { re: /frog|toad/i, folder: 'animal', icon: 'frog.svg', priority: 80 },
  { re: /salamander/i, folder: 'animal', icon: 'salamander.svg', priority: 80 },

  // Insects and arachnids
  { re: /spider.*crab|crab.*spider|giant\s*spider/i, folder: 'animal', icon: 'spider-face.svg', priority: 85 },  // Crab spiders should still be spiders
  { re: /spider/i, folder: 'animal', icon: 'spider-face.svg', priority: 80 },
  { re: /scorpion/i, folder: 'animal', icon: 'scorpion.svg', priority: 80 },
  { re: /giant\s*centipede/i, folder: 'animal', icon: 'centipede.svg', priority: 85 },
  { re: /centipede/i, folder: 'animal', icon: 'centipede.svg', priority: 80 },
  { re: /driver\s*ant|giant\s*ant/i, folder: 'animal', icon: 'insect-jaws.svg', priority: 85 },
  { re: /\bant\b/i, folder: 'animal', icon: 'insect-jaws.svg', priority: 75 },  // Word boundary to avoid "giant"
  { re: /bee/i, folder: 'animal', icon: 'bee.svg', priority: 80 },
  { re: /beetle/i, folder: 'animal', icon: 'scarab-beetle.svg', priority: 80 },
  { re: /mantis|praying\s*mantis/i, folder: 'animal', icon: 'praying-mantis.svg', priority: 80 },
  { re: /butterfly/i, folder: 'animal', icon: 'butterfly.svg', priority: 80 },

  // === BEASTS AND MONSTERS ===
  { re: /gargoyle/i, folder: 'creature', icon: 'gargoyle.svg', priority: 80 },
  { re: /manticore/i, folder: 'creature', icon: 'spiked-dragon-head.svg', priority: 80 },
  { re: /cockatrice|razorhorn/i, folder: 'creature', icon: 'horned-reptile.svg', priority: 75 },
  { re: /griffon|gryphon|griffin/i, folder: 'auto', icon: 'griffin-symbol.svg', priority: 80 },
  { re: /harpy/i, folder: 'creature', icon: 'harpy.svg', priority: 80 },
  { re: /sphinx/i, folder: 'creature', icon: 'egyptian-sphinx.svg', priority: 80 },
  { re: /carcass\s*crawler|crawler|dunecrawler/i, folder: 'creature', icon: 'floating-tentacles.svg', priority: 75 },

  // === CONSTRUCTS / SERVITORS ===
  { re: /wood\b|\bwooden/i, folder: 'creature', icon: 'tree-face.svg', priority: 80 },
  { re: /ice/i, folder: 'creature', icon: 'ice-golem.svg', priority: 80 },
  { re: /rock|stone/i, folder: 'creature', icon: 'rock-golem.svg', priority: 80 },
  { re: /automaton|servitor|statue|living\s*statue/i, folder: 'auto', icon: 'golem-head.svg', priority: 75 },
  { re: /golem/i, folder: 'auto', icon: 'golem-head.svg', priority: 70 },

  // === OUTSIDERS / DEMONS / ELEMENTALS ===
  { re: /djinn|genie/i, folder: 'creature', icon: 'djinn.svg', priority: 80 },
  { re: /ifrit/i, folder: 'creature', icon: 'ifrit.svg', priority: 80 },
  { re: /outsider|daemon|devil|demon/i, folder: 'creature', icon: 'daemon-skull.svg', priority: 75 },
  { re: /water\b|sea\b|triton/i, folder: 'creature', icon: 'triton-head.svg', priority: 75 },
  { re: /elemental|guardian.*fire|fire\b/i, folder: 'creature', icon: 'unfriendly-fire.svg', priority: 75 },

  // === GIANTS ===
  { re: /anak|giant|ogroid/i, folder: 'creature', icon: 'giant.svg', priority: 75 },

  // === FALLBACKS (lowest priority) ===
  { re: /undead/i, folder: 'creature', icon: 'shambling-zombie.svg', priority: 20 },
  { re: /animals?/i, folder: 'animal', icon: 'animal-skull.svg', priority: 20 },
  { re: /outsiders?/i, folder: 'creature', icon: 'daemon-skull.svg', priority: 20 },
  { re: /summons?/i, folder: 'creature', icon: 'spark-spirit.svg', priority: 20 },
];

/**
 * Check if an icon exists in a specific folder
 */
function iconExistsInFolder(folderBase, iconFile) {
  try {
    const fullPath = path.join(ROOT, folderBase.replace('systems/swnr/', ''), iconFile);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

/**
 * Pick the best icon for a given name using the enhanced rule system
 */
function pickIconForName(name) {
  const n = String(name || '').toLowerCase();
  
  // Sort matching rules by priority (highest first)
  const matches = RULES.filter(rule => rule.re.test(n))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  if (matches.length === 0) {
    // No matches, return default
    return { folder: CREATURE_BASE, icon: 'beast-eye.svg' };
  }
  
  // Get the highest priority match
  const bestMatch = matches[0];
  const { folder, icon } = bestMatch;
  
  // Handle folder selection
  let selectedFolder;
  if (folder === 'auto') {
    // Auto-select between humanoid, animal, and creature based on availability
    if (iconExistsInFolder(HUMANOID_BASE, icon)) {
      selectedFolder = HUMANOID_BASE;
    } else if (iconExistsInFolder(ANIMAL_BASE, icon)) {
      selectedFolder = ANIMAL_BASE;
    } else if (iconExistsInFolder(CREATURE_BASE, icon)) {
      selectedFolder = CREATURE_BASE;
    } else {
      // Fallback to creature folder
      selectedFolder = CREATURE_BASE;
    }
  } else if (folder === 'humanoid') {
    selectedFolder = HUMANOID_BASE;
  } else if (folder === 'animal') {
    selectedFolder = ANIMAL_BASE;
  } else {
    selectedFolder = CREATURE_BASE;
  }
  
  return { folder: selectedFolder, icon };
}

function remapFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const nameMatch = text.match(/^name:\s*(.*)$/m);
  const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath);
  const iconResult = pickIconForName(name);
  const newPath = `${iconResult.folder}/${iconResult.icon}`;

  let updated = text;

  // Update root-level img line (not indented)
  if (/^img:\s*.*/m.test(updated)) {
    updated = updated.replace(/^img:\s*.*/m, `img: ${newPath}`);
  } else {
    // If somehow missing, insert before items:
    updated = updated.replace(/\nitems:\n/, `\nimg: ${newPath}\nitems:\n`);
  }

  // Update prototypeToken.texture.src specifically
  // Find prototypeToken block and within it the texture src line
  const tokenBlockRe = /(prototypeToken:[\s\S]*?texture:\s*\n)(\s*src:\s*)(.*)/m;
  if (tokenBlockRe.test(updated)) {
    updated = updated.replace(tokenBlockRe, (_m, pre, srcKey) => `${pre}${srcKey}${newPath}`);
  }

  if (updated !== text) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return { name, iconFile: iconResult.icon, folder: iconResult.folder, changed: true };
  }
  return { name, iconFile: iconResult.icon, folder: iconResult.folder, changed: false };
}

function main() {
  const files = fs.readdirSync(ACTORS_DIR).filter(f => f.endsWith('.yml'));
  let changed = 0;
  const report = [];
  const folderStats = { creature: 0, humanoid: 0, animal: 0 };
  
  for (const f of files) {
    const fp = path.join(ACTORS_DIR, f);
    const res = remapFile(fp);
    if (res.changed) changed++;
    
    // Track folder usage
    let folderType;
    if (res.folder.includes('humanoid')) {
      folderType = 'humanoid';
    } else if (res.folder.includes('animal')) {
      folderType = 'animal';
    } else {
      folderType = 'creature';
    }
    folderStats[folderType]++;
    
    report.push({ 
      file: f, 
      name: res.name, 
      icon: res.iconFile, 
      folder: folderType,
      changed: res.changed 
    });
  }
  
  // Enhanced console summary
  console.log(`Updated ${changed}/${files.length} actor YAMLs.`);
  console.log(`Icon distribution: ${folderStats.creature} creature-icons, ${folderStats.humanoid} humanoid-icons, ${folderStats.animal} animal-icons`);
  
  // Show some examples of changes
  if (changed > 0) {
    console.log('\nSample changes:');
    const changedItems = report.filter(r => r.changed).slice(0, 5);
    changedItems.forEach(item => {
      console.log(`  ${item.name} -> ${item.folder}/${item.icon}`);
    });
    if (changed > 5) {
      console.log(`  ... and ${changed - 5} more`);
    }
  }
  
  // Uncomment to see full report: 
  // console.table(report);
}

main();
