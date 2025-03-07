# SWN System
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Foundry v11](https://img.shields.io/badge/foundry-v11-green) ![Foundry v12](https://img.shields.io/badge/foundry-v12-green)

This is started with the Boilerplate system

### Getting Help


#### Tutorial

For much more information on how to use this system as a starting point for making your own, see the [full tutorial on the Foundry Wiki](https://foundryvtt.wiki/en/development/guides/SD-tutorial)!

Note: Tutorial may be out of date, so look out for the Foundry compatibility badge at the top of each page.

## Sheet Layout

This system includes a handful of helper CSS classes to help you lay out your sheets if you're not comfortable diving into CSS fully. Those are:

- `flexcol`: Included by Foundry itself, this lays out the child elements of whatever element you place this on vertically.
- `flexrow`: Included by Foundry itself, this lays out the child elements of whatever element you place this on horizontally.
- `flex-center`: When used on something that's using flexrow or flexcol, this will center the items and text.
- `flex-between`: When used on something that's using flexrow or flexcol, this will attempt to place space between the items. Similar to "justify" in word processors.
- `flex-group-center`: Add a border, padding, and center all items.
- `flex-group-left`: Add a border, padding, and left align all items.
- `flex-group-right`: Add a border, padding, and right align all items.
- `grid`: When combined with the `grid-Ncol` classes, this will lay out child elements in a grid.
- `grid-Ncol`: Replace `N` with any number from 1-12, such as `grid-3col`. When combined with `grid`, this will layout child elements in a grid with a number of columns equal to the number specified.

## Compiling the CSS

This repo includes both CSS for the theme and SCSS source files. If you're new to CSS, it's probably easier to just work in those files directly and delete the SCSS directory. If you're interested in using a CSS preprocessor to add support for nesting, variables, and more, you can run `npm install` in this directory to install the dependencies for the scss compiler. After that, just run `npm run build` to compile the SCSS and start a process that watches for new changes.

![image](http://mattsmith.in/images/swnr.png)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CyborgYeti"><img src="https://avatars.githubusercontent.com/u/4867637?v=4?s=100" width="100px;" alt="IronLlama"/><br /><sub><b>IronLlama</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr-redux/commits?author=CyborgYeti" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Sealio956"><img src="https://avatars.githubusercontent.com/u/44585912?v=4?s=100" width="100px;" alt="Sealio"/><br /><sub><b>Sealio</b></sub></a><br /><a href="#infra-Sealio956" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr-redux/commits?author=Sealio956" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wesleygriffin"><img src="https://avatars.githubusercontent.com/u/6266349?v=4?s=100" width="100px;" alt="Wesley Griffin"/><br /><sub><b>Wesley Griffin</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr-redux/commits?author=wesleygriffin" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!