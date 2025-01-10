import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';

const MODULE_ID = process.cwd();
const IGNORE = [ '.gitattributes', '.DS_Store' ];

fs.readdir(`${MODULE_ID}/src/packs`, {withFileTypes: true})
    .filter(file => file.isDirectory())
    .then(packs => {
        for (const pack of packs) {
            if (IGNORE.includes(pack.name)) {
                continue;
            }

            console.log(`Packing ${pack.name}`);
            compilePack(
                `${MODULE_ID}/src/packs/${pack.name}`, 
                `${MODULE_ID}/packs/${pack.name}`,
                { yaml: true, recursive: true, log: true }
            )
            .catch(err => {
                console.log(err);
            });
        }
    });
