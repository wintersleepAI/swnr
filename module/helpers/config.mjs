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
}