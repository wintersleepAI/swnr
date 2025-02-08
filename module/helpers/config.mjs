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
  ship: 'SWN.TYPES.Actor.starship',
  vehicle: 'SWN.TYPES.Actor.vehicle',
  drone: 'SWN.TYPES.Actor.drone',
  mech: 'SWN.TYPES.Actor.mech',
}

SWN.mechClasses = {
  suit: 'swnr.mech.mechClass.suit',
  light: 'swnr.mech.mechClass.light',
  heavy: 'swnr.mech.mechClass.heavy',
}

SWN.shipClasses = {
  fighter: 'swnr.ship.shipClass.fighter',
  frigate: 'swnr.ship.shipClass.frigate',
  cruiser: 'swnr.ship.shipClass.cruiser',
  capital: 'swnr.ship.shipClass.capital',
}

SWN.vehicleClasses = {
  s: 'swnr.vehicle.vehicle-class.s',
  m: 'swnr.vehicle.vehicle-class.m',
  l: 'swnr.vehicle.vehicle-class.l',
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