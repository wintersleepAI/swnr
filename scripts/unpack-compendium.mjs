import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';

const MODULE_ID = process.cwd();
const IGNORE = [ '.gitattributes', '.DS_Store' ];

fs.readdir(`${MODULE_ID}/packs`, {withFileTypes: true, recursive: true})
    .filter(file => file.isDirectory())
    .then(packs => {
        for (const pack of packs) {
            if (IGNORE.includes(pack.name)) {
                continue;
            }

            console.log(`Unpacking ${pack}`);
            const directory = `${MODULE_ID}/src/packs/${pack.name}`;

            // Delete all the pack files in the source directory.
            fs.readdir(directory)
                .then(files => {
                    for (const file of files) {
                        fs.unlink(path.join(directory, file))
                            .catch(err => {
                                if (err.code === 'ENOENT') {
                                    console.log(`No files inside of ${pack.name}`);
                                } else {
                                    throw err;
                                }
                            }
                        );
                    }
                })
                .catch(err => {
                    if (err.code === 'ENOENT') {
                        console.log(`No files inside of ${pack.name}`);
                    } else {
                        throw err;
                    }
                });

            extractPack(
                `${MODULE_ID}/packs/${pack.name}`,
                `${MODULE_ID}/src/packs/${pack.name}`,
                {
                    yaml: true,
                    transformName,
                }
            )
            .catch(err => {
                console.log(`Error extracting ${pack.name}: ${err}`);
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