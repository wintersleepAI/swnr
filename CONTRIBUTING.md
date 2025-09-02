# Contributing Code 

## Contributing to the Codebase
Please communicate with wintersleep directly before making any significant PR.

We need to implement a check on our style guide, which has not been done in some time.

## Development

Using node 20.14 for development.

Recommend using nvm (available on mac via brew or ubuntu) to manage node versions.
`nvm use 20.14.0`

### Install dependencies:
`npm install`

## CSS / SCSS
All changes to the CSS sheets must occur through scss
To compile the CSS sheets locally (release build will automatically do this) you should run `npm run build` or `npm run watch`


## Compendium Building
The compendium items are stored as yaml files in src/packs with the compendium collections and folders defined in system.json

The build script for a release will handle this automatically, but to build locally you should:
 - stop the foundry system
 - `npm run pack-compendium`
