export function getDefaultImage(itemType) {
  const icon_path = "systems/swnr/assets/icons/game-icons.net/item-icons";
  const imgMap = {
    shipWeapon: "sinusoidal-beam.svg",
    shipDefense: "bubble-field.svg",
    shipFitting: "power-generator.svg",
    cyberware: "cyber-eye.svg",
    focus: "reticule.svg",
    armor: "armor-white.svg",
    weapon: "weapon-white.svg",
    power: "psychic-waves-white.svg",
    skill: "book-white.svg",
    edge: "edge.svg",
    program: "program.svg",
  };
  if (itemType in imgMap) {
    return `${icon_path}/${imgMap[itemType]}`;
  } else {
    return "icons/svg/item-bag.svg";
  }
}

export function calcMod(value,  bonus=0) {
  const m = (value - 10.5) / 3.5;
  return  Math.min(2, Math.max(-2, Math[m < 0 ? "ceil" : "floor"](m))) + bonus;

}

/*--------------------------------------------*/
/*  Chat message visibility (v13/v14 compat)  */
/*--------------------------------------------*/

/**
 * True when running on a core version that uses the v14 message-mode API.
 * v14 renamed the "core.rollMode" setting to "core.messageMode" and renamed the
 * values ("publicroll"->"public", "gmroll"->"gm", "blindroll"->"blind",
 * "selfroll"->"self"). The old setting is still registered on v14 but reads back
 * as null, so anything using it silently loses the GM's chosen visibility.
 * @returns {boolean}
 */
function usesMessageMode() {
  return game.settings.settings.has("core.messageMode");
}

/**
 * The configured visibility mode for new chat messages, on either core version.
 * Use this instead of reading "core.rollMode" directly.
 * @returns {string} A v14 message mode, or a v13 roll mode on older cores.
 */
export function getChatMessageMode() {
  return usesMessageMode()
    ? game.settings.get("core", "messageMode")
    : game.settings.get("core", "rollMode");
}

/**
 * Translate a semantic visibility into the value the running core expects.
 * Lets call sites ask for "gm" without caring that v13 spells it "gmroll".
 * @param {"public"|"gm"|"blind"|"self"} mode
 * @returns {string}
 */
export function chatMode(mode) {
  if (usesMessageMode()) return mode;
  return { public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll" }[mode];
}

/**
 * Apply the configured visibility to outgoing chat data, on either core version.
 * Replaces direct calls to the deprecated ChatMessage.applyRollMode().
 * @param {object} chatData  Chat data to be mutated in place.
 * @param {string} [mode]    Mode to apply; defaults to the configured one.
 * @returns {object} The mutated chat data.
 */
export function applyChatMessageMode(chatData, mode) {
  const ChatMessageClass = getDocumentClass("ChatMessage");
  const resolved = mode ?? getChatMessageMode();
  return usesMessageMode()
    ? ChatMessageClass.applyMode(chatData, resolved)
    : ChatMessageClass.applyRollMode(chatData, resolved);
}

/*--------------------------------------------*/
/*  Skill Utilities                           */
/*--------------------------------------------*/

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
  if (skillSet === undefined || skillSet === "") {
    return;
  }
  const items = CONFIG.SWN.skills[skillSet].map((element) => {
    const skillRoot = `swnr.skills.${skillSet}.${element}.`;
    return {
      type: "skill",
      name: game.i18n.localize(skillRoot + "name"),
      system: {
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

