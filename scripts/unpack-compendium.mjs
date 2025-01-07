import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';

const MODULE_ID = process.cwd();
const IGNORE = [ '.gitattributes', '.DS_Store' ];

fs.readdir(`${MODULE_ID}/packs`)
    .then(packs => {
        for (const pack of packs) {
            if (IGNORE.includes(pack)) {
                continue;
            }

            console.log(`Unpacking ${pack}`);
            const directory = `${MODULE_ID}/src/packs/${pack}`;

            // Delete all the pack files in the source directory.
            fs.readdir(directory)
                .then(files => {
                    for (const file of files) {
                        fs.unlink(path.join(directory, file))
                            .catch(err => {
                                if (err.code === 'ENOENT') {
                                    console.log(`No files inside of ${pack}`);
                                } else {
                                    throw err;
                                }
                            });
                    }
                })
                .catch(err => {
                    if (err.code === 'ENOENT') {
                        console.log(`No files inside of ${pack}`);
                    } else {
                        throw err;
                    }
                });

            extractPack(
                `${MODULE_ID}/packs/${pack}`,
                `${MODULE_ID}/src/packs/${pack}`,
                {
                    transformName: transformName,
                })
                .catch(err => {
                    console.log(`Error extracting ${pack}: ${err}`);
                });
        }
    });

/**
 * Prefaces the document with its type
 * @param {object} doc - The document data
 */
function transformName(doc) {
    const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, '_');
    const type = doc._key.split('!')[1];
    const prefix = [ 'actors', 'items' ].includes(type) ? doc.type : type;
    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.json`;
}