import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";
import path from "path";

const SYSTEM_ID = process.cwd();

const BASE_SRC_PATH = "src/packs";
const BASE_DEST_PATH = "packs";

const IGNORE = [ '.gitattributes', '.DS_Store' ];

/**
 * Compiles all packs in the given base path
 */
async function compilePacksRecursivly() {
    const packs = (await fs.readdir(BASE_SRC_PATH, { withFileTypes: true })).filter(file => file.isDirectory());

    for (const pack of packs) {
        if (IGNORE.includes(pack.name)) continue;

        const srcPath = path.join(BASE_SRC_PATH, pack.name);
        const destPath = path.join(BASE_DEST_PATH, pack.name);
        console.log("Packing " + srcPath + " to " + destPath);
        await compilePack(
            `${SYSTEM_ID}/${srcPath}`,
            `${SYSTEM_ID}/${destPath}`,
            { yaml: true, recursive: true, log: true }
        );
    }
}

// Exit non-zero on any pack failure. The release workflow ships packs/ straight
// into the zip, so a swallowed error means a silently incomplete compendium.
compilePacksRecursivly().catch(err => {
    console.error(err);
    process.exit(1);
});
