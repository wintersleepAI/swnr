import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';


export default class SWNShip extends SWNVehicleBase {
  ENGINE_ID = "SPIKE_DRIVE";

  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SWN.Actor.Ship',
  ];

//  TODO leftoff with striping  and need to change html to hbs

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.lifeSupportDays = SWNShared.resourceField(1,1);
    schema.fuel = SWNShared.resourceField(1,1);
    schema.cargo = SWNShared.resourceField(1,1);
    schema.spikeDrive = SWNShared.resourceField(1,1);
    schema.shipClass= SWNShared.stringChoices("fighter", CONFIG.SWN.shipClasses, true);
    schema.shipHullType = SWNShared.stringChoices("freeMerchant", CONFIG.SWN.shipHullTypes, true);
    schema.operatingCost = SWNShared.requiredNumber(1);
    schema.maintenanceCost = SWNShared.requiredNumber(1);
    schema.amountOwed = SWNShared.requiredNumber(0);
    schema.paymentAmount = SWNShared.requiredNumber(0);
    schema.paymentMonths = SWNShared.requiredNumber(0);
    schema.maintenanceMonths = SWNShared.requiredNumber(0);
    schema.creditPool = SWNShared.requiredNumber(0);
    schema.lastMaintenance = SWNShared.date();
    schema.lastPayment = SWNShared.date();
    schema.roles = new fields.SchemaField({
      captain: new fields.DocumentIdField({readonly:false}),
      bridge: new fields.DocumentIdField({readonly:false}),
      engineering: new fields.DocumentIdField({readonly:false}),
      gunner: new fields.DocumentIdField({readonly:false}),
      comms: new fields.DocumentIdField({readonly:false}),
    });
    schema.cargoCarried = new fields.ArrayField(
      new fields.SchemaField({
        name: SWNShared.requiredString("CargoX"),
        value: new fields.NumberField({initial: 0, integer: true}),
        max: new fields.NumberField({initial: 0, integer: true}),
      })
    );
    schema.commandPoints = SWNShared.requiredNumber(0);
    schema.npcCommandPoints = SWNShared.requiredNumber(0);
    schema.crewSkillBonus = SWNShared.requiredNumber(0);
    schema.actionsTaken = new fields.ArrayField(new fields.StringField());
    schema.supportingDept = SWNShared.requiredString("");
    schema.roleOrder = new fields.ArrayField(new fields.StringField());
    return schema;
  }

  prepareDerived() {
  }

  async moveDates(n) {
    if (game.modules?.get("foundryvtt-simple-calendar")?.active) {
      for (let x = 0; x < n; x++) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        SimpleCalendar.api.changeDate({ day: 1 });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const c = SimpleCalendar.api.getCurrentCalendar();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line prettier/prettier
        const entries = SimpleCalendar.api.getNotesForDay(c.currentDate.year, c.currentDate.month, c.currentDate.day);
        if (entries && entries.length > 0) {
          for (const e of entries) {
            if (e.data.content.indexOf("due") >= 0) {
              ui.notifications?.info(`Reminder: ${e.data.content}`);
            }
          }
        }
      }
    }
  }
  
  async setScheduledDate(d, type) {
    if (game.modules?.get("foundryvtt-simple-calendar")?.active) {
      const title = `${type} due`;
      const content = `${type} due for ${this.name}`;
      const simpleDate = {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate() - 1,
        hour: 0,
        minute: 0,
        seconds: 0,
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await SimpleCalendar.api.addNote(
        title,
        content,
        simpleDate,
        simpleDate,
        true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        SimpleCalendar.api.NoteRepeat.Never,
        ["ship"]
      );
    }
  }
  
  async applyDefaulStats(hullType) {
    if (HULL_DATA[hullType]) {
      await this.parent.update(HULL_DATA[hullType]);
    } else {
      console.log("hull type not found " + hullType);
    }
  }
  
  async useDaysOfLifeSupport(nDays) {
    if (this.crew.current > 0) {
      let newLifeDays = this.lifeSupportDays.value;
      newLifeDays -= this.crew.current * nDays;
      await this.parent.update({
        "system.lifeSupportDays.value": newLifeDays,
      });
      if (newLifeDays <= 0) {
        ui.notifications?.error("Out of life support!!!");
      }
    }
  }
  
  async rollSensor(actorName, targetMod, observerMod, skillMod, statMod, dice, rollingAs, rollMode) {
    const template = "systems/swnr/templates/chat/sensor-roll.hbs";
    let mod = observerMod;
    let opposedMod = targetMod;
    let typeDesc = "Observer";
    let otherDesc = "Target";
    if (rollingAs == "target") {
      mod = targetMod;
      opposedMod = observerMod;
      typeDesc = "Target";
      otherDesc = "Observer";
    }
    const rollData = {
      dice,
      skillMod,
      statMod,
      mod,
    };
    const skillRollStr = `${dice} + @skillMod + @statMod + @mod`;
    const skillRoll = new Roll(skillRollStr, rollData);
    await skillRoll.roll({ async: true });
  
    const poolRolls = [skillRoll];
  
    let opposedRoll = null;
    let opposedRollStr = null;
  
    if (rollingAs != "single") {
      opposedRoll = new Roll(`2d6 + @opposedMod`, { opposedMod });
      await opposedRoll.roll({ async: true });
      poolRolls.push(opposedRoll);
      opposedRollStr = await opposedRoll.render();
    }
    const dialogData = {
      skillRoll: await skillRoll.render(),
      skillRollStr,
      opposedRoll: opposedRollStr,
      rollingAs,
      actorName,
      typeDesc,
      otherDesc,
    };
    const diceData = Roll.fromTerms([PoolTerm.fromRolls(poolRolls)]);
    const chatContent = await renderTemplate(template, dialogData);
  
    let gm_ids = ChatMessage.getWhisperRecipients("GM")
      .filter((i) => i)
      .map((i) => i.id)
      .filter((i) => i !== null);
    let blind = false;
  
    if (rollMode == "roll") {
      gm_ids = null;
    } else if (rollMode == "blindroll") {
      blind = true;
    }
    const chatData = {
      speaker: { alias: actorName },
      roll: JSON.stringify(diceData),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      whisper: gm_ids,
      blind,
    };
  
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  }
  
  async rollSpike(pilotId, pilotName, skillMod, statMod, mod, dice, difficulty, travelDays) {
    const template = "systems/swnr/templates/chat/spike-roll.hbs";
    const rollData = {
      dice,
      skillMod,
      statMod,
      mod,
    };
    const skillRollStr = `${dice} + @skillMod + @statMod + @mod`;
    const skillRoll = new Roll(skillRollStr, rollData);
    await skillRoll.roll({ async: true });
  
    const pass =
      skillRoll.total && skillRoll.total >= difficulty ? true : false;
    const failRoll = null;
    let failText = null;
    if (!pass) {
      const failRoll = new Roll("3d6");
      await failRoll.roll({ async: true });
      switch (failRoll.total) {
        case 3:
          // eslint-disable-next-line no-case-declarations
          const fRoll = new Roll("1d6");
          await fRoll.roll({ async: true });
          failText = game.i18n.localize("swnr.chat.spike.fail3");
          failText += `<br> Rolled: ${fRoll.total}`;
          break;
        case 4:
        case 5:
          failText = game.i18n.localize("swnr.chat.spike.fail4-5");
          break;
        case 6:
        case 7:
        case 8:
          failText = game.i18n.localize("swnr.chat.spike.fail6-8");
          break;
        case 9:
        case 10:
        case 11:
        case 12:
          failText = game.i18n.localize("swnr.chat.spike.fail9-12");
          break;
        case 13:
        case 14:
        case 15:
          travelDays = 0;
          failText = game.i18n.localize("swnr.chat.spike.fail13-15");
          break;
        case 16:
        case 17:
          travelDays *= 2;
          failText = game.i18n.localize("swnr.chat.spike.fail16-17");
          break;
        case 18:
          failText = game.i18n.localize("swnr.chat.spike.fail18");
          break;
      }
    }
  
    const dialogData = {
      skillRoll: await skillRoll.render(),
      skillRollStr,
      travelDays,
      pass,
      failRoll,
      failText,
      pilotName,
    };
    const rollMode = game.settings.get("core", "rollMode");
    const poolRolls = [skillRoll];
    if (failRoll) {
      poolRolls.push(failRoll);
    }
    const diceData = Roll.fromTerms([PoolTerm.fromRolls(poolRolls)]);
    const chatContent = await renderTemplate(template, dialogData);
    const chatData = {
      speaker: { alias: pilotName },
      roll: JSON.stringify(diceData),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    };
  
    getDocumentClass("ChatMessage").applyRollMode(chatData, rollMode);
    getDocumentClass("ChatMessage").create(chatData);
  
    this.useDaysOfLifeSupport(travelDays);
    if (travelDays > 0) {
      let fuel = this.fuel.value;
      fuel -= 1;
      await this.parent.update({ "system.fuel.value": fuel });
      if (fuel <= 0) {
        ui.notifications?.info("Out of fuel...");
      }
      this.moveDates(travelDays);
    }
  }
  
  async calcCost(maintenance) {
    const hull = this.shipHullType;
    const shipClass = this.shipClass;
    const shipData = CONFIG.SWN.HullData[hull];
    if (shipData) {
      let baseCost = shipData.system.cost;
      if (baseCost == 0) {
        baseCost = 1;
      }
      let multiplier = 1;
      if (shipClass == "frigate") {
        multiplier = 10;
      } else if (shipClass == "cruiser") {
        multiplier = 25;
      } else if (shipClass == "capital") {
        multiplier = 100;
      }
  
      const shipInventory = this.parent.items.filter(
        (i) =>
          i.type === "shipDefense" ||
          i.type === "shipWeapon" ||
          i.type === "shipFitting"
      );
  
      const shipHasSystemDrive = shipInventory.find(
        (elem) => elem.name == "System Drive"
      );
      if (shipHasSystemDrive) {
        baseCost *= 0.9;
      }

      for (let i = 0; i < shipInventory.length; i++) {
        const item = shipInventory[i];
        const itemCost = item.system.costMultiplier
          ? item.system.cost * multiplier
          : item.system.cost;
        baseCost += itemCost;
      }

      const updateJSON = { cost: baseCost };
      if (maintenance) {
        updateJSON["maintenanceCost"] = baseCost * 0.05;
      }
      await this.parent.update({ system: updateJSON });
    } else {
      ui.notifications?.warn("Hull type not found");
    }
    return null;
  }
  
  async updateFuel() {
    let fuel = this.fuel.value;
    fuel -= 1;
    await this.parent.update({ "system.fuel.value": fuel });
    if (fuel <= 0) {
      ui.notifications?.info("Out of fuel...");
    }
  }
  
  rollCrisis() {
    //TODO localize. Allow for rolls.
    const crisisArray = [
      "<b>Armor Loss:</b><i>(Continuing)</i><br> The hit melted an important patch of ship  armor, cracked an internal support, or exposed a      sensitive system. Until resolved, the ship’s Armor      rating is halved, rounded down.",
      "<b>Cargo Loss:</b><i>(Acute)</i><br> The hit has gored open a cargo bay, threatening to dump the hold or expose delicate contents to ruinous damage. If not resolved by the end of the next round, lose d10*10% of the ship’s cargo.",
      "<b>Crew Lost:</b><i>(Acute)</i><br> Brave crew risk their lives to keep damaged systems operating. Describe the danger they face. If the Crisis is not resolved by the end of the next round, 10% of the ship’s maximum crew are incapacitated, not counting any Extended Life Support fittings. Half these crewmen are dead or permanently disabled, and the other half return to duty in a week. Extended Medbay fittings halve the number of dead and crippled. If the ship has run out of NPC crew when it takes this Crisis, a random PC must roll a Physical save; on a success, they lose half their hit points, while on a failure, they are mortally wounded. If not stabilized by the end of the ship’s turn through some PC taking a Deal With A Crisis action to heal them, they will die.",
      "<b>Engine Lock:</b><i>(Continuing)</i><br> The ship’s engine has been jammed or control circuits have gone non-responsive. Until resolved, no bridge actions can be taken, though the pilot can still perform general actions.",
      "<b>Fuel Bleed:</b><i>(Acute)</i><br> The ship’s fuel tanks have been holed or emergency vents have been force-triggered by battle damage. If not resolved by the end of the next round, the ship will jettison all fuel except the minimal amount needed for in-system operation.",
      "<b>Haywire Systems:</b><i>(Continuing)</i><br> Critical command links have been damaged or disordered by the hit. Until resolved, the ship starts each round at -2 Command Points. Multiple such Crises can stack this penalty, crippling a ship until the Crises are resolved.",
      "<b>Hull Breach:</b><i>(Acute)</i><br> The hull has been damaged in a way that is currently non-critical but is about to tear open an important compartment or crumple on vital systems. If not resolved by the end of the next round, the ship will take damage: 1d10 for fighter-class hulls, 2d10 for frigates, 3d10 for cruisers, and 4d10 for capital hulls, all ignoring Armor.",
      "<b>System Damage:</b><i>(Continuing)</i><br> One of the ship’s systems has been cooked by the hit. The GM randomly picks a weapon, fitting, or engine; that system is disabled as if hit with a targeted shot, with drives suffering a 1 point drive level decrease. Disabled systems hit by this Crisis or drives reduced below drive-0 are destroyed and cannot be repaired during combat.",
      "<b>Target Decalibration:</b><i>(Continuing)</i><br> The gunnery computers are hopelessly confused and cannot lock the ship’s weaponry on a target until this Crisis is resolved.",
      "<b>VIP Imperiled:</b><i>(Acute)</i><br> Shipboard damage threatens a random PC or important NPC. That victim must immediately roll a Physical saving throw; on a success, they lose half their hit points, and on a failure they are mortally wounded. NPC crew can make a free attempt to stabilize the downed VIP using their usual NPC skill bonus. If the NPC fails, and no PC takes a Deal With a Crisis action to successfully stabilize them by the end of the ship’s turn, they die.",
    ];
    const coin = this._getRandomInt(crisisArray.length);
    const content = `<h3>Crisis</h3>${crisisArray[coin]}<br><i>10 base difficulty check</i>`;
    const chatData = {
      content: content,
    };
    ChatMessage.create(chatData);
  }

  _getRandomInt(exclusiveMax) {
    return Math.floor(Math.random() * exclusiveMax);
  }

  async _breakItem(
    id,
    forceDestroy
  ) {
    //console.log("breaking ", id);
    if (!id || id == "") {
      //console.log("Nothing to break");
      throw new TypeError();
    }
    if (id == this.ENGINE_ID) {
      let curSpike = this.spikeDrive.value;
      if (forceDestroy) {
        curSpike = 0;
      } else {
        curSpike -= 1;
      }
      await this.parent.update({ "system.spikeDrive.value": curSpike });
      if (curSpike == 0) {
        return [null, "Engine Destroyed"];
      } else {
        return [null, "Engine Damaged"];
      }
    } else {
      const item = this.getEmbeddedDocument("Item", id);
      //console.log(item);
      if (
        forceDestroy ||
        item?.system.broken ||
        item?.system.juryRigged
      ) {
        let msg = `${item.name} Destroyed`;
        if (item?.system.juryRigged) {
          msg += " (item was jury-rigged)";
        }
        const eitem = {
          _id: id,
          data: { destroyed: true, broken: false, juryRigged: false },
        };
        return [eitem, msg];
      } else {
        const msg = `${item.name} Disabled`;
        const eitem = {
          _id: id,
          data: { destroyed: false, broken: true, juryRigged: false },
        };
        return [eitem, msg];
      }
    }
  }

  async rollSystemFailure(
    sysToInclude,
    whatToRoll
  ) {
    const candidateIds = [];
    let idx = sysToInclude.indexOf("drive");
    if (idx > -1) {
      if (this.spikeDrive.value > 0) {
        candidateIds.push(this.ENGINE_ID);
      }
      sysToInclude.splice(idx, 1);
    }
    //Get wpns if marked
    idx = sysToInclude.indexOf("wpn");
    if (idx > -1) {
      const shipWeapons = this.parent.items.filter((i) => i.type === "shipWeapon");
      for (const i of shipWeapons) {
        if (i.id && !i.system["destroyed"]) {
          candidateIds.push(i.id);
        }
      }
      sysToInclude.splice(idx, 1);
    }
    //Get def if marked
    idx = sysToInclude.indexOf("def");    
    if (idx > -1) {
      const shipDefenses = this.parent.items.filter((i) => i.type === "shipDefense");
      for (const i of shipDefenses) {
        if (i.id && !i.system["destroyed"]) {
          candidateIds.push(i.id);
        }
      }
      sysToInclude.splice(idx, 1);
    }
    //Get fit if marked
    idx = sysToInclude.indexOf("fit");
    if (idx > -1) {
      const shipFittings = this.parent.items.filter((i) => i.type === "shipFitting");

      for (const i of shipFittings) {
        if (i.id && !i.system["destroyed"]) {
          candidateIds.push(i.id);
        }
      }
      sysToInclude.splice(idx, 1);
    }
    // Should be nothing left
    if (sysToInclude.length > 0) {
      ui.notifications?.error("Sys to fail not evaluated: " + sysToInclude);
    }
    const msg = [];
    const eitems = [];
    if (whatToRoll == "dest-all") {
      for (const itemId of candidateIds) {
        const [eitem, m] = await this._breakItem(itemId, true);
        msg.push(m);
        if (eitem) {
          eitems.push(eitem);
        }
      }
    } else if (whatToRoll == "break-all") {
      for (const itemId of candidateIds) {
        const [eitem, m] = await this._breakItem(itemId, false);
        msg.push(m);
        if (eitem) {
          eitems.push(eitem);
        }
      }
    } else if (whatToRoll == "all-50") {
      for (const itemId of candidateIds) {
        const coin = this._getRandomInt(2);
        if (coin == 0) {
          const [eitem, m] = await this._breakItem(itemId, false);
          msg.push(m);
          if (eitem) {
            eitems.push(eitem);
          }
        }
      }
    } else if (whatToRoll == "break-1") {
      if (candidateIds.length > 0) {
        const coin = this._getRandomInt(candidateIds.length);
        const [eitem, m] = await this._breakItem(candidateIds[coin], false);
        msg.push(m);
        if (eitem) {
          eitems.push(eitem);
        }
      }
    } else {
      ui.notifications?.error(
        "Sys to fail not evaluated. What to include " + whatToRoll
      );
      return;
    }
    msg.filter((i) => i != "");
    let content = "<h3>Nothing to fail</h3>";
    if (msg.length > 0) {
      if (eitems.length > 0) {
        await this.parent.updateEmbeddedDocuments("Item", eitems);
      }
      content = "<h3>Systems Failure:</h3>";
      for (let i = 0; i < msg.length; i++) {
        if (msg[i]) {
          content += `<p>${msg[i]}</p>`;
        }
      }
    }
    const chatData = {
      content: content,
    };
    ChatMessage.create(chatData);
  }

}
