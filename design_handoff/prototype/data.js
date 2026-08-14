// Mock match database + derived stats

const DECKS_MINE = ['Atraxa', 'Kinnan', 'Burn', 'Yuriko'];
const DECKS_OPP = [
  'Edgar Markov', 'Urza', 'Atraxa', 'Krenko', 'Yuriko',
  'Winota', 'Narset', 'Kaalia', 'Tymna/Thrasios',
];
const FORMATS = ['Commander', 'Modern', 'Standard', 'Pioneer'];
const ARCHETYPES = ['Aggro', 'Midrange', 'Control', 'Combo', 'Stax'];

// Deck database per format — used for autocomplete
const DECK_DB = {
  Commander: [
    // Tier 1 cEDH / competitive
    'Tymna / Thrasios','Najeela, the Blade-Blossom','Kinnan, Bonder Prodigy',
    'Urza, Lord High Artificer','Kenrith, the Returned King','Rograkh / Ardenn',
    'Dargo / Jeska','Malcolm / Breeches','Krark / Sakashima','Thrasios / Vial Smasher',
    'Minsc & Boo','Godo, Bandit Warlord','Yawgmoth, Thran Physician',
    // High-power / popular commanders
    'Atraxa, Praetors\' Voice','Edgar Markov','Krenko, Mob Boss',
    'Yuriko, the Tiger\'s Shadow','Kaalia of the Vast','Omnath, Locus of Creation',
    'Meren of Clan Nel Toth','The Ur-Dragon','Korvold, Fae-Cursed King',
    'Prosper, Tome-Bound','Zur the Enchanter','Ghave, Guru of Spores',
    'Sisay, Weatherlight Captain','Breya, Etherium Shaper','Muldrotha, the Gravetide',
    'Wilhelt, the Rotcleaver','Raffine, Scheming Seer','Isshin, Two Heavens as One',
    'Chulane, Teller of Tales','Winota, Joiner of Forces','Magda, Brazen Outlaw',
    'Lathril, Blade of the Elves','Shorikai, Genesis Engine','Chatterfang, Squirrel General',
    'Brago, King Eternal','Tergrid, God of Fright','Heliod, Sun-Crowned',
    'Miirym, Sentinel Wyrm','Toxrill, the Corrosive','Gishath, Sun\'s Avatar',
    'Sythis, Harvest\'s Hand','Aesi, Tyrant of Gyre Strait','Yarok, the Desecrated',
    'Kykar, Wind\'s Fury','Mizzix of the Izmagnus','Arcades, the Strategist',
    'Lord Windgrace','Aminatou, the Fateshifter','Niv-Mizzet Reborn',
    'Wulfgar of Icewind Dale','Rielle, the Everwise','Purphoros, God of the Forge',
    'Ghired, Conclave Exile','Syr Konrad, the Grim','Vito, Thorn of the Dusk Rose',
    'Feather, the Redeemed','Zada, Hedron Grinder','Jhoira, Weatherlight Captain',
    'Marchesa, the Black Rose','Niv-Mizzet, Parun','Grenzo, Dungeon Warden',
    'Anje Falkenrath','Vadrok, Apex of Thunder','The Scarab God',
    'Atraxa, Grand Unifier','Elesh Norn, Mother of Machines','Toxrill the Corrosive',
    'Ob Nixilis, Captive Kingpin','Dihada, Binder of Wills','Shorikai, Genesis Engine',
    'Rona, Herald of Invasion','Runo Stromkirk','Anhelo, the Painter',
    'Tivit, Seller of Secrets','Parnesse, the Subtle Brush','Commanders Quarters Brew',
  ],
  Modern: [
    // 2020-2025 meta
    'Hammer Time','Living End','Amulet Titan','Murktide Regent','Rhinos',
    'Yawgmoth','Hardened Scales','Burn','UW Control','Death\'s Shadow',
    'Tron','Eldrazi Tron','Mono-Green Tron','4-Color Omnath','Crashing Footfalls',
    'Izzet Prowess','Grixis Shadow','Jund Saga','Humans','Merfolk',
    'Infect','Storm','Ad Nauseam','Affinity','Dredge',
    'Heliod Company','Esper Reanimator','Mill','UR Murktide','Grixis Control',
    'Asmo Food','Creativity','4-Color Blink','Goryo\'s Vengeance','Copycat',
    'Temur Footfalls','Mono-Black Coffers','Rakdos Scam','Izzet Blitz',
    'Domain Zoo','Boros Energy','Dimir Control','Glimpse of Tomorrow',
    'Oops All Spells','Bogles','8-Rack','Lantern Control','Scales',
    'UB Murktide','Mardu Shadow','Izzet Creativity',
  ],
  Standard: [
    // 2020-2025 meta
    'Esper Midrange','Domain Ramp','Azorius Soldiers','Mono-Red Aggro',
    'Jund Midrange','Grixis Midrange','Selesnya Tokens','Rakdos Reanimator',
    'White Weenie','5c Ramp','Abzan Midrange','Temur Tempo',
    'Azorius Affinity','Izzet Turns','Mono-White Aggro','Boros Heroic',
    'Dimir Control','Rakdos Midrange','Azorius Auras','Mardu Greasefang',
    'Esper Legends','Sunfall Control','Mono-Red Goblins','Sultai Midrange',
    'Azorius Lotus Field','Orzhov Midrange','Boros Convoke','Dimir Faeries',
    'Dimir Midrange','Azorius Tempo','Gruul Aggro','Selesnya Enchantments',
    'Jund Sacrifice','Rakdos Anvil','Grixis Vampires','Izzet Epiphany',
    'Naya Runes','Orzhov Clerics','Sultai Ramp','Izzet Dragons',
    'Mono-Green Aggro','Rakdos Sacrifice','Domain Control','Azorius Soldiers',
  ],
  Pioneer: [
    // 2020-2025 meta
    'Rakdos Midrange','Lotus Field Combo','Azorius Spirits','Mono-Red Aggro',
    'Green Devotion','Abzan Greasefang','Izzet Phoenix','Heroic',
    'Hidden Strings Combo','Bant Humans','Niv to Light','Fires of Invention',
    'Izzet Creativity','Winota','Rakdos Sacrifice','Azorius Control',
    'Mono-White Humans','Ensoul Artifact','Gruul Vehicles','Orzhov Humans',
    'Azorius Auras','Dimir Rogues','Mono-Blue Spirits','5c Humans',
    'Atarka Red','Boros Heroic','Selesnya Angels','Jund Food',
    'Esper Greasefang','Dimir Control','Orzhov Midrange','Mono-Black Aggro',
    'Simic Devotion','Transmogrify','Gruul Monsters','Azorius Affinity',
    'Rakdos Pyromancer','Boros Convoke','Esper Legends','Izzet Artifacts',
    'Abzan Midrange','Selesnya Counters','Mono-Green Stompy',
  ],
  Legacy: [
    'Izzet Delver','Death and Taxes','ANT Storm','TES','Reanimator',
    'Sneak and Show','Elves','Miracles','Lands','Turbo Depths',
    'Hogaak','Doomsday','8-Cast','Eldrazi','Painter\'s Servant',
    'Oops All Spells','BUG Zenith','Esper Vial','4c Control','Goblins',
    'Burn','Mono-Red Prison','Cephalid Breakfast','Loam','RUG Delver',
    'Show and Tell','High Tide','Stiflenought','Maverick','Aluren',
    'Enchantress','Food Chain','Manaless Dredge','Infect','12-Post',
  ],
  Pauper: [
    'Faeries','Burn','Affinity','Bogles','Familiars',
    'Stompy','Caw-Gate','Mono-Black Control','Dimir Faeries','Mono-Blue Faeries',
    'Kuldotha Boros','Grixis Affinity','Dimir Delver','Tireless Tribe Combo',
    'Orzhov Pestilence','Gates','Elves','Izzet Faeries','Dimir Control',
    'Walls Combo','Rakdos Burn','Jund Cascade','Mono-White Heroic',
    'UG Madness','Boros Bully','Mardu Tokens','Azorius Familiars',
    'Turbo Fog','Simic Ramp','Flicker Tron','Gruul Aggro',
  ],
  Draft: [],
  Other: [],
};

