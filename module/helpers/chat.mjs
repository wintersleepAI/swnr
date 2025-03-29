export function chatListeners(message, html) {
  html.on("click", ".card-buttons button", _onChatCardAction.bind(this));
  const foundDiv = [];
  html.find(".dice-roll").each((_i , _d) => {
    foundDiv.push(_d);
  });
  if (foundDiv.length == 1) {
    _addHealthButtons($(foundDiv[0]));
  } else if (foundDiv.length > 1) {
    for (const div of foundDiv) {
      _addRerollButton($(div));
    }
  }
  // //Reroll
  // html.find(".dice-roll").each((_i, div) => {
  //   _addRerollButton($(div));
  // });
  // Health Buttons
  html.find(".roll-damage").each((_i, div) => {
    _addHealthButtons($(div));
  });
  //  html.on("click", ".item-name", _onChatCardToggleContent.bind(this));
  // Desc toggle
  const longDesc = html.find(".longShowDesc");
  if (longDesc) {
    const bind = function (event) {
      event.preventDefault();
      const hiddenDesc = html.find(".hiddenLong");
      const shownDesc = html.find(".hiddenShort");
      hiddenDesc.show();
      //longDesc.hide();
      shownDesc.hide();
    };
    longDesc.on("click", bind);
  }
  const shortDesc = html.find(".longHideDesc");
  if (shortDesc) {
    const bind = function (event) {
      event.preventDefault();
      const hiddenDesc = html.find(".hiddenLong");
      const shownDesc = html.find(".hiddenShort");
      hiddenDesc.hide();
      //longDesc.hide();
      shownDesc.show();
    };
    shortDesc.on("click", bind);
  }

  html.find(".statApplyButton button").each((_i, button) => {
    // fix later
    const actorId = button.dataset.actorId;
    button = $(button);

    //const actorId = message.system["speaker"]["actor"];
    if (!actorId) throw new Error("no id");
    const actor = game.actors?.get(actorId);
    if (!actor) throw new Error("missing actor?");

    if (
      message.getFlag("swnr", "alreadyDone") ||
      (!game.user?.isGM && game.user?.id === user.id)
    ) {
      button.prop("disabled", true);
    } else {
      const bind = function (event) {
        event.preventDefault();
        message.setFlag("swnr", "alreadyDone", true);
        button.prop("disabled", true);
        const messageContent = button.parents(".message-content");
        const stats = {};
        ["str", "dex", "con", "int", "wis", "cha"].forEach((stat) => {
          stats[stat] = {
            base: parseInt(
              messageContent.find(`.stat-${stat} .statBase`).text()
            ),
          };
        });
        actor.update({ system: { stats } });
      };
      button.on("click", bind);
    }
  });
}

function getRerollButton(
  diceRoll,
  isAttack
) {
  const rerollButton = $(
    `<button class="dice-total-fullDamage-btn chat-button-small"><i class="fas fa-redo" title="Reroll"></i></button>`
  );
  rerollButton.on("click", async (ev) => {
    const rollMode = game.settings.get("core", "rollMode");
    ev.stopPropagation();
    const roll = new Roll(diceRoll);
    await roll.roll();
    const flavor = "Reroll";
    const chatTemplate = "systems/swnr/templates/chat/re-roll.hbs";
    const chatDialogData = {
      roll: await roll.render(),
      title: flavor,
      isAttack,
    };
    const chatContent = await renderTemplate(chatTemplate, chatDialogData);
    const chatData = {
      speaker: ChatMessage.getSpeaker(),
      roll: JSON.stringify(roll),
      content: chatContent
    };
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  });
  return rerollButton;
}

export function _addRerollButton(html) {
  const totalDiv = html.find(".dice-total");
  if (totalDiv.parent().parent().parent().hasClass("re-roll")) {
    // this is a re-roll do not add
    return;
  }

  const diceRoll = totalDiv.parent().find(".dice-formula").text();
  const total = parseInt(totalDiv.text());
  if (isNaN(total)) {
    console.log("Error in converting a string to a number " + totalDiv.text());
    return;
  }

  const btnContainer = $(
    '<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>'
  );
  const rerollButton = getRerollButton(diceRoll, false);
  btnContainer.append(rerollButton);
  totalDiv.append(btnContainer);
}

