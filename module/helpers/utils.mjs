export async function initCompendSkills(actor) {
  ui.notifications?.error("TODO - implement initCompendSkills");
  return;
  const candidates = {};
  for (const e of game.packs) {
    if (e.metadata.type === "Item") {
      const items = await e.getDocuments();
      if (items.filter((i) => (i).type == "skill").length) {
        candidates[e.metadata.name] = e;
        console.log("skills", e.name, e.metadata, candidates);
      }
    }
  }
  if (Object.keys(candidates).length == 0) {
    ui.notifications?.error("Cannot find a compendium with a skill item");
    return;
  }
  let compOptions = "";
  for (const label in candidates) {
    const cand = candidates[label];
    compOptions += `<option value='${cand.metadata.name}'>${cand.metadata.label}</option>`;
  }
  const dialogTemplate = `
    <div class="flex flex-col -m-2 p-2 pb-4 space-y-2">
      <h1> Select Compendium </h1>
      <div class="flex flexrow">
        Compendium: <select id="compendium"
        class="px-1.5 border border-gray-800 bg-gray-400 bg-opacity-75 placeholder-blue-800 placeholder-opacity-75 rounded-md">
        ${compOptions}
        </select>
      </div>
    </div>
    `;

  const popUpDialog = new ValidatedDialog(
    {
      title: "Add Skills",
      content: dialogTemplate,
      buttons: {
        addSkills: {
          label: "Add Skills",
          callback: async (html) => {
            const comped = (html.find("#compendium")[0])
              .value;
            const toAdd = await candidates[comped].getDocuments();
            const primarySkills = toAdd
              .filter((i) => i.type === "skill")
              .map((item) => item.toObject())
              .sort((a, b) => {
                if (a.name < b.name) {
                  return -1;
                }
                if (a.name > b.name) {
                  return 1;
                }
                return 0;
              });
            await actor.createEmbeddedDocuments("Item", primarySkills);
          },
        },
        close: {
          label: "Close",
        },
      },
      default: "addSkills",
    },
    {
      failCallback: () => {
        return;
      },
      classes: ["swnr"],
    }
  );
  const s = popUpDialog.render(true);
  if (s instanceof Promise) await s;
}

export function initSkills(actor, skillSet) {
  const items = skills[skillSet].map((element) => {
    const skillRoot = `swnr.skills.${skillSet}.${element}.`;
    return {
      type: "skill",
      name: game.i18n.localize(skillRoot + "name"),
      data: {
        rank: -1,
        pool: "ask",
        description: game.i18n.localize(skillRoot + "text"),
        source: game.i18n.localize("swnr.skills.labels." + skillSet),
        dice: "2d6",
      },
    };
  });
  actor.createEmbeddedDocuments("Item", items);
}
const skills = {
  none: [],
  spaceMagic: ["knowMagic", "useMagic", "sunblade", "fight"],
  classic: [
    "artist",
    "athletics",
    "bureaucracy",
    "business",
    "combat-energy",
    "combat-gunnery",
    "combat-primitive",
    "combat-projectile",
    "combat-psitech",
    "combat-unarmed",
    "computer",
    "culture-alien",
    "culture-criminal",
    "culture-spacer",
    "culture-traveller",
    "culture",
    "culture",
    "culture",
    "exosuit",
    "gambling",
    "history",
    "instructor",
    "language",
    "leadership",
    "navigation",
    "perception",
    "persuade",
    "profession",
    "religion",
    "science",
    "security",
    "stealth",
    "steward",
    "survival",
    "tactics",
    "tech-astronautic",
    "tech-maltech",
    "tech-medical",
    "tech-postech",
    "tech-pretech",
    "tech-psitech",
    "vehicle-air",
    "vehicle-grav",
    "vehicle-land",
    "vehicle-space",
    "vehicle-water",
    ],
  revised: [
    "administer",
    "connect",
    "exert",
    "fix",
    "heal",
    "know",
    "lead",
    "notice",
    "perform",
    "pilot",
    "program",
    "punch",
    "shoot",
    "sneak",
    "stab",
    "survive",
    "talk",
    "trade",
    "work",
    ],
  psionic: [
    "biopsionics",
    "metapsionics",
    "precognition",
    "telekinesis",
    "telepathy",
    "teleportation",
    ],
  };
