import SWNVehicleBase from './base-vehicle.mjs';
import SWNShared from '../shared.mjs';


export default class SWNShip extends SWNVehicleBase {
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
    // schema.shipClass = TODO();
    // schema.shipHullType = TODO();
    schema.operatingCost = SWNShared.requiredNumber(1);
    schema.maintenanceCost = SWNShared.requiredNumber(1);
    schema.amountOwed = SWNShared.requiredNumber(0);
    schema.paymentAmount = SWNShared.requiredNumber(0);
    schema.paymentMonths = SWNShared.requiredNumber(0);
    schema.maintenanceMonths = SWNShared.requiredNumber(0);
    schema.creditPool = SWNShared.requiredNumber(0);
    schema.lastMaintenance = SWNShared.date();
    schema.lastPayment = SWNShared.date();
    // schema.roles = TODO; // Check with WWN overlap
    // schema.cargoCarried = TODO;
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
      await this.update(HULL_DATA[hullType]);
    } else {
      console.log("hull type not found " + hullType);
    }
  }
  
  async useDaysOfLifeSupport(nDays) {
    if (this.system.crew.current > 0) {
      let newLifeDays = this.system.lifeSupportDays.value;
      newLifeDays -= this.system.crew.current * nDays;
      await this.update({
        "system.lifeSupportDays.value": newLifeDays,
      });
      if (newLifeDays <= 0) {
        ui.notifications?.error("Out of life support!!!");
      }
    }
  }
  
  async rollSensor(actorName, targetMod, observerMod, skillMod, statMod, dice, rollingAs, rollMode) {
    const template = "systems/swnr/templates/chat/sensor-roll.html";
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
    const template = "systems/swnr/templates/chat/spike-roll.html";
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
      let fuel = this.system.fuel.value;
      fuel -= 1;
      await this.update({ "system.fuel.value": fuel });
      if (fuel <= 0) {
        ui.notifications?.info("Out of fuel...");
      }
      this.moveDates(travelDays);
    }
  }
  
  async calcCost(maintenance) {
    const hull = this.system.shipHullType;
    const shipClass = this.system.shipClass;
    this.system.maintenanceCost;
    const shipData = HULL_DATA[hull];
    if (shipData) {
      let baseCost = shipsystem.cost;
      let multiplier = 1;
      if (shipClass == "frigate") {
        multiplier = 10;
      } else if (shipClass == "cruiser") {
        multiplier = 25;
      } else if (shipClass == "capital") {
        multiplier = 100;
      }
  
      const shipInventory = this.items.filter(
        (i) =>
          i.type === "shipDefense" ||
          i.type === "shipWeapon" ||
          i.type === "shipFitting"
      );
  
      const shipHasSystemDrive = shipInventory.find(
        (elem) => elem.name == "System Drive"
      );
      let systemDriveMultiplier = shipHasSystemDrive ? 1 : 0.5;
  
      let totalMaintenanceCost = baseCost * multiplier * systemDriveMultiplier;
      totalMaintenanceCost += maintenance;
  
      return totalMaintenanceCost;
    }
    return null;
  }
  
  async updateFuel() {
    let fuel = this.system.fuel.value;
    fuel -= 1;
    await this.update({ "system.fuel.value": fuel });
    if (fuel <= 0) {
      ui.notifications?.info("Out of fuel...");
    }
  }
  
}
