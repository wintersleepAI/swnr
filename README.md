# Systems Without Number Redux (SWN, CWN, AWN) for Foundry VTT
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-10-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Foundry v12](https://img.shields.io/badge/foundry-v12-green)

This is a system re-rewrite of the Stars Without Number Revised system for Foundry VTT.  The system was originally written by SpiceKing and taken over wintersleepAI. The prior system was written in TypeScript and was not compatible with the latest version of Foundry VTT and I had fallen far behind on maintaining the definitions. This system is a complete re-write in JavaScript (using the boilerplate foundry system) and is compatible with the latest version of Foundry VTT.  A hope of the rewrite is to open the system to more contributors and to make it easier to maintain. This system will also add more support for AWN and WWN this year. Several folks helped with the rewrite and I am grateful for their help. See the list of contributors below, along with Stas, Sobran, and the all-stars on the Foundry VTT Discord server have been a great help in getting this system to where it is today.

## Notes 

 - Some of the data organization is changed, but most of it follows the same structure as the original system.
 - The UI needs a clean up. A goal is to make the colors and fonts a bit more modular to allow for customization and settings for SWN, CWN, and AWN.
  - CWN and SWN are both implemented. Much of CWN is enabled through system settings. AWN support is just started. We plan to add WWN support soon.
  - Characters have a lock button/toggle that is needed to edit skills. Other attributes will go under the locks soon. 
  - Old game worlds should not be migrated ONLY after back up is made.

### Use 
The background art for the system is taken from the SWN Revised book download and is able to be used per the license file. 
The artwork is by Grzegorz Pedrycz. The asset tokens were provided by Hawkin.

### Development 

Contributing guide TBA. Msg me on Discord if you want to help out before making any significant PR (eg something that changes the data model or core functionality). 

[Seee tutorial on the Foundry Wiki for the new data model and appv2](https://foundryvtt.wiki/en/development/guides/SD-tutorial)!


### Compiling the CSS
Run `npm run build` to compile the SCSS to CSS 


## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CyborgYeti"><img src="https://avatars.githubusercontent.com/u/4867637?v=4?s=100" width="100px;" alt="IronLlama"/><br /><sub><b>IronLlama</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=CyborgYeti" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Sealio956"><img src="https://avatars.githubusercontent.com/u/44585912?v=4?s=100" width="100px;" alt="Sealio"/><br /><sub><b>Sealio</b></sub></a><br /><a href="#infra-Sealio956" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=Sealio956" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wesleygriffin"><img src="https://avatars.githubusercontent.com/u/6266349?v=4?s=100" width="100px;" alt="Wesley Griffin"/><br /><sub><b>Wesley Griffin</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=wesleygriffin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Demonox"><img src="https://avatars.githubusercontent.com/u/189772363?v=4?s=100" width="100px;" alt="Demonox"/><br /><sub><b>Demonox</b></sub></a><br /><a href="#infra-Demonox" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/binary-idiot"><img src="https://avatars.githubusercontent.com/u/13305186?v=4?s=100" width="100px;" alt="Jonah"/><br /><sub><b>Jonah</b></sub></a><br /><a href="#infra-binary-idiot" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=binary-idiot" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wintersleepAI"><img src="https://avatars.githubusercontent.com/u/88955427?v=4?s=100" width="100px;" alt="wintersleepAI"/><br /><sub><b>wintersleepAI</b></sub></a><br /><a href="#infra-wintersleepAI" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=wintersleepAI" title="Tests">⚠️</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=wintersleepAI" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/badgkat"><img src="https://avatars.githubusercontent.com/u/109937927?v=4?s=100" width="100px;" alt="badgkat"/><br /><sub><b>badgkat</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=badgkat" title="Tests">⚠️</a> <a href="https://github.com/wintersleepAI/swnr/commits?author=badgkat" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TheToonerfish"><img src="https://avatars.githubusercontent.com/u/120363141?v=4?s=100" width="100px;" alt="TheToonerfish"/><br /><sub><b>TheToonerfish</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=TheToonerfish" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Torticute"><img src="https://avatars.githubusercontent.com/u/30007326?v=4?s=100" width="100px;" alt="Torticute"/><br /><sub><b>Torticute</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=Torticute" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pgotsis"><img src="https://avatars.githubusercontent.com/u/7128789?v=4?s=100" width="100px;" alt="Panos Gotsis"/><br /><sub><b>Panos Gotsis</b></sub></a><br /><a href="https://github.com/wintersleepAI/swnr/commits?author=pgotsis" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
