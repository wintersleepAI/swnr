#!/usr/bin/env node
/**
 * remove-yaml-img-lines.mjs
 *
 * Recursively scans a directory for .yml/.yaml files and removes any lines
 * whose key is `img:` at any indentation level (including list items like `- img:`).
 *
 * Usage:
 *   node scripts/remove-yaml-img-lines.mjs <folder> [--dry-run]
 *
 * Notes:
 * - Operates in-place unless --dry-run is provided.
 * - Matches lines that begin (optionally after whitespace and/or `- `) with `img:`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const USAGE = `Usage: node scripts/remove-yaml-img-lines.mjs <folder> [--dry-run]\n`;

/**
 * Return list of file paths under `dir` recursively.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walk(dir) {
  const out = [];
  async function recur(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (e) {
      console.error(`Failed to read dir: ${current}:`, e.message);
      return;
    }
    for (const ent of entries) {
      const p = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await recur(p);
      } else if (ent.isFile()) {
        out.push(p);
      }
    }
  }
  await recur(dir);
  return out;
}

/**
 * Process a YAML file, removing lines with `img:` key.
 * @param {string} file
 * @param {boolean} dryRun
 * @returns {Promise<{changed: boolean, removed: number}>}
 */
async function processYaml(file, dryRun) {
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (e) {
    console.error(`Failed to read file: ${file}:`, e.message);
    return { changed: false, removed: 0 };
  }

  const lines = content.split(/\r?\n/);
  const re = /^\s*(?:-\s*)?img\s*:/; // matches `img:` or `- img:` with indentation

  let removed = 0;
  const kept = [];
  for (const line of lines) {
    if (re.test(line)) {
      removed++;
      continue;
    }
    kept.push(line);
  }

  const changed = removed > 0;
  if (changed && !dryRun) {
    const text = kept.join('\n');
    try {
      await fs.writeFile(file, text, 'utf8');
    } catch (e) {
      console.error(`Failed to write file: ${file}:`, e.message);
      return { changed: false, removed: 0 };
    }
  }
  return { changed, removed };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(USAGE.trim());
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const folder = args.find(a => !a.startsWith('--'));
  if (!folder) {
    console.error(USAGE.trim());
    process.exit(1);
  }

  const root = path.resolve(folder);
  const exists = await fs
    .stat(root)
    .then(s => s.isDirectory())
    .catch(() => false);
  if (!exists) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  const all = await walk(root);
  const yamlFiles = all.filter(f => /\.(ya?ml)$/i.test(f));
  if (yamlFiles.length === 0) {
    console.log(`No YAML files under: ${root}`);
    return;
  }

  let totalFiles = 0;
  let totalRemoved = 0;
  for (const file of yamlFiles) {
    const { changed, removed } = await processYaml(file, dryRun);
    if (changed) {
      totalFiles++;
      totalRemoved += removed;
      console.log(`${dryRun ? '[DRY]' : '[EDIT]'} ${file} - removed ${removed} line(s)`);
    }
  }

  console.log(`Done. Files changed: ${totalFiles}, lines removed: ${totalRemoved}${dryRun ? ' (dry-run)' : ''}.`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

