# Contributing Code 

## Contributing to the Codebase

## Development

Using node 20.14 for development.

Recommend using nvm (available on mac via brew or ubuntu) to manage node versions.
`nvm use 20.14.0`

`npm install`

### SCSS


### Compendium Building
(notes from PR)
(TODO add notes on how this gets built)

(game world must be closed to build )
I was able to convert most items to the new V12 format. Got rid of the roll tables as they caused an error and was better to get rid of them then to figure out how to fix it. Used convert-yaml.mjs to convert incompatible yml files from version 11 to version 12 format (requires /input and /output folder inside the /conversion folder where /input is where the old yaml files were and /output is where the output of the conversion script lands).

The /src/packs has the corrected yaml files. You can technically delete convert-yaml.mjs and mapping.mjs now as they won't be useful since all the old yaml files have been converted but keeping it as a documentation.