export function _addHealthButtons(html) {
  const totalDiv = html.find(".dice-total");
  const total = parseInt(totalDiv.text());
  if (isNaN(total)) {
    console.log("Error in converting a string to a number " + totalDiv.text());
    return;
  }
  const diceRoll = totalDiv.parent().find(".dice-formula").text();

  const fullDamageButton = $(
    `<button class="dice-total-fullDamage-btn chat-button-small"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></button>`
  );
  const halfDamageButton = $(
    `<button class="dice-total-halfDamage-btn chat-button-small"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>`
  );
  // const doubleDamageButton = $(`<button class="dice-total-doubleDamage-btn" style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>`);
  const fullHealingButton = $(
    `<button class="dice-total-fullHealing-btn chat-button-small"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>`
  );

  const fullDamageModifiedButton = $(
    `<button class="dice-total-fullDamageMod-btn chat-button-small"><i class="fas fa-user-edit" title="Click to apply full damage with modifier prompt to selected token(s)."></i></button>`
  );

  const btnContainer = $(
    '<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>'
  );

  const rerollButton = getRerollButton(diceRoll, true);
  btnContainer.append(fullDamageButton);
  btnContainer.append(fullDamageModifiedButton);
  btnContainer.append(halfDamageButton);
  // btnContainer.append(doubleDamageButton);
  btnContainer.append(fullHealingButton);
  if (totalDiv.parent().parent().parent().hasClass("re-roll") == false) {
    btnContainer.append(rerollButton);
  }
  totalDiv.append(btnContainer);

  // Handle button clicks
  fullDamageButton.on("click", (ev) => {
    ev.stopPropagation();
    applyHealthDrop(total);
  });

  fullDamageModifiedButton.on("click", (ev) => {
    ev.stopPropagation();
    new Dialog({
      title: "Apply Modifier to Damage",
      content: `
          <form>
            <div class="form-group">
              <label>Modifier to damage (${total}) </label>
              <input type='text' name='inputField'></input>
            </div>
          </form>`,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: `Apply`,
        },
      },
      default: "yes",
      close: (html) => {
        const form = html[0].querySelector("form");
        const modifier = ((
          form.querySelector('[name="inputField"]')
        ))?.value;
        if (modifier && modifier != "") {
          const nModifier = Number(modifier);
          if (nModifier) {
            applyHealthDrop(total + nModifier);
          } else {
            ui.notifications?.error(modifier + " is not a number");
          }
        }
      },
    }).render(true);
  });

  halfDamageButton.on("click", (ev) => {
    ev.stopPropagation();
    applyHealthDrop(Math.floor(total * 0.5));
  });

  // doubleDamageButton.click(ev => {
  //     ev.stopPropagation();
  // applyHealthDrop(total*2);
  // });

  fullHealingButton.on("click", (ev) => {
    ev.stopPropagation();
    applyHealthDrop(total * -1);
  });
}

export async function showValueChange(
  t,
  fillColor,
  total
) {
  const floaterData = {
    anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
    direction:
      total > 0
        ? CONST.TEXT_ANCHOR_POINTS.BOTTOM
        : CONST.TEXT_ANCHOR_POINTS.TOP,
    // duration: 2000,
    fontSize: 32,
    fill: fillColor,
    stroke: 0x000000,
    strokeThickness: 4,
    jitter: 0.3,
  };

  if (game?.release?.generation >= 10)
    canvas?.interface?.createScrollingText(
      t.center,
      `${total * -1}`,
      floaterData
    );
  // v10
  else t.hud.createScrollingText(`${total * -1}`, floaterData); // v9
}

export async function applyHealthDrop(total) {
  if (total == 0) return; // Skip changes of 0

  const tokens = canvas?.tokens?.controlled;
  if (!tokens || tokens.length == 0) {
    ui.notifications?.error("Please select at least one token");
    return;
  }
  // console.log(
  //   `Applying health drop ${total} to ${tokens.length} selected tokens`
  // );

  for (const t of tokens) {
    const actor = t.actor;
    let isDefeated = false;

    if (!actor) {
      ui.notifications?.error("Error getting actor for token " + t.name);
      continue;
    }
    if (actor.type == "cyberdeck") {
      const shielding = actor.system.health.value;
      if (total > 0) {
        // take from shielding first
        const newShielding = Math.max(shielding - total, 0);
        total -= shielding - newShielding;
        await actor.update({ "system.health.value": newShielding });
        await showValueChange(t, "0xFFA500", shielding - newShielding);
        if (total > 0) {
          isDefeated = true;
          const hacker = actor.getHacker();
          // damage still to player
          if (hacker) {
            const oldHealth = hacker.system.health.value;
            const newHealth = Math.max(oldHealth - total, 0);
            const damage = oldHealth - newHealth;
            await hacker.update({ "system.health.value": newHealth });
            total = 0; // prevent later damage
            ui.notifications?.info(
              `${hacker.name} takes ${damage} damage, now at ${newHealth} health`
            );
          }
        }
      }
    }
    if (game.settings.get("swnr", "useCWNArmor")) {
      const armorWithSoak = 
        actor.items.filter(
          (i) =>
            i.type === "armor" &&
            i.system.use &&
            i.system.location === "readied" &&
            i.system.soak.value > 0
        );
      for (const armor of armorWithSoak) {
        if (total > 0) {
          const soakValue = armor.system.soak.value;
          const newSoak = Math.max(soakValue - total, 0);
          total -= soakValue - newSoak;
          await armor.update({ "system.soak.value": newSoak });
          await showValueChange(t, "0xFFA500", soakValue - newSoak);
        }
      }
      if (total > 0 && actor.type == "npc") {
        const soakValue = actor.system.baseSoakTotal.value;
        const newSoak = Math.max(soakValue - total, 0);
        total -= soakValue - newSoak;
        await actor.update({ "system.baseSoakTotal.value": newSoak });
        await showValueChange(t, "0xFFA500", soakValue - newSoak);
      }
    }
    const oldHealth = actor.system.health.value;
    if (total != 0) {
      let newHealth = oldHealth - total;
      if (newHealth < 0) {
        newHealth = 0;
      } else if (newHealth > actor.system.health.max) {
        newHealth = actor.system.health.max;
      }
      //console.log(`Updating ${actor.name} health to ${newHealth}`);
      await actor.update({ "system.health.value": newHealth });
      // Taken from Mana
      //https://gitlab.com/mkahvi/fvtt-micro-modules/-/blob/master/pf1-floating-health/floating-health.mjs#L182-194
      const fillColor = total < 0 ? "0x00FF00" : "0xFF0000";
      showValueChange(t, fillColor, total);

      if (newHealth <= 0) {
        isDefeated = true;
      } else if (oldHealth <= 0) {
        // token was at <=0 and now is not
        isDefeated = false;
      } else {
        // we can return no status to update
        return;
      }
      await t.combatant?.update({ defeated: isDefeated });
      const status = CONFIG.statusEffects.find(
        (e) => e.id === CONFIG.specialStatusEffects.DEFEATED
      );
      if (!status) return;
      const effect = actor && status ? status : CONFIG.controlIcons.defeated;
      if (t.object) {
        await t.object.toggleEffect(effect, {
          overlay: true,
          active: isDefeated,
        });
      } else {
        await t.toggleEffect(effect, {
          overlay: true,
          active: isDefeated,
        });
      }
    }
  }
}

