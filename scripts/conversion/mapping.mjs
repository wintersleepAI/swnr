const item = {
  description: '',
  favorite: false,
  quantity: 1,
  bundle: {
    bundled: false,
    amount: undefined
  },
  encumbrance: 1,
  cost: 0,
  tl: undefined,
  location: 'stowed',
  quality: 'stock',
  noEncReadied: false,
  roll: {
    diceNum: 1,
    diceSize: 'd20',
    diceBonus: '+@str.mod+ceil(@lvl / 2)'
  }
}

const armor = {
  description: '',
  favorite: false,
  quantity: 1,
  bundle: {
    bundled: false,
    amount: null
  },
  encumbrance: 1,
  cost: 0,
  tl: null,
  location: 'stowed',
  quality: 'stock',
  noEncReadied: false,
  ac: 10,
  shield: false,
  use: false,
  meleeAc: null,
  soak: {
    value: 0,
    max: 0
  },
  dr: 0,
  traumaDiePenalty: 0,
  isSubtle: false,
  isHeavy: false,
  shieldMeleeACBonus: null,
  shieldACBonus: null
};

const asset = {
  description: '',
  favorite: false,
  category: 'cunning',
  type: 'Facility',
  health: {
    value: 1,
    max: 1
  },
  rating: 1,
  tl: 0,
  baseOfInfluence: false,
  unusable: false,
  stealthed: false,
  cost: 1,
  income: 0,
  maintenance: 0,
  attackTarget: null,
  attackSource: null,
  qualities: {
    permission: false,
    action: false,
    special: false
  }
};

const cyberware = {
  description: '',
  favorite: false,
  tl: 4,
  cost: 0,
  strain: 1,
  disabled: false,
  effect: 'None',
  type: 'none',
  concealment: 'sight',
  complication: ''
};

const focus = {
  description: '',
  favorite: false,
  level: 0,
  type: 'focus'
};

const edge = {
  description: '',
  favorite: false,
  level: 0,
  type: 'edge'
};

const mech = {
  health: {
    value: 10,
    max: 10
  },
  cost: 0,
  ac: 10,
  traumaTarget: 6,
  armor: {
    value: 1,
    max: 1
  },
  speed: 1,
  crew: {
    min: 1,
    max: 1,
    current: 1
  },
  crewMembers: [],
  tl: 5,
  description: '',
  mods: '',
  power: {
    value: 1,
    max: 1
  },
  mass: {
    value: 1,
    max: 1
  },
  hardpoints: {
    value: 1,
    max: 1
  },
  maintenanceCost: 0,
  mechHullType: ''
};

const npc = {
  health: {
    value: 10,
    max: 10
  },
  biography: '',
  species: '',
  access: {
    value: 1,
    max: 1
  },
  traumaTarget: 6,
  baseAc: 10,
  meleeAc: 10,
  ab: 1,
  meleeAb: 1,
  systemStrain: {
    value: 0,
    permanent: 0
  },
  effort: {
    bonus: 0,
    current: 0,
    scene: 0,
    day: 0
  },
  speed: 10,
  cyberdecks: [],
  health_max_modified: 0,
  armorType: 'street',
  skillBonus: 0,
  attacks: {
    damage: 'd6',
    bonusDamage: 0,
    number: 0
  },
  hitDice: '1d8',
  saves: 0,
  moralScore: 6,
  reaction: 'unknown',
  notes: {
    left: {},
    right: {},
    public: {}
  },
  baseSoakTotal: {
    value: 0,
    max: 0
  },
  homeworld: '',
  faction: ''
};

const power = {
  description: '',
  favorite: false,
  source: "",
  level: 1,
  roll: "",
  save: null,
  range: "",
  skill: null,
  prepared: true,
  effort: null,
};

const program = {
  description: '',
  favorite: false,
  cost: 0,
  type: 'verb',
  accessCost: 0,
  target: '',
  selfTerminating: false,
  useAffects: '',
  skillCheckMod: 0
};

const ship = {
  health: {
    value: 10,
    max: 10
  },
  cost: 0,
  ac: 10,
  traumaTarget: 6,
  armor: {
    value: 1,
    max: 1
  },
  speed: 1,
  crew: {
    min: 1,
    max: 1,
    current: 1
  },
  crewMembers: [],
  tl: 5,
  description: '',
  mods: '',
  power: {
    value: 1,
    max: 1
  },
  mass: {
    value: 1,
    max: 1
  },
  hardpoints: {
    value: 1,
    max: 1
  },
  lifeSupportDays: {
    value: 1,
    max: 1
  },
  fuel: {
    value: 1,
    max: 1
  },
  cargo: {
    value: 1,
    max: 1
  },
  spikeDrive: {
    value: 1,
    max: 1
  },
  operatingCost: 1,
  maintenanceCost: 1,
  amountOwed: 0,
  paymentAmount: 0,
  paymentMonths: 0,
  maintenanceMonths: 0,
  creditPool: 0,
  lastMaintenance: {
    year: 0,
    month: 0,
    day: 0
  },
  lastPayment: {
    year: 0,
    month: 0,
    day: 0
  },
  commandPoints: 0,
  npcCommandPoints: 0,
  crewSkillBonus: 0,
  actionsTaken: [],
  supportingDept: '',
  roleOrder: []
};

