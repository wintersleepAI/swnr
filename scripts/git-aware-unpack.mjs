import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { execSync } from 'child_process';
import { promises as fs } from "fs";
import path from "path";

const SYSTEM_ID = process.cwd();
const IGNORE = ['.gitattributes', '.DS_Store'];

/**
 * Git-aware unpacking that preserves git tracking
 * Only removes files that are git-tracked but no longer exist in compendium
 */
async function gitAwareUnpack() {
    const packs = await fs.readdir(`${SYSTEM_ID}/packs`);
    
    for (const pack of packs) {
        if (IGNORE.includes(pack)) continue;
        
        console.log(`Git-aware unpacking ${pack}`);
        const directory = `${SYSTEM_ID}/src/packs/${pack}`;
        
        // Get list of git-tracked files in this directory
        let trackedFiles = [];
        try {
            const gitOutput = execSync(`git ls-files "${directory}/"`, { encoding: 'utf8' });
            trackedFiles = gitOutput.split('\n').filter(f => f.trim());
        } catch (error) {
            console.log(`No git-tracked files in ${pack} or git error`);
        }
        
        // Extract compendium (will overwrite existing files)
        await extractPack(
            `${SYSTEM_ID}/packs/${pack}`,
            `${SYSTEM_ID}/src/packs/${pack}`,
            { yaml: true, transform: transform }
        );
        
        // Get list of files after extraction
        let extractedFiles = [];
        try {
            const files = await fs.readdir(directory);
            extractedFiles = files.map(f => path.join(directory, f));
        } catch (error) {
            console.log(`No files extracted for ${pack}`);
            continue;
        }
        
        // Remove git-tracked files that are no longer in the compendium
        for (const trackedFile of trackedFiles) {
            if (!extractedFiles.includes(trackedFile)) {
                try {
                    console.log(`Removing obsolete file: ${trackedFile}`);
                    await fs.unlink(trackedFile);
                } catch (error) {
                    console.log(`Could not remove ${trackedFile}:`, error.message);
                }
            }
        }
    }
}

function transform(doc) {
    const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, '_');
    const type = doc._key.split('!')[1];
    const prefix = ['actors', 'items'].includes(type) ? doc.type : type;
    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.json`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    gitAwareUnpack().catch(console.error);
}

export { gitAwareUnpack };