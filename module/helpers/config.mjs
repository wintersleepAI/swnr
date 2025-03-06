export const SWN = {};

/**
 * The set of Stat Scores used within the system.
 * @type {Object}
 */
SWN.stats = {
  str: 'SWN.Stat.Str.long',
  dex: 'SWN.Stat.Dex.long',
  con: 'SWN.Stat.Con.long',
  int: 'SWN.Stat.Int.long',
  wis: 'SWN.Stat.Wis.long',
  cha: 'SWN.Stat.Cha.long',
};

SWN.statAbbreviations = {
  str: 'SWN.Stat.Str.abbr',
  dex: 'SWN.Stat.Dex.abbr',
  con: 'SWN.Stat.Con.abbr',
  int: 'SWN.Stat.Int.abbr',
  wis: 'SWN.Stat.Wis.abbr',
  cha: 'SWN.Stat.Cha.abbr',
};

SWN.maxTL = 6;

SWN.maxPowerLevel = 5;

SWN.itemLocations = {
  readied: 'swnr.item.locationReadied', 
  stowed: 'swnr.item.locationStowed', 
  other : 'swnr.item.locationOther',
}

SWN.itemQualities = {
  stock: 'swnr.item.quality.stock',
  makeshift: 'swnr.item.quality.juryRigged',
  masterwork: 'swnr.item.quality.mastercrafted',
}

SWN.ammoTypes = {
  none: 'swnr.ammo.none',
  typeAPower: 'swnr.ammo.typeAPower',
  typeBPower: 'swnr.ammo.typeBPower',
  ammo: 'swnr.ammo.ammo',
  missile: 'swnr.ammo.missile',
  special: 'swnr.ammo.special',
  infinite: 'swnr.ammo.infinite',
};

SWN.programTypes = {
  verb: 'swnr.sheet.program.verb',
  subject: 'swnr.sheet.program.subject',
  dataFile: 'swnr.sheet.program.dataFile',
  running: 'swnr.sheet.program.running'
}

SWN.saveTypes = {
  physical: 'swnr.sheet.saves.physical',
  mental: 'swnr.sheet.saves.mental',
  evasion: 'swnr.sheet.saves.evasion',
  luck: 'swnr.sheet.saves.luck',
}

SWN.effortDurationTypes = {
  scene: 'swnr.effort.scene',
  day: 'swnr.effort.day',
  current: 'swnr.effort.current',
}

SWN.cyberTypes = {
  head: 'swnr.sheet.cyberware.types.head',
  body: 'swnr.sheet.cyberware.types.body',
  skin: 'swnr.sheet.cyberware.types.skin',
  limb: 'swnr.sheet.cyberware.types.limb',
  nerve: 'swnr.sheet.cyberware.types.nerve',
  sensory: 'swnr.sheet.cyberware.types.sensory',
  medical: 'swnr.sheet.cyberware.types.medical',
  none: 'swnr.sheet.cyberware.types.none'
}

SWN.cyberConcealmentTypes = {
  sight: 'swnr.sheet.cyberware.conc.sight',
  touch: 'swnr.sheet.cyberware.conc.touch',
  medical: 'swnr.sheet.cyberware.conc.medical',
}

SWN.armorTypes = {
  street: 'swnr.armor.type.street',
  combat: 'swnr.armor.type.combat',
  powered: 'swnr.armor.type.powered',
  primitive: 'swnr.armor.type.primitive',
}

SWN.reactionTypes = {
  unknown: 'swnr.npc.reaction.unknown',
  hostile: 'swnr.npc.reaction.hostile',
  negative: 'swnr.npc.reaction.negative',
  neutral: 'swnr.npc.reaction.neutral',
  positive: 'swnr.npc.reaction.positive',
  friendly: 'swnr.npc.reaction.friendly',
}

SWN.vehicleTypes = {
  ship: 'TYPES.Actor.ship',
  vehicle: 'TYPES.Actor.vehicle',
  drone: 'TYPES.Actor.drone',
  mech: 'TYPES.Actor.mech',
}