// Get deck suggestions for a format, starting with recently used
function getDeckSuggestions(format, recentDecks = []) {
  const db = DECK_DB[format] || [];
  const recent = recentDecks.filter(d => d && !db.includes(d));
  return [...new Set([...recentDecks.slice(0, 5), ...db, ...recent])];
}

window.DECK_DB = DECK_DB;
window.getDeckSuggestions = getDeckSuggestions;

function seedMatches() {
  const rng = mulberry32(42);
  const now = Date.now();
  const out = [];
  for (let i = 0; i < 48; i++) {
    const daysAgo = Math.floor(rng() * 28);
    const date = new Date(now - daysAgo * 86400000 - Math.floor(rng() * 50000000));
    const format = i < 36 ? 'Commander' : FORMATS[1 + Math.floor(rng() * 3)];
    const myDeck = DECKS_MINE[Math.floor(rng() * DECKS_MINE.length)];
    const oppDeck = DECKS_OPP[Math.floor(rng() * DECKS_OPP.length)];
    const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];
    const onPlay = rng() > 0.5;
    // Simulate realistic win rate: on play + atraxa = higher
    let winProb = 0.5;
    if (onPlay) winProb += 0.08;
    if (myDeck === 'Atraxa') winProb += 0.1;
    if (myDeck === 'Burn') winProb -= 0.12;
    if (archetype === 'Aggro') winProb += 0.15;
    if (archetype === 'Control') winProb -= 0.1;
    const won = rng() < winProb;
    out.push({
      id: 'm' + i,
      date: date.toISOString(),
      format, myDeck, oppDeck, archetype,
      onPlay, won,
      notes: i % 6 === 0 ? 'Mulligan to 6, topdecked perfectly.' : '',
    });
  }
  return out.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function applyFilters(matches, filters) {
  return matches.filter(m => {
    if (filters.format && filters.format !== 'All' && m.format !== filters.format) return false;
    if (filters.deck && filters.deck !== 'All' && m.myDeck !== filters.deck) return false;
    if (filters.oppDeck && filters.oppDeck !== 'All' && m.oppDeck !== filters.oppDeck) return false;
    if (filters.period && filters.period !== 'All') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[filters.period];
      if (days) {
        const cutoff = Date.now() - days * 86400000;
        if (new Date(m.date).getTime() < cutoff) return false;
      }
    }
    if (filters.result && filters.result !== 'All') {
      if (filters.result === 'Wins' && !m.won) return false;
      if (filters.result === 'Losses' && m.won) return false;
    }
    return true;
  });
}