export function _findCharTargets() {
  const chars = [];
  canvas?.tokens?.controlled.forEach((i) => {
    if (i.actor?.type == "character" || i.actor?.type == "npc") {
      chars.push(i.actor);
    }
  });
  if (
    game.user?.character?.type == "character" ||
    game.user?.character?.type == "npc"
  ) {
    chars.push(game.user.character);
  }
  return chars;
}

//Taken from WWN (which could have come from OSE)
export async function _onChatCardAction(
  event
) {
  event.preventDefault();

  // Extract card data
  const button = event.currentTarget;
  //button.disabled = true;
  const card = button.closest(".chat-card");
  //const messageId = card.closest(".message").dataset.messageId;
  //const message = game.messages?.get(messageId);
  const action = button.dataset.action;

  // Validate permission to proceed with the roll
  const targets = _findCharTargets();
  if (action === "save") {
    if (!targets.length) {
      ui.notifications?.warn(
        `You must have one or more controlled Tokens in order to use this option.`
      );
      //return (button.disabled = false);
    }
    for (const t of targets) {
      await t.rollSave(button.dataset.save);
    }
  } else if (action === "skill") {
    if (!targets.length) {
      ui.notifications?.warn(
        `You must have one or more controlled Tokens in order to use this option.`
      );
      //return (button.disabled = false);
    }
    let skill = button.dataset.skill;
    let stat = null;
    if (skill.indexOf("/") != -1) {
      stat = skill.split("/")[0].toLowerCase();
      skill = skill.split("/")[1];
    }
    for (const t of targets) {
      if (t.type == "npc") {
        const skill = t.system.skillBonus;
        const roll = new Roll("2d6 + @skill", { skill });
        await roll.roll();
        const flavor = game.i18n.format(
          game.i18n.localize("swnr.npc.skill.trained"),
          { actor: t.name }
        );
        roll.toMessage({ flavor, speaker: { actor: t } });
      } else {
        const candidates = t.itemTypes.skill.filter(
          (i) => i.name?.toLocaleLowerCase() === skill.toLocaleLowerCase()
        );
        if (candidates.length == 1) {
          if (candidates[0].type == "skill") {
            if (stat == null || stat === "ask") {
              // No stat given or written as ask. Use roll default.
              candidates[0].roll(false);
            } else {
              // Stat given force the roll
              const skillItem = (
                (candidates[0])
              );
              const dice =
                skillItem.system.pool === "ask"
                  ? "2d6"
                  : skillItem.system.pool;
              const skillRank = skillItem.system.rank;

              const statShortName = game.i18n.localize(
                "swnr.stat.short." + stat
              );
              let statData = {
                mod: 0,
              };

              if (t.system["stats"][stat])
                statData = t.system["stats"][stat];

              skillItem.rollSkill(
                skillItem.name,
                statShortName,
                statData.mod,
                dice,
                skillRank,
                0
              );
            }
          }
        } else {
          ui.notifications?.info(`Cannot find skill ${skill}`);
        }
      }
    }
  } else if (action === "effort") {
    if (!targets.length) {
      ui.notifications?.warn(
        `You must have one or more controlled Tokens in order to use this option.`
      );
      //return (button.disabled = false);
    }
    const effort = button.dataset.effort;

    for (const t of targets) {
      if (t.type === "character") {
        if (t.system.effort.value == 0) {
          ui.notifications?.info(`${t.name} has no available effort`);
          return;
        }
        const updated_effort = t.system.effort[effort] + 1;
        const effort_key = `system.effort.${effort}`;
        await t.update({ [effort_key]: updated_effort });
      }
    }
  }
}