SWN.mechClasses = {
  suit: 'swnr.sheet.mech.mechClass.suit',
  light: 'swnr.sheet.mech.mechClass.light',
  heavy: 'swnr.sheet.mech.mechClass.heavy',
}

SWN.shipClasses = {
  fighter: 'swnr.sheet.ship.shipClass.fighter',
  frigate: 'swnr.sheet.ship.shipClass.frigate',
  cruiser: 'swnr.sheet.ship.shipClass.cruiser',
  capital: 'swnr.sheet.ship.shipClass.capital',
}

SWN.vehicleClasses = {
  s: 'swnr.sheet.vehicle.vehicle-class.s',
  m: 'swnr.sheet.vehicle.vehicle-class.m',
  l: 'swnr.sheet.vehicle.vehicle-class.l',
}

SWN.allVehicleClasses = {
  ...SWN.mechClasses,
  ...SWN.shipClasses,
  ...SWN.vehicleClasses
};

SWN.shipHullTypes = {
  strikeFighter: 'swnr.sheet.ship.shipHullType.strikeFighter',
  shuttle: 'swnr.sheet.ship.shipHullType.shuttle',
  freeMerchant: 'swnr.sheet.ship.shipHullType.freeMerchant',
  patrolBoat: 'swnr.sheet.ship.shipHullType.patrolBoat',
  corvette: 'swnr.sheet.ship.shipHullType.corvette',
  heavyFrigate: 'swnr.sheet.ship.shipHullType.heavyFrigate',
  bulkFreighter: 'swnr.sheet.ship.shipHullType.bulkFreighter',
  fleetCruiser: 'swnr.sheet.ship.shipHullType.fleetCruiser',
  battleship: 'swnr.sheet.ship.shipHullType.battleship',
  carrier: 'swnr.sheet.ship.shipHullType.carrier',
  smallStation: 'swnr.sheet.ship.shipHullType.smallStation',
  largeStation: 'swnr.sheet.ship.shipHullType.largeStation'
}

SWN.skills = {
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

SWN.assetCategories = {
  force: 'swnr.sheet.faction.assetCategories.force',
  cunning: 'swnr.sheet.faction.assetCategories.cunning',
  wealth: 'swnr.sheet.faction.assetCategories.wealth',
}

SWN.pool = {
  "2d6": "2D6",
  "3d6kh2": "3D6",
  "4d6kh2": "4D6"
}

SWN.featureTypes = {
  focus: 'swnr.featureTypes.focus',
  edge: 'swnr.featureTypes.edge',
  feature: 'swnr.featureTypes.feature'
}

SWN.itemIconPath = "systems/swnr/assets/icons/game-icons.net/item-icons";
SWN.actorIconPath = "systems/swnr/assets/icons";

SWN.defaultImg = {
  shipWeapon: "sinusoidal-beam.svg",
  shipDefense: "bubble-field.svg",
  shipFitting: "power-generator.svg",
  cyberware: "cyber-eye.svg",
  focus: "reticule.svg",
  feature: "reticule.svg",
  armor: "armor-white.svg",
  weapon: "weapon-white.svg",
  power: "psychic-waves-white.svg",
  skill: "book-white.svg",
  edge: "edge.svg",
  program: "program.svg",
  drone: "drone.png",
  vehicle: "vehicle.png",
  ship: "spaceship.png",
  mech: "mech.png",
  cyberdeck: "cyberdeck.png",
  faction: "faction.png",
};

SWN.shipActions = {
  startRound: {
    title: "Start the Round (order departments)",
    cp: 0,
    desc: "",
    dept: "",
  },
  endRound: {
    title: "End the Round",
    cp: 0,
    desc: "",
    dept: "",
  },
  aboveAndBeyond: {
    title: "Above and Beyond",
    cp: 0,
    desc:
      "Push yourself to help the ship or its crew. Pick an attribute and skill check and  explain how you’re using it to help the ship. If the GM agrees, roll it against difficulty 9. On a success, gain your skill level in Command Points plus one. On a failure, take -1 Command Point.",
    dept: "",
    note:
      "Roll attr/skill vs 9. Success manually give +CP = skill level+1. Fail -1 CP.",
  },
  dealCrisis: {
    title: "Deal With a Crisis",
    cp: 0,
    desc:
      "Explain what you are doing to solve a Crisis and roll the relevant skill check. The difficulty is usually 10, plus or minus 2 de- pending on the situation and the effectiveness of your action. On a success, the Crisis is resolved.  You may also use this action to aid another PC in resolving a Crisis, or to take one scene’s worth of other actions around the ship.",
    dept: "",
    note:
      "Roll attr/skill vs 10 +/- 2. Success crisis resolved or aid PC resolving crisis.",
  },
  doYourDuty: {
    title: "Do Your Duty",
    cp: 1,
    desc:
      "The ship gains 1 Command Point. PCs who head more than one department can act only in one of them; the rest automatically take  this action. If invoked by a PC, they must name  some plausible act the PC is doing to be useful, and can’t do the same act two rounds in a row.",
    dept: "",
    note: "Name plausible way helping. Cannot do same act two rounds in a row.",
  },
  escape: {
    title: "Escape Combat",
    cp: -4,
    desc:
      "Roll an opposed Int/Pilot or Dex/Pilot skill check plus your ship’s Speed against the  fastest  opponent’s  skill  check  plus  their  ship’s   Speed. On a win, all enemy ships gain one point  of Escape. If an enemy ship gets three points, after  three uses of this maneuver, your ship gets away  from that ship and is no longer in combat with it.",
    dept: "bridge",
    skill: "Pilot",
    attr: ["int", "dex"],
    dc: "opposed",
  },
  evasive: {
    title: "Evasive Manuevers",
    cp: -2,
    desc:
      "Roll Int or Dex/Pilot against  difficulty 9 to add your Pilot skill to the ship’s AC  until its next turn.  Usable once per round at most.",
    dept: "bridge",
    skill: "Pilot",
    attr: ["int", "dex"],
    dc: 9,
    limit: "round",
  },
  pursue: {
    title: "Pursue Target",
    cp: -3,
    desc:
      "Opposed Int/Pilot or Dex/Pilot  skill check plus Speed against the target ship’s skill  check plus Speed. On a win, you shed one point  of Escape rating the target ship may have on you.",
    dept: "bridge",
    skill: "Pilot",
    attr: ["int", "dex"],
    dc: "opposed",
  },
  intoFire: {
    title: "Into the Fire",
    cp: 0,
    desc:
      "Accept a Crew Lost Crisis and gain your Lead skill plus one in Command Points. You may do this at most once per round.",
    note: "Accept Crew Lost Crisis and add lead skill to CP manually",
    dept: "captain",
    limit: "round",
  },
  keepTogether: {
    title: "Keep it Together",
    cp: 0,
    desc:
      "Nullify a successful enemy hit   and roll a Crisis instead. You can use this action   in Instant response to an enemy hit but you may only use it once per round.",
    note: "Nullify hit as Instant. Roll Crisis",
    dept: "captain",
    limit: "round",
  },
  supportDept: {
    title: "Support Department",
    cp: 0,
    desc:
      "Choose a department. One action that department takes will require 2 fewer Command Points. You can do this once per round.",
    note: "One action for chosen dept. takes 2 fewer CP. Once per round.",
    dept: "captain",
    limit: "round",
  },
  crashSys: {
    title: "Crash Systems",
    cp: -2,
    desc:
      " Roll an opposed Int/Program  check against a targeted ship. On a success, it starts its next turn with a Command Point penalty equal to your Program skill.",
    note: "On success, enemy starts next turn with -CP = Program Skill",
    dept: "comms",
    skill: "Program",
    attr: ["int"],
    dc: "opposed",
  },
  defeatECM: {
    title: "Defeat ECM",
    cp: -2,
    desc:
      "Roll an opposed Int/Program against a targeted ship. On a success, any attacks this round by your ship against the target get a hit bonus equal to twice your Program skill",
    note:
      "On success, attacks by your ship this round against targe +hit = 2x Program Skill",
    dept: "comms",
    skill: "Program",
    attr: ["int"],
    dc: "opposed",
  },
  sensorGhost: {
    title: "Sensor Ghost",
    cp: -2,
    desc:
      "Succeed on a difficulty 9 Int/Pro- gram check to gain your Program as an AC bonus until the next turn. Usable once per round at most.",
    note: "On success, AC bonus = Program Skill until next turn.",
    dept: "comms",
    skill: "Program",
    limit: "round",
    attr: ["int"],
    dc: 9,
  },
  boostEngine: {
    title: "Boost Engines",
    cp: -2,
    desc:
      " Roll Int/Fix versus difficulty 8. On a success, the ship’s Speed is increased by 2 until the start of the ship’s next turn.",
    note: "On success, speed +2 until next turn",
    dept: "engineering",
    skill: "Fix",
    attr: ["int"],
    dc: 8,
  },
  damageControl: {
    title: "Damage Control",
    cp: -3,
    desc:
      " Roll Int/Fix versus difficulty  7. On a success, repair a number of lost hit points equal to your Fix skill times 2 for fighter hulls, 3 for frigates, 4 for cruisers, and 6 for capital-class hulls. Each attempt of this action after the first in a fight increases its difficulty by a cumulative +1.",
    note:
      "On success, repair (2/3/4/6) * Fix Skill (ship class based). +1 difficulty each time in fight",
    dept: "engineering",
    skill: "Fix",
    attr: ["int"],
    dc: 7,
  },
  emergencyRepair: {
    title: "Emergency Repairs",
    cp: -3,
    desc:
      " Roll Int/Fix versus difficulty 8. On a success, a disabled system is repaired or  a damage-degraded drive has its rating increased by 1. Destroyed systems cannot be fixed this way.",
    note:
      "On success, manually repair disabled system or degraded engine +1. Destroyed systems not eligible.",
    dept: "engineering",
    skill: "Fix",
    attr: ["int"],
    dc: 8,
  },
  fireAll: {
    title: "Fire All Guns",
    cp: -3,
    desc:
      "Gunners fire all weapons mounted on the ship, designating targets as they wish.",
    note: "Gunners fire all",
    dept: "gunnery",
  },
  fireOne: {
    title: "Fire One Weapon",
    cp: -2,
    desc: "A gunner fires a single ship’s weapon of their choice.",
    note: "A gunners fires one",
    dept: "gunnery",
  },
  targetSystem: {
    title: "Target Systems",
    cp: -1,
    desc:
      "A Fire One Weapon action you  take this round may target a ship’s weapons, en- gine, or fittings the GM decides are vulnerable.  Such targeted attacks take -4 to hit. On a hit, do half damage before applying Armor. If damage  gets through the system is disabled or drive is  degraded by 1 level. Disabled systems hit again  are destroyed. You may take this action more than once to aim additional shots you may fire.",
    note:
      "'Fire One Weapon' can target fitting, weapon, or engine with -4 hit. (Half damage - armor) > 0 to work.",
    dept: "gunnery",
  },
};

SWN.DroneModelsData = {
  primitiveDrone: {
    system: {
      cost: 250,
      fittings: {
        max: 1,
      },
      ac: 12,
      enc: 2,
      health: {
        value: 1,
        max: 1,
      },
      range: "500m",
      tl: 3,
    },
  },
  voidHawk: {
    system: {
      cost: 5000,
      fittings: {
        max: 4,
      },
      ac: 14,
      enc: 6,
      health: {
        value: 15,
        max: 15,
      },
      range: "100km",
      tl: 4,
    },
  },
  stalker: {
    system: {
      cost: 1000,
      fittings: {
        max: 3,
      },
      ac: 13,
      enc: 2,
      health: {
        value: 5,
        max: 5,
      },
      range: "2km",
      tl: 4,
    },
  },
  cuttlefish: {
    system: {
      cost: 2000,
      fittings: {
        max: 5,
      },
      ac: 13,
      enc: 2,
      health: {
        value: 10,
        max: 10,
      },
      range: "1km",
      tl: 4,
    },
  },
  ghostwalker: {
    system: {
      cost: 3000,
      fittings: {
        max: 2,
      },
      ac: 15,
      enc: 3,
      health: {
        value: 1,
        max: 1,
      },
      range: "5km",
      tl: 4,
    },
  },
  sleeper: {
    system: {
      cost: 2500,
      fittings: {
        max: 4,
      },
      ac: 12,
      enc: 2,
      health: {
        value: 8,
        max: 8,
      },
      range: "100km",
      tl: 4,
    },
  },
  pax: {
    system: {
      cost: 10000,
      fittings: {
        max: 4,
      },
      ac: 16,
      enc: 4,
      health: {
        value: 20,
        max: 20,
      },
      range: "100km",
      tl: 5,
    },
  },
  alecto: {
    system: {
      cost: 50000,
      fittings: {
        max: 4,
      },
      ac: 18,
      enc: 4,
      health: {
        value: 30,
        max: 30,
      },
      range: "5000km",
      tl: 5,
    },
  },
};

SWN.HullData = {
  strikeFighter: {
    system: {
      shipClass: "fighter",
      health: {
        value: 8,
        max: 8,
      },
      ac: 16,
      armor: { value: 5, max: 5 },
      mass: {
        value: 2,
        max: 2,
      },
      power: {
        value: 5,
        max: 5,
      },
      hardpoints: {
        value: 1,
        max: 1,
      },
      crew: {
        min: 1,
        max: 1,
        current: 0,
      },
      lifeSupportDays: {
        value: 60,
        max: 60,
      },
      speed: 5,
      cost: 200000,
    },
  },
  shuttle: {
    system: {
      shipClass: "fighter",
      health: {
        value: 15,
        max: 15,
      },
      ac: 11,
      armor: { value: 0, max: 0 },
      mass: {
        value: 5,
        max: 5,
      },
      power: {
        value: 3,
        max: 3,
      },
      hardpoints: {
        value: 1,
        max: 1,
      },
      crew: {
        min: 1,
        max: 10,
        current: 0,
      },
      lifeSupportDays: {
        value: 600,
        max: 600,
      },
      speed: 3,
      cost: 200000,
    },
  },
  freeMerchant: {
    system: {
      shipClass: "frigate",
      health: {
        value: 20,
        max: 20,
      },
      ac: 14,
      armor: { value: 2, max: 2 },
      mass: {
        value: 15,
        max: 15,
      },
      power: {
        value: 10,
        max: 10,
      },
      hardpoints: {
        value: 2,
        max: 2,
      },
      crew: {
        min: 1,
        max: 6,
        current: 0,
      },
      lifeSupportDays: {
        value: 360,
        max: 360,
      },
      speed: 3,
      cost: 500000,
    },
  },
  patrolBoat: {
    system: {
      shipClass: "frigate",
      health: {
        value: 25,
        max: 25,
      },
      ac: 14,
      armor: { value: 5, max: 5 },
      mass: {
        value: 10,
        max: 10,
      },
      power: {
        value: 15,
        max: 15,
      },
      hardpoints: {
        value: 4,
        max: 4,
      },
      crew: {
        min: 5,
        max: 20,
        current: 0,
      },
      lifeSupportDays: {
        value: 1200,
        max: 1200,
      },
      speed: 4,
      cost: 2500000,
    },
  },
  corvette: {
    system: {
      shipClass: "frigate",
      health: {
        value: 40,
        max: 40,
      },
      ac: 13,
      armor: { value: 10, max: 10 },
      mass: {
        value: 15,
        max: 15,
      },
      power: {
        value: 15,
        max: 15,
      },
      hardpoints: {
        value: 6,
        max: 6,
      },
      crew: {
        min: 10,
        max: 40,
        current: 0,
      },
      lifeSupportDays: {
        value: 2400,
        max: 2400,
      },
      speed: 0,
      cost: 4000000,
    },
  },
  heavyFrigate: {
    system: {
      shipClass: "frigate",
      health: {
        value: 50,
        max: 50,
      },
      ac: 15,
      armor: { value: 10, max: 10 },
      mass: {
        value: 20,
        max: 20,
      },
      power: {
        value: 25,
        max: 25,
      },
      hardpoints: {
        value: 8,
        max: 8,
      },
      crew: {
        min: 30,
        max: 120,
        current: 0,
      },
      lifeSupportDays: {
        value: 73200,
        max: 73200,
      },
      speed: 1,
      cost: 7000000,
    },
  },
  bulkFreighter: {
    system: {
      shipClass: "cruiser",
      health: {
        value: 40,
        max: 40,
      },
      ac: 11,
      armor: { value: 0, max: 0 },
      mass: {
        value: 25,
        max: 25,
      },
      power: {
        value: 15,
        max: 15,
      },
      hardpoints: {
        value: 2,
        max: 2,
      },
      crew: {
        min: 10,
        max: 40,
        current: 0,
      },
      lifeSupportDays: {
        value: 2400,
        max: 2400,
      },
      speed: 0,
      cost: 5000000,
    },
  },
  fleetCruiser: {
    system: {
      shipClass: "cruiser",
      health: {
        value: 60,
        max: 60,
      },
      ac: 14,
      armor: { value: 15, max: 15 },
      mass: {
        value: 30,
        max: 30,
      },
      power: {
        value: 50,
        max: 50,
      },
      hardpoints: {
        value: 10,
        max: 10,
      },
      crew: {
        min: 50,
        max: 200,
        current: 0,
      },
      lifeSupportDays: {
        value: 12000,
        max: 12000,
      },
      speed: 1,
      cost: 10000000,
    },
  },
  battleship: {
    system: {
      shipClass: "capital",
      health: {
        value: 100,
        max: 100,
      },
      ac: 16,
      armor: { value: 20, max: 20 },
      mass: {
        value: 50,
        max: 50,
      },
      power: {
        value: 75,
        max: 75,
      },
      hardpoints: {
        value: 15,
        max: 15,
      },
      crew: {
        min: 200,
        max: 1000,
        current: 0,
      },
      lifeSupportDays: {
        value: 60000,
        max: 60000,
      },
      speed: 0,
      cost: 50000000,
    },
  },
  carrier: {
    system: {
      shipClass: "capital",
      health: {
        value: 75,
        max: 75,
      },
      ac: 14,
      armor: { value: 10, max: 10 },
      mass: {
        value: 100,
        max: 100,
      },
      power: {
        value: 50,
        max: 50,
      },
      hardpoints: {
        value: 4,
        max: 4,
      },
      crew: {
        min: 300,
        max: 1500,
        current: 0,
      },
      lifeSupportDays: {
        value: 90000,
        max: 90000,
      },
      speed: 0,
      cost: 60000000,
    },
  },
  smallStation: {
    system: {
      shipClass: "cruiser",
      health: {
        value: 120,
        max: 120,
      },
      ac: 11,
      armor: { value: 5, max: 5 },
      mass: {
        value: 40,
        max: 40,
      },
      power: {
        value: 50,
        max: 50,
      },
      hardpoints: {
        value: 10,
        max: 10,
      },
      crew: {
        min: 20,
        max: 200,
        current: 0,
      },
      lifeSupportDays: {
        value: 12000,
        max: 12000,
      },
      speed: 0,
      cost: 5000000,
    },
  },
  largeStation: {
    system: {
      shipClass: "capital",
      health: {
        value: 120,
        max: 120,
      },
      ac: 17,
      armor: { value: 20, max: 20 },
      mass: {
        value: 75,
        max: 75,
      },
      power: {
        value: 125,
        max: 125,
      },
      hardpoints: {
        value: 30,
        max: 30,
      },
      crew: {
        min: 100,
        max: 1000,
        current: 0,
      },
      lifeSupportDays: {
        value: 60000,
        max: 60000,
      },
      speed: 0,
      cost: 40000000,
    },
  },
};