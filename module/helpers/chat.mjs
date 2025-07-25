export function chatListeners(message, html) {
  html.on("click", ".card-buttons button", _onChatCardAction.bind(this));
  // Add reroll buttons to all dice rolls
  html.find(".roll").each((_i, div) => {
    _addRerollButton($(div));
  });
  
  // Add health buttons to damage rolls
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
  const rerollButton = $("<button>")
    .addClass("dice-total-reroll-btn chat-button-small")
    .attr("title", game.i18n.localize("swnr.chat.rerollButton"))
    .append($("<i>").addClass("fas fa-redo"));
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

  // Check if reroll button already exists to prevent duplicates
  const existingContainer = totalDiv.parent().find(".dmgBtn-container");
  if (existingContainer.length > 0 && existingContainer.find(".dice-total-reroll-btn").length > 0) {
    return;
  }

  const diceRoll = totalDiv.parent().find(".dice-formula").text();
  const total = parseInt(totalDiv.text());
  if (isNaN(total)) {
    console.log("Error in converting a string to a number " + totalDiv.text());
    return;
  }

  // Use existing container or create new one
  let btnContainer = existingContainer.length > 0 ? existingContainer : $('<div class="dmgBtn-container"></div>');
  const rerollButton = getRerollButton(diceRoll, false);
  btnContainer.append(rerollButton);
  
  // Only append if we created a new container
  if (existingContainer.length === 0) {
    totalDiv.parent().append(btnContainer);
  }
}

export function _addHealthButtons(html) {
  const totalDiv = html.find(".dice-total");
  
  // Check if health buttons already exist to prevent duplicates
  const existingContainer = totalDiv.parent().find(".dmgBtn-container");
  if (existingContainer.length > 0 && existingContainer.find(".dice-total-fullDamage-btn").length > 0) {
    return;
  }
  
  const total = parseInt(totalDiv.text());
  if (isNaN(total)) {
    console.log("Error in converting a string to a number " + totalDiv.text());
    return;
  }
  const diceRoll = totalDiv.parent().find(".dice-formula").text();

  const fullDamageButton = $("<button>")
    .addClass("dice-total-fullDamage-btn chat-button-small")
    .attr("title", game.i18n.localize("swnr.chat.healthButtons.fullDamage"))
    .append($("<i>").addClass("fas fa-user-minus"));

  const halfDamageButton = $("<button>")
    .addClass("dice-total-halfDamage-btn chat-button-small")
    .attr("title", game.i18n.localize("swnr.chat.healthButtons.halfDamage"))
    .append($("<i>").addClass("fas fa-user-shield"));

  const fullHealingButton = $("<button>")
    .addClass("dice-total-fullHealing-btn chat-button-small")
    .attr("title", game.i18n.localize("swnr.chat.healthButtons.fullHealing"))
    .append($("<i>").addClass("fas fa-user-plus"));

  const fullDamageModifiedButton = $("<button>")
    .addClass("dice-total-fullDamageMod-btn chat-button-small")
    .attr("title", game.i18n.localize("swnr.chat.healthButtons.fullDamageModified"))
    .append($("<i>").addClass("fas fa-user-edit"));

  // Use existing container or create new one
  let btnContainer = existingContainer.length > 0 ? existingContainer : $('<div class="dmgBtn-container"></div>');

  btnContainer.append(fullDamageButton);
  btnContainer.append(fullDamageModifiedButton);
  btnContainer.append(halfDamageButton);
  // btnContainer.append(doubleDamageButton);
  btnContainer.append(fullHealingButton);
  
  // Only append if we created a new container
  if (existingContainer.length === 0) {
    totalDiv.parent().append(btnContainer);
  }

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
    } else {
      const armorWithDR = actor.items.filter(
        (i) =>
          i.type === "armor" &&
          i.system.use &&
          i.system.location === "readied" &&
          i.system.dr > 0
      );
      const armorDRSum = armorWithDR.reduce((acc, i) => acc + i.system.dr, 0);
      if (armorDRSum > 0) {
        total -= armorDRSum;
        total = Math.max(total, 0);
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
  const messageLi = button.closest(".message");
  const message = game.messages.get(messageLi.dataset.messageId);
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
      await t.system.rollSave(button.dataset.save);
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
  } else if (action === "use-power") {
    // Handle power resource spending with unified power system
    const powerId = button.dataset.powerId;
    const actorId = button.dataset.actorId;
    
    if (!powerId || !actorId) {
      ui.notifications?.error("Missing power or actor ID for resource spending");
      return;
    }
    
    // Get the actor and power
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for power usage");
      return;
    }
    
    const power = actor.items.get(powerId);
    if (!power) {
      ui.notifications?.error("Could not find power on actor");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to use this actor's powers");
      return;
    }
    
    try {
      // Check for selected token to target for costs
      let targetActor = actor;
      const controlled = canvas.tokens?.controlled;
      if (controlled && controlled.length === 1) {
        targetActor = controlled[0].actor;
        if (targetActor !== actor) {
          ui.notifications?.info(`Using selected token for costs: ${targetActor.name}`);
        }
      }
      
      // Use the power's resource spending system (without creating new chat message)
      const result = await power.system._performUseForChatUpdate(targetActor);
      
      if (result.success) {
        // Update the existing chat message with the new state showing recovery buttons
        // Preserve the original power roll from the existing message (don't reroll!)
        const chatCard = $(event.currentTarget).closest('.message');
        const existingRollElement = chatCard.find('.roll');
        let existingPowerRoll = null;
        
        if (existingRollElement.length > 0) {
          // Clone the element and remove any existing button containers to prevent duplication
          const cleanedRoll = existingRollElement.clone();
          cleanedRoll.find('.dmgBtn-container').remove();
          existingPowerRoll = cleanedRoll[0].outerHTML;
        }
        const consumptionResults = result.consumptionResults || [];
        
        // Calculate strain cost
        const totalStrainCost = consumptionResults
          .filter(r => r.type === "systemStrain")
          .reduce((sum, r) => sum + (r.spent || 0), 0);

        const templateData = {
          actor: actor,
          power: power,
          powerRoll: existingPowerRoll, // Will be null if no roll exists
          strainCost: totalStrainCost,
          isPassive: !power.system.hasConsumption(),
          consumptions: consumptionResults
        };



        const template = "systems/swnr/templates/chat/power-usage.hbs";
        const newContent = await foundry.applications.handlebars.renderTemplate(template, templateData);
        
        // Update the current message
        const messageId = chatCard.data('message-id');
        const message = game.messages?.get(messageId);
        if (message) {
          await message.update({ content: newContent });
        }
      }
      
    } catch (error) {
      ui.notifications?.error(`Failed to use power: ${error.message}`);
      console.error("Power usage error:", error);
    }
  } else if (action === "use-consumption") {
    // Handle individual consumption spending with token targeting
    const powerId = button.dataset.powerId;
    const actorId = button.dataset.actorId;
    const consumptionIndex = parseInt(button.dataset.consumptionIndex);
    
    if (!powerId || !actorId || isNaN(consumptionIndex)) {
      ui.notifications?.error("Missing power, actor ID, or consumption index");
      return;
    }
    
    try {
      const messageLi = button.closest(".message");
      const chatMsgLocal = game.messages.get(messageLi.dataset.messageId);
      if (!chatMsgLocal) {
        ui.notifications?.error("Could not find chat message");
        return;
      }

      const speaker = message.speaker;
      let originalActor;
      if (speaker.token) {
        const token = game.scenes.get(speaker.scene)?.tokens.get(speaker.token);
        originalActor = token?.actor;
      } else {
        originalActor = game.actors?.get(speaker.actor);
      }

      if (!originalActor) {
        ui.notifications?.error("Could not find the actor associated with the chat message.");
        return;
      }
      
      const power = originalActor.items?.get(powerId);
      if (!power) {
        ui.notifications?.error("Could not find power");
        return;
      }
      
      // Determine target actor (selected token or original actor)
      let targetActor = originalActor;
      const controlled = canvas.tokens?.controlled;
      if (controlled && controlled.length === 1) {
        targetActor = controlled[0].actor;
        if (targetActor !== originalActor) {
          ui.notifications?.info(`Using selected token for cost: ${targetActor.name}`);
        }
      }
      
      // Get the specific consumption to process
      const consumptions = power.system.getConsumptions();
      if (consumptionIndex >= consumptions.length) {
        ui.notifications?.error("Invalid consumption index");
        return;
      }
      
      const consumption = consumptions[consumptionIndex];
      
      // Process the single consumption
      const result = await power.system._processConsumption(targetActor, consumption, {}, consumptionIndex);
      
      if (!result.success) {
        ui.notifications?.error(result.error || "Failed to process consumption");
        return;
      }
      
      // Get existing consumption results from the current message
      const chatCard = $(button).closest('.chat-message');
      const messageId = chatCard.data('message-id');
      const chatMsg = game.messages?.get(messageId);
      
      let existingConsumptions = [];
      if (chatMsg) {
        // Try to parse existing consumptions from message flags or content
        const messageFlags = chatMsg.flags?.swnr?.consumptions;
        if (messageFlags) {
          existingConsumptions = messageFlags;
        }
      }
      
      // Add this consumption result with the index
      result.consumptionIndex = consumptionIndex;
      existingConsumptions.push(result);
      
      // Track which consumptions have been processed
      let processedConsumptions = {};
      if (chatMsg?.flags?.swnr?.processedConsumptions) {
        processedConsumptions = chatMsg.flags.swnr.processedConsumptions;
      }
      processedConsumptions[consumptionIndex] = true;
      
      // Preserve existing power roll
      let existingPowerRoll = null;
      if (chatMsg) {
        const existingRollElement = $(chatMsg.content).find('.roll');
        if (existingRollElement.length > 0) {
          const cleanedRoll = existingRollElement.clone();
          cleanedRoll.find('.dmgBtn-container').remove();
          existingPowerRoll = cleanedRoll[0].outerHTML;
        }
      }
      
      // Calculate total strain cost
      const totalStrainCost = existingConsumptions
        .filter(r => r.type === "systemStrain")
        .reduce((sum, r) => sum + (r.spent || 0), 0);
      
      const templateData = {
        actor: originalActor,
        power: power,
        powerRoll: existingPowerRoll,
        strainCost: totalStrainCost,
        isPassive: false,
        consumptions: existingConsumptions,
        processedConsumptions: processedConsumptions
      };
      
      const template = "systems/swnr/templates/chat/power-usage.hbs";
      const newContent = await foundry.applications.handlebars.renderTemplate(template, templateData);
      
      if (chatMsg) {
        await chatMsg.update({ 
          content: newContent,
          flags: { 
            swnr: { 
              consumptions: existingConsumptions,
              processedConsumptions: processedConsumptions
            } 
          }
        });
      }
      
    } catch (error) {
      ui.notifications?.error(`Failed to use consumption: ${error.message}`);
      console.error("Consumption usage error:", error);
    }
  } else if (action === "recover-resource") {
    // Handle resource recovery
    const poolKey = button.dataset.poolKey;
    const amount = parseInt(button.dataset.amount);
    const actorId = button.dataset.actorId;
    
    if (!poolKey || !amount || !actorId) {
      ui.notifications?.error("Missing data for resource recovery");
      return;
    }
    
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for resource recovery");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to modify this actor's resources");
      return;
    }
    
    try {
      const pools = foundry.utils.deepClone(actor.system.pools || {});
      if (pools[poolKey]) {
        const newValue = Math.min(pools[poolKey].value + amount, pools[poolKey].max);
        await actor.update({ [`system.pools.${poolKey}.value`]: newValue });
        
        // Disable the button
        button.disabled = true;
        button.style.opacity = "0.5";
        button.innerHTML = "<i class='fas fa-check'></i> Recovered";
        
        ui.notifications?.info(`Recovered ${amount} ${poolKey}`);
      } else {
        ui.notifications?.error(`Pool ${poolKey} not found on actor`);
      }
    } catch (error) {
      ui.notifications?.error(`Failed to recover resource: ${error.message}`);
      console.error("Resource recovery error:", error);
    }
  } else if (action === "recover-strain") {
    // Handle system strain recovery
    const amount = parseInt(button.dataset.amount);
    const actorId = button.dataset.actorId;
    
    if (!amount || !actorId) {
      ui.notifications?.error("Missing data for strain recovery");
      return;
    }
    
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for strain recovery");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to modify this actor's strain");
      return;
    }
    
    try {
      const currentStrain = actor.system.systemStrain?.value || 0;
      const newStrain = Math.max(currentStrain - amount, 0);
      await actor.update({ "system.systemStrain.value": newStrain });
      
      // Disable the button
      button.disabled = true;
      button.style.opacity = "0.5";
      button.innerHTML = "<i class='fas fa-check'></i> Recovered";
      
      ui.notifications?.info(`Recovered ${amount} system strain`);
    } catch (error) {
      ui.notifications?.error(`Failed to recover strain: ${error.message}`);
      console.error("Strain recovery error:", error);
    }
  } else if (action === "recover-item") {
    // Handle consumable item recovery
    const itemId = button.dataset.itemId;
    const amount = parseInt(button.dataset.amount);
    const actorId = button.dataset.actorId;
    
    if (!itemId || !amount || !actorId) {
      ui.notifications?.error("Missing data for item recovery");
      return;
    }
    
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for item recovery");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to modify this actor's items");
      return;
    }
    
    try {
      const item = actor.items.get(itemId);
      if (!item) {
        ui.notifications?.error("Could not find item for recovery");
        return;
      }
      
      const currentUses = item.system.uses?.value || 0;
      const maxUses = item.system.uses?.max || 0;
      const newUses = Math.min(currentUses + amount, maxUses);
      
      await item.update({ "system.uses.value": newUses });
      
      // Disable the button
      button.disabled = true;
      button.style.opacity = "0.5";
      button.innerHTML = "<i class='fas fa-check'></i> Recovered";
      
      ui.notifications?.info(`Recovered ${amount} uses of ${item.name}`);
    } catch (error) {
      ui.notifications?.error(`Failed to recover item: ${error.message}`);
      console.error("Item recovery error:", error);
    }
  } else if (action === "recover-uses") {
    // Handle power internal uses recovery
    const powerId = button.dataset.powerId;
    const consumptionIndex = parseInt(button.dataset.consumptionIndex);
    const amount = parseInt(button.dataset.amount);
    const actorId = button.dataset.actorId;
    
    if (!powerId || consumptionIndex === undefined || !amount || !actorId) {
      ui.notifications?.error("Missing data for uses recovery");
      return;
    }
    
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for uses recovery");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to modify this actor's powers");
      return;
    }
    
    try {
      const power = actor.items.get(powerId);
      if (!power) {
        ui.notifications?.error("Could not find power for recovery");
        return;
      }
      
      const consumption = power.system.consumptions?.[consumptionIndex];
      if (!consumption || consumption.type !== "uses") {
        ui.notifications?.error("Invalid consumption for uses recovery");
        return;
      }
      
      const currentUses = consumption.uses.value;
      const maxUses = consumption.uses.max;
      const newUses = Math.min(currentUses + amount, maxUses);
      
      await power.update({ [`system.consumptions.${consumptionIndex}.uses.value`]: newUses });
      
      // Disable the button
      button.disabled = true;
      button.style.opacity = "0.5";
      button.innerHTML = "<i class='fas fa-check'></i> Recovered";
      
      ui.notifications?.info(`Recovered ${amount} uses of ${power.name}`);
    } catch (error) {
      ui.notifications?.error(`Failed to recover uses: ${error.message}`);
      console.error("Uses recovery error:", error);
    }
  } else if (action === "releaseCommitment") {
    // Handle manual release of committed effort from chat
    const poolKey = button.dataset.poolKey;
    const powerId = button.dataset.powerId;
    const actorId = button.dataset.actorId;
    
    if (!poolKey || !powerId || !actorId) {
      ui.notifications?.error("Missing data for commitment release");
      return;
    }
    
    const actor = game.actors?.get(actorId);
    if (!actor) {
      ui.notifications?.error("Could not find actor for commitment release");
      return;
    }
    
    // Check if user can control this actor
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn("You do not have permission to modify this actor's commitments");
      return;
    }
    
    try {
      const commitments = actor.system.effortCommitments || {};
      const poolCommitments = commitments[poolKey] || [];
      
      // Find and remove the specific commitment
      const commitmentIndex = poolCommitments.findIndex(c => c.powerId === powerId);
      if (commitmentIndex === -1) {
        ui.notifications?.warn("Could not find commitment to release");
        return;
      }
      
      const releasedCommitment = poolCommitments[commitmentIndex];
      poolCommitments.splice(commitmentIndex, 1);
      
      // Update actor with released commitment
      const newCommitments = { ...commitments };
      newCommitments[poolKey] = poolCommitments;
      
      // Recalculate pool availability
      const pools = actor.system.pools || {};
      const pool = pools[poolKey];
      if (pool) {
        const totalCommitted = poolCommitments.reduce((sum, c) => sum + c.amount, 0);
        const newValue = Math.min(pool.max, pool.value + releasedCommitment.amount);
        
        await actor.update({
          "system.effortCommitments": newCommitments,
          [`system.pools.${poolKey}.value`]: newValue,
          [`system.pools.${poolKey}.committed`]: totalCommitted,
          [`system.pools.${poolKey}.commitments`]: poolCommitments
        });
        
        // Disable the button
        button.disabled = true;
        button.style.opacity = "0.5";
        button.innerHTML = "<i class='fas fa-check'></i> Released";
        
        ui.notifications?.info(`Released ${releasedCommitment.amount} effort from ${releasedCommitment.powerName}`);
      }
    } catch (error) {
      ui.notifications?.error(`Failed to release commitment: ${error.message}`);
      console.error("Commitment release error:", error);
    }
  }
}

export async function welcomeMessage() {
		const template = "systems/swnr/templates/chat/welcome.hbs";

		const content = await renderTemplate(template, {});
		const card = {
			content,
			user: game.user.id,
			whisper: [game.user.id],
			flags: { core: { canPopout: true } },
			speaker: { alias: "wintersleepAI" },
		};
		await ChatMessage.create(card);

}