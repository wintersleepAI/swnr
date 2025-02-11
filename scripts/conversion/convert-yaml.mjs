import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { mapping } from './mapping.mjs';

const inputFolder = 'scripts/conversion/input';   // Path to your input YAML file
const outputFolder = 'scripts/conversion/output'; // Path where you want to save the output YAML

const transformAllYaml = async () => {
    try {
        const entries = await readdir(inputFolder);

        for (const entry of entries) {
            // Read all entries from the input folder
            const files = await readdir(path.join(inputFolder, entry));

            for (const fileName of files) {
                const inputFilePath = path.join(inputFolder, entry, fileName);
                const outputFilePath = path.join(outputFolder, entry, fileName);
                await transformYaml(inputFilePath, outputFilePath);
            }
        }
    } catch (error) {
        console.error('Error during processing:', error);
    }
};

const transformYaml = async (inputFilePath, outputFilePath) => {
    try {
        // Read and parse the input YAML
        const fileContents = await readFile(inputFilePath, 'utf8');
        const inputData = yaml.load(fileContents);

        const outputData = mapToV12Format(inputData)
        if (inputData?.items) {
            outputData.items = (inputData.items).map(item => {
                const itemCompendium = mapToV12Format(item);

                return {
                    ...itemCompendium,
                    _key: `!actors.items!${outputData._id}.${itemCompendium._id}`,
                }
            });
        }

        // Dump the transformed data back to YAML format
        const newYaml = yaml.dump(outputData, { lineWidth: -1 });

        await mkdir(path.dirname(outputFilePath), { recursive: true });
        await writeFile(outputFilePath, newYaml, 'utf8');
    } catch (error) {
        console.error('Error transforming YAML:', error);
    }
};

const generate16DigitString = () => {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

    let result = '';
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

const mapToV12Format = (compendium) => {
    const uuid = generate16DigitString();
    const template = {
        name: compendium?.name,
        type: compendium?.type,
        img: compendium?.img,
        folder: null,
        flags: {},
        _stats: {
            compendiumSource: null,
            duplicateSource: null,
            coreVersion: '12.331',
            systemId: 'swnr',
            systemVersion: '2.0.0',
            createdTime: Date.now(),
            modifiedTime: Date.now(),
            lastModifiedBy: 'systembuilder9000'
        },
        sort: 0,
        _id: uuid,
    };
    const outputFormat = ['npc', 'cyberdeck', 'drone', 'faction', 'mech', 'ship', 'vehicle'].includes(compendium.type) ?
        {
            ...template,
            system: Object.entries(compendium.data).reduce((acc, [key, value]) => {
                if (key in (mapping?.[compendium.type] || {})) {
                    acc[key] = value;
                }
                return acc;
            }, { ...mapping?.[compendium.type] }),
            effects: [],
            prototypeToken: {
                name: compendium.name,
                displayName: 0,
                actorLink: false,
                appendNumber: false,
                prependAdjective: false,
                width: 1,
                height: 1,
                texture: {
                    src: compendium.img,
                    anchorX: 0.5,
                    anchorY: 0.5,
                    offsetX: 0,
                    offsetY: 0,
                    fit: "contain",
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    tint: "#ffffff",
                    alphaThreshold: 0.75
                },
                hexagonalShape: 0,
                lockRotation: false,
                rotation: 0,
                alpha: 1,
                disposition: -1,
                displayBars: 0,
                bar1: {
                    attribute: "health"
                },
                bar2: {
                    attribute: "power"
                },
                light: {
                    negative: false,
                    priority: 0,
                    alpha: 0.5,
                    angle: 360,
                    bright: 0,
                    color: null,
                    coloration: 1,
                    dim: 0,
                    attenuation: 0.5,
                    luminosity: 0.5,
                    saturation: 0,
                    contrast: 0,
                    shadows: 0,
                    animation: {
                        type: null,
                        speed: 5,
                        intensity: 5,
                        reverse: false
                    },
                    darkness: {
                        min: 0,
                        max: 1
                    }
                },
                sight: {
                    enabled: false,
                    range: 0,
                    angle: 360,
                    visionMode: "basic",
                    color: null,
                    attenuation: 0.1,
                    brightness: 0,
                    saturation: 0,
                    contrast: 0
                },
                detectionModes: [],
                occludable: {
                    radius: 0
                },
                ring: {
                    enabled: false,
                    colors: {
                        ring: null,
                        background: null
                    },
                    effects: 1,
                    subject: {
                        scale: 1,
                        texture: null
                    }
                },
                flags: {},
                randomImg: false
            },
            _key: `!actors!${uuid}`
        }
        : !compendium?.type ?
            {
                ...template,
                description: compendium.description,
                results: compendium?.results?.map(result => ({
                    ...result,
                    _key: `!tables.results!${uuid}.${result._id}`
                })) ?? [],
                replacement: compendium.replacement,
                displayRoll: compendium.displayRoll,
                formula: compendium.formula,
                _key: `!tables!${uuid}`
            }
            :
            {
                ...template,
                system: Object.entries(compendium.data).reduce((acc, [key, value]) => {
                    if (key in (mapping?.[compendium.type] || {})) {
                        acc[key] = value;
                    }
                    return acc;
                }, { ...mapping?.[compendium.type] }),
                effects: [],
                _key: `!items!${uuid}`
            }

    if (compendium.type === 'focus' || compendium.type === 'edge') {
        return {
            ...outputFormat,
            type: 'feature',
            system: {
                ...outputFormat.system,
                description: compendium.data.description + (compendium.type === 'focus'
                    ? `<br><br>Level 1: ${compendium.data.level1}<br>Level 2: ${compendium.data.level2}`
                    : '')
            }
        }
    } else if (compendium.type === 'npc') {
        return {
            ...outputFormat,
            system: {
                ...outputFormat.system,
                hitDice: `1d${compendium.data.hitDice}`,
                hitDie: `d${compendium.data.hitDice}`,
            }
        }
    }

    return outputFormat
};

transformAllYaml();