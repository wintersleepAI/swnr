import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";
import path from "path";

const SYSTEM_ID = process.cwd();

const BASE_SRC_PATH = "src/packs";
const BASE_DEST_PATH = "packs";

// await compilePacksRecursivly();

/**
 * Compiles all packs in the given base path
 */
async function compilePacksRecursivly() {
    const packs = (await fs.readdir(BASE_SRC_PATH, { withFileTypes: true })).filter(file => file.isDirectory());

    for (const pack of packs) {
        if (pack.name === '.gitattributes') continue;

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

const IGNORE = [ '.gitattributes', '.DS_Store' ];

fs.readdir(`${SYSTEM_ID}/src/packs`)
    .then(packs => {
        for (const pack of packs) {
            console.log('pack:', pack);
            if (IGNORE.includes(pack.name)) {
                continue;
            }

            console.log(`Packing ${pack}`);
            compilePack(`${SYSTEM_ID}/src/packs/${pack}`, `${SYSTEM_ID}/packs/${pack}`, { yaml: true })
                .catch(err => {
                    console.log(err);
                });
        }
    });