const skill = {
  description: '',
  favorite: false,
  rank: -1,
  defaultStat: 'ask',
  pool: '2D6',
  source: '',
  remember: {
    use: false,
    modifier: 0
  },
  stats: 'dex'
};

const vehicle = {
  health: {
    value: 10,
    max: 10
  },
  cost: 0,
  ac: 10,
  traumaTarget: 6,
  armor: {
    value: 1,
    max: 1
  },
  speed: 1,
  crew: {
    min: 1,
    max: 1,
    current: 1
  },
  crewMembers: [],
  tl: 5,
  description: '',
  mods: '',
  power: {
    value: 1,
    max: 1
  },
  mass: {
    value: 1,
    max: 1
  },
  hardpoints: {
    value: 1,
    max: 1
  },
  kmph: 0,
  tonnage: 0
};

const drone = {
  health: {
    value: 10,
    max: 10
  },
  cost: 0,
  ac: 10,
  traumaTarget: 6,
  armor: {
    value: 1,
    max: 1
  },
  speed: 1,
  crew: {
    min: 1,
    max: 1,
    current: 1
  },
  crewMembers: [],
  tl: 5,
  description: '',
  mods: '',
  power: {
    value: 1,
    max: 1
  },
  mass: {
    value: 1,
    max: 1
  },
  hardpoints: {
    value: 1,
    max: 1
  },
  kmph: 0,
  tonnage: 0,
  size: 's',
  fittings: (1,1,true),
  enc: 1,
  range: "",
  model: ('primitiveDrone'),
  moveType: ""
};

const weapon = {
  description: '',
  favorite: false,
  quantity: 1,
  bundle: {
    bundled: false,
    amount: null
  },
  encumbrance: 1,
  cost: 0,
  tl: null,
  location: 'stowed',
  quality: 'stock',
  noEncReadied: false,
  stat: 'dex',
  secondStat: null,
  skill: 'ask',
  skillBoostsDamage: false,
  skillBoostsShock: false,
  shock: {
    dmg: 0,
    ac: 10
  },
  ab: 0,
  ammo: {
    longReload: false,
    suppress: false,
    type: 'ammo',
    max: 10,
    value: 10,
    burst: false
  },
  range: {
    normal: 1,
    max: 2
  },
  damage: '1d6',
  remember: {
    use: false,
    burst: false,
    modifier: 0,
    isNonLethal: false
  },
  save: null,
  trauma: {
    die: '1d6',
    rating: null
  },
  isTwoHanded: false,
  isNonLethal: false
};

const shipWeapon = {
  description: '',
  favorite: false,
  tl: null,
  broken: false,
  destroyed: false,
  juryRigged: false,
  cost: 0,
  costMultiplier: false,
  mass: 0,
  massMultiplier: false,
  power: 0,
  powerMultiplier: false,
  minClass: 'fighter', 
  type: 'ship',
  damage: '',
  ab: 0,
  hardpoint: 1,
  qualities: '',
  ammo: {
    type: 'none',
    max: 4,
    value: 4
  },
  trauma: {
    die: "1d6",
    rating:"",
    vehicle: false
  },
  range: {
    normal: 1,
    max: 2
  },
  stat: "ask"
};

const shipFitting = {
  description: '',
  favorite: false,
  tl: null,
  broken: false,
  destroyed: false,
  juryRigged: false,
  cost: 0,
  costMultiplier: false,
  mass: 0,
  massMultiplier: false,
  power: 0,
  powerMultiplier: false,
  minClass: 'fighter', 
  type: 'ship',
  effect: ""
};

const shipDefense = {
  description: '',
  favorite: false,
  tl: null,
  broken: false,
  destroyed: false,
  juryRigged: false,
  cost: 0,
  costMultiplier: false,
  mass: 0,
  massMultiplier: false,
  power: 0,
  powerMultiplier: false,
  minClass: 'fighter', 
  type: 'ship',
  effect: ""
};

export const mapping = {
  item,
  armor,
  asset,
  cyberware,
  focus,
  edge,
  mech,
  npc,
  power,
  program,
  ship,
  skill,
  vehicle,
  weapon,
  // New mappings:
  drone,
  shipWeapon,
  shipFitting,
  shipDefense,
};
