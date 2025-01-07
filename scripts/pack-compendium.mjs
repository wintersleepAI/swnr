import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';

const MODULE_ID = process.cwd();
const IGNORE = [ '.gitattributes', '.DS_Store' ];

fs.readdir(`${MODULE_ID}/src.packs`)
    .then(packs => {
        for (const pack of packs) {
            if (IGNORE.includes(pack.name)) {
                continue;
            }

            console.log(`Packing ${pack}`);
            compilePack(`${MODULE_ID}/src/packs/${pack}`, `${MODULE_ID}/packs/${pack}`)
                .catch(err => {
                    console.log(err);
                });
        }
    });