function computeStats(matches) {
  const total = matches.length;
  const wins = matches.filter(m => m.won).length;
  const losses = total - wins;
  const wr = total ? Math.round((wins / total) * 100) : 0;

  // Streak (from newest)
  let streak = 0, streakType = null;
  for (const m of matches) {
    if (streakType === null) { streakType = m.won; streak = 1; continue; }
    if (m.won === streakType) streak++; else break;
  }

  // On play / on draw
  const onPlay = matches.filter(m => m.onPlay);
  const onDraw = matches.filter(m => !m.onPlay);
  const onPlayWR = onPlay.length ? Math.round(onPlay.filter(m => m.won).length / onPlay.length * 100) : 0;
  const onDrawWR = onDraw.length ? Math.round(onDraw.filter(m => m.won).length / onDraw.length * 100) : 0;

  // Evolution — sessions of 5
  const evolution = [];
  const chunk = 5;
  for (let i = matches.length; i > 0; i -= chunk) {
    const slice = matches.slice(Math.max(0, i - chunk), i);
    const wr = Math.round(slice.filter(m => m.won).length / slice.length * 100);
    evolution.unshift(wr);
  }

  // Decks
  const deckMap = {};
  matches.forEach(m => {
    if (!deckMap[m.myDeck]) deckMap[m.myDeck] = { wins: 0, losses: 0 };
    if (m.won) deckMap[m.myDeck].wins++; else deckMap[m.myDeck].losses++;
  });
  const decks = Object.entries(deckMap).map(([l, v]) => ({
    l, wins: v.wins, losses: v.losses,
    wr: Math.round(v.wins / (v.wins + v.losses) * 100),
  })).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

  // Opponents
  const oppMap = {};
  matches.forEach(m => { oppMap[m.oppDeck] = (oppMap[m.oppDeck] || 0) + 1; });
  const opponents = Object.entries(oppMap)
    .map(([l, v]) => ({ l, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  // Archetypes
  const archMap = {};
  matches.forEach(m => {
    if (!archMap[m.archetype]) archMap[m.archetype] = { wins: 0, total: 0 };
    archMap[m.archetype].total++;
    if (m.won) archMap[m.archetype].wins++;
  });
  const archetypes = Object.entries(archMap)
    .map(([l, v]) => ({ l, v: Math.round(v.wins / v.total * 100), n: v.total }))
    .sort((a, b) => b.v - a.v);

  return {
    total, wins, losses, wr,
    streak, streakType,
    onPlayWR, onDrawWR,
    evolution,
    decks, opponents, archetypes,
  };
}

window.seedMatches = seedMatches;
window.applyFilters = applyFilters;
window.computeStats = computeStats;
