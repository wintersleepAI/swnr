/**
 * Give icon SVGs an intrinsic size.
 *
 * Foundry sizes a canvas texture from the width/height *attributes* on the <svg> tag.
 * A CSS `style="width: 512px"` does not count, and the game-icons.net art ships with
 * neither, so token art fell back to a small default and rendered undersized next to
 * the PNG tokens. Adding the attributes fixes it in place -- no rasterising, no
 * compendium edits.
 *
 * The size is read from each file's own viewBox rather than hardcoded, so the declared
 * intrinsic size always matches the art.
 *
 * Usage:
 *   node scripts/normalize-icon-svgs.mjs [--dry-run] [--pack <name>] [path ...]
 *
 *   --pack <name>   Patch only the SVGs used as token art by src/packs/<name>
 *                   (prototypeToken.texture.src and the top-level img).
 *   path ...        Files or directories to walk. Defaults to assets/icons.
 *
 * Re-running is a no-op: files that already declare both attributes are skipped.
 */

import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const DEFAULT_ROOT = "assets/icons";
const SYSTEM_PREFIX = "systems/swnr/";

const SVG_TAG = /<svg\b[^>]*>/i;
const HAS_WIDTH = /\swidth\s*=\s*["']/i;
const HAS_HEIGHT = /\sheight\s*=\s*["']/i;
const VIEW_BOX = /\sviewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["']/i;

/**
 * Add width/height attributes to an SVG's root tag, derived from its viewBox.
 * @param {string} source  Raw file contents.
 * @returns {{status: string, source?: string, width?: number, height?: number}}
 */
export function addIntrinsicSize(source) {
  const tagMatch = SVG_TAG.exec(source);
  if (!tagMatch) return { status: "no-svg-tag" };

  const tag = tagMatch[0];
  const hasWidth = HAS_WIDTH.test(tag);
  const hasHeight = HAS_HEIGHT.test(tag);
  if (hasWidth && hasHeight) return { status: "already-sized" };

  const box = VIEW_BOX.exec(tag);
  if (!box) return { status: "no-viewbox" };

  const width = Number(box[3]);
  const height = Number(box[4]);
  if (!(width > 0) || !(height > 0)) return { status: "bad-viewbox" };

  // Insert straight after the viewBox so the three sizing attributes read together.
  const insertAt = box.index + box[0].length;
  const attrs = `${hasWidth ? "" : ` width="${width}"`}${hasHeight ? "" : ` height="${height}"`}`;
  const newTag = tag.slice(0, insertAt) + attrs + tag.slice(insertAt);

  // Splice by index: a plain String#replace would interpret $-sequences in the path data.
  const patched = source.slice(0, tagMatch.index) + newTag + source.slice(tagMatch.index + tag.length);
  return { status: "patched", source: patched, width, height };
}

/** Recursively collect *.svg under a file or directory. */
async function collectFrom(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return target.endsWith(".svg") ? [target] : [];
  const entries = await fs.readdir(target, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    found.push(...await collectFrom(path.join(target, entry.name)));
  }
  return found;
}

/** Collect the SVGs a pack uses as token art. */
async function collectFromPack(packName) {
  const dir = path.join("src/packs", packName);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  const svgs = new Set();
  for (const file of files) {
    const doc = yaml.load(await fs.readFile(path.join(dir, file), "utf8"));
    for (const src of [doc?.img, doc?.prototypeToken?.texture?.src]) {
      if (typeof src === "string" && src.endsWith(".svg") && src.startsWith(SYSTEM_PREFIX)) {
        svgs.add(path.normalize(src.slice(SYSTEM_PREFIX.length)));
      }
    }
  }
  return [...svgs].sort();
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const packIndex = argv.indexOf("--pack");
  const pack = packIndex === -1 ? null : argv[packIndex + 1];
  // Guard on packIndex: when --pack is absent it is -1, and a bare `packIndex + 1`
  // would wrongly discard the first positional argument.
  const packArgIndex = packIndex === -1 ? -1 : packIndex + 1;
  const targets = argv.filter((a, i) => !a.startsWith("--") && i !== packArgIndex);

  let files;
  if (pack) {
    files = await collectFromPack(pack);
    console.log(`Token-art SVGs referenced by src/packs/${pack}: ${files.length}`);
  } else {
    const roots = targets.length ? targets : [DEFAULT_ROOT];
    files = [];
    for (const root of roots) files.push(...await collectFrom(root));
    files.sort();
    console.log(`SVGs found under ${roots.join(", ")}: ${files.length}`);
  }

  const tally = {};
  for (const file of files) {
    const abs = path.resolve(ROOT, file);
    const source = await fs.readFile(abs, "utf8");
    const result = addIntrinsicSize(source);
    tally[result.status] = (tally[result.status] ?? 0) + 1;

    if (result.status === "patched") {
      console.log(`  ${dryRun ? "would patch" : "patched"}  ${file}  ->  ${result.width}x${result.height}`);
      if (!dryRun) await fs.writeFile(abs, result.source);
    } else if (result.status !== "already-sized") {
      console.warn(`  SKIPPED (${result.status})  ${file}`);
    }
  }

  console.log("\nSummary:");
  for (const [status, count] of Object.entries(tally).sort()) {
    console.log(`  ${status.padEnd(14)} ${count}`);
  }
  if (dryRun) console.log("\n(dry run -- nothing written)");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
