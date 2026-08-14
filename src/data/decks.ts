import { Format, Archetype } from '../types';

// ─── Database de decks (fonte: database_decks.csv) ──────────

/** Mapeia arquétipo bruto do CSV para o tipo Archetype do app */
function mapCsvArchetype(raw: string): Archetype {
  const a = raw.toLowerCase();
  if (a.includes('prison') || a.includes('stax')) return 'Stax';
  if (a.includes('combo')) return 'Combo';
  if (a.includes('aggro')) return 'Aggro';
  if (a.includes('control')) return 'Control';
  if (a.includes('tempo')) return 'Aggro';
  return 'Midrange';
}

export const DECK_DB: Record<string, string[]> = {
  Commander: [
    // Regular Commander
    "Atraxa, Praetors' Voice", 'Edgar Markov', 'Krenko, Mob Boss',
    "Yuriko, the Tiger's Shadow", 'Kinnan, Bonder Prodigy', 'Urza, Lord High Artificer',
    'Tymna / Thrasios', 'Kaalia of the Vast', 'Omnath, Locus of Creation',
    'Meren of Clan Nel Toth', 'The Ur-Dragon', 'Kenrith, the Returned King',
    'Korvold, Fae-Cursed King', 'Najeela, the Blade-Blossom', 'Prosper, Tome-Bound',
    'Zur the Enchanter', 'Sisay, Weatherlight Captain', 'Breya, Etherium Shaper',
    // cEDH
    'Blue Farm', 'Najeela Tempo', 'Winota Stax', 'Kinnan Big Mana',
    'Magda Clock', 'Tivit Control', 'Stella Lee Combo',
  ],
  Legacy: [
    // Doomsday variants
    'Turbo Doomsday', 'BUG Doomsday', 'Esper Doomsday', 'Meandeck Doomsday', 'Dryad Doomsday',
    // Delver variants
    'Grixis Delver', 'RUG Delver (Temur)', 'UR Delver', 'Jeskai Delver',
    'UW Delver', 'UB Delver', '4C Delver',
    // Aggro / Tax
    'Death and Taxes',
    // Storm / Combo
    'ANT (Ad Nauseam Tendrils)', 'TES (The Epic Storm)', 'Sneak and Show', 'Omni-Tell',
    'Reanimator (BR)', 'Reanimator (UB)', 'Elves (Cradle)', 'Lands (RG)',
    'Hogaak Depth', 'Turbo Depths', "Painter's Servant (Shortcake)",
    // Tempo / Value
    '8-Cast', 'Goblins (Lackey)', 'Merfolk', 'Stiflenought (UW)',
    // Midrange
    'Maverick (GW)', 'Punishing Jund', 'Deadguy Ale', 'The Rock (BG)',
    // Big Mana
    'Cloudpost (12-Post)',
    // Prison
    'Mono-Red Prison', 'Sylvan Plug',
    // Aliases banco antigo
    'Temur Delver (RUG)', 'Sultai Control', 'Moon Chalice (Stompy)',
    'Delver', 'Storm', 'Reanimator', 'Elves', 'Miracles', 'Dark Depths',
  ],
  Modern: [
    // Meta atual
    'Jund Midrange', 'Izzet Murktide', 'Mono-Green Tron', 'Eldrazi Tron',
    'Amulet Titan', 'Living End', 'Crashing Footfalls', '4C Omnath',
    'Grixis Shadow', 'Jund Shadow', 'Rakdos Scam', 'Yawgmoth Evolution',
    'Hammer Time', 'Burn (Boros)', 'Azorius Control', 'Hardened Scales',
    'Mill', 'Affinity (Classic)', 'Dredge', 'Scapeshift (RG)',
    'Infect (UG)', 'Lantern Control', 'Whirza',
    // Banidos (histórico)
    'Splinter Twin (UR)', 'Birthing Pod',
    // Aliases banco antigo
    'Crashing Footfalls (Rhinos)', 'Yawgmoth Chord',
    'UW Control', 'Murktide Regent', 'Rhinos', 'Yawgmoth', 'Merfolk', 'Infect',
    "Death's Shadow", 'Grixis Control', 'Izzet Prowess', 'Humans', 'Burn', 'Tron',
  ],
  Standard: [
    // Clássicos históricos
    'Necropotence', 'ProsBloom', 'Academy Combo', 'Replenish',
    'Fires of Yavimaya', 'Psychatog', 'Astral Slide', 'Ravager Affinity',
    'Solar Flare', 'Dragonstorm', 'Faeries (UB)', 'Jund Midrange',
    'Caw-Blade (UW)', 'Valakut Ramp', 'Delver (UW)', 'Mono-Black Devotion',
    'Abzan Siege Rhino', 'Temur Energy', 'Hazoret Red', 'Teferi Control',
    'Oko Food', 'Omnath Ramp', 'Domain Ramp',
    // Aliases banco antigo
    'Caw-Blade', 'Jund (Alara/Zendikar)', 'Esper Midrange', 'Azorius Soldiers',
    'Mono-Red Aggro', 'Grixis Midrange', 'Selesnya Tokens', 'Rakdos Reanimator',
    'White Weenie', '5c Ramp', 'Abzan Midrange', 'Temur Tempo',
  ],
  Pioneer: [
    'Izzet Phoenix', 'Rakdos Midrange', 'Mono-Green Devotion', 'Azorius Control',
    'Abzan Greasefang', 'Lotus Field Combo', 'Boros Convoke', 'Dimir Control',
    'Humans (Mono W)', 'Spirits (Mono U)', 'Niv-to-Light (5C)',
    // Aliases banco antigo
    'Azorius Spirits', 'Green Devotion', 'Heroic', 'Bant Humans', 'Niv to Light',
    'Mono-Red Aggro',
  ],
  Pauper: [
    'Grixis Affinity', 'Mono-Blue Delver', 'Izzet Skred', 'Boros Synthesizer',
    'Dimir Terror', 'Kuldotha Red', 'Bogles', 'Caw-Gates',
    // Aliases banco antigo
    'Faeries', 'Burn', 'Affinity', 'Stompy', 'Familiars',
    'Caw-Gate', 'Mono-Black Control', 'Dimir Faeries',
  ],
  Other: [
    // Vintage
    'Paradoxical Outcome', 'Tinker Citadel', 'Ravager Shops', 'Golos Shops',
    'Dredge (Bazaar)', 'Oath of Druids', 'Sultai Midrange', 'White Initiative',
    // Premodern
    'Trix (Illusions/Donate)', 'Stasis', 'Survival of the Fittest', 'Sligh',
    'Goblins', 'The Rock', 'Landstill (UW/UR)', 'Threshold (UG/W)',
    'Parfait', 'Dreadnought (Stifle-Nought)', 'Devourer Combo',
    // Alias banco antigo
    'Sneak and Show',
  ],
  Draft: [],
};

/**
 * Conjunto plano com TODOS os nomes de deck que vêm do banco de dados.
 * Usado para distinguir decks do DB vs. decks criados pelo usuário.
 */
export const DB_DECK_NAMES: Set<string> = new Set(
  Object.values(DECK_DB).flat()
);

/** Arquétipo de cada deck do CSV (fonte: database_decks.csv) */
export const DB_DECK_ARCHETYPE: Record<string, Archetype> = {
  // ── Legacy ──
  'Turbo Doomsday': mapCsvArchetype('Combo'),
  'BUG Doomsday': mapCsvArchetype('Combo-Control'),
  'Esper Doomsday': mapCsvArchetype('Combo-Control'),
  'Meandeck Doomsday': mapCsvArchetype('Combo'),
  'Dryad Doomsday': mapCsvArchetype('Combo-Midrange'),
  'Grixis Delver': mapCsvArchetype('Tempo'),
  'RUG Delver (Temur)': mapCsvArchetype('Tempo'),
  'Temur Delver (RUG)': mapCsvArchetype('Tempo'),
  'UR Delver': mapCsvArchetype('Tempo'),
  'Jeskai Delver': mapCsvArchetype('Tempo'),
  'UW Delver': mapCsvArchetype('Tempo'),
  'UB Delver': mapCsvArchetype('Tempo'),
  '4C Delver': mapCsvArchetype('Tempo'),
  'Death and Taxes': mapCsvArchetype('Tax/Aggro'),
  'ANT (Ad Nauseam Tendrils)': mapCsvArchetype('Combo'),
  'TES (The Epic Storm)': mapCsvArchetype('Combo'),
  'Sneak and Show': mapCsvArchetype('Combo'),
  'Omni-Tell': mapCsvArchetype('Combo'),
  'Reanimator (BR)': mapCsvArchetype('Combo'),
  'Reanimator (UB)': mapCsvArchetype('Combo-Control'),
  'Elves (Cradle)': mapCsvArchetype('Combo-Aggro'),
  'Lands (RG)': mapCsvArchetype('Combo-Control'),
  '8-Cast': mapCsvArchetype('Tempo/Value'),
  'Goblins (Lackey)': mapCsvArchetype('Aggro-Combo'),
  'Merfolk': mapCsvArchetype('Aggro-Tempo'),
  'Maverick (GW)': mapCsvArchetype('Midrange'),
  'Punishing Jund': mapCsvArchetype('Midrange'),
  'Cloudpost (12-Post)': mapCsvArchetype('Big Mana'),
  'Hogaak Depth': mapCsvArchetype('Combo-Aggro'),
  'Turbo Depths': mapCsvArchetype('Combo'),
  'Stiflenought (UW)': mapCsvArchetype('Aggro-Control'),
  'Deadguy Ale': mapCsvArchetype('Midrange/Discard'),
  'The Rock (BG)': mapCsvArchetype('Midrange'),
  "Painter's Servant (Shortcake)": mapCsvArchetype('Combo'),
  'Mono-Red Prison': mapCsvArchetype('Prison'),
  'Sylvan Plug': mapCsvArchetype('Prison'),
  'Sultai Control': mapCsvArchetype('Control'),
  'Moon Chalice (Stompy)': mapCsvArchetype('Prison'),
  // ── Modern ──
  'Jund Midrange': mapCsvArchetype('Midrange'),
  'Izzet Murktide': mapCsvArchetype('Tempo'),
  'Mono-Green Tron': mapCsvArchetype('Big Mana'),
  'Eldrazi Tron': mapCsvArchetype('Midrange/Big Mana'),
  'Amulet Titan': mapCsvArchetype('Combo/Big Mana'),
  'Living End': mapCsvArchetype('Combo'),
  'Crashing Footfalls': mapCsvArchetype('Midrange/Tempo'),
  'Crashing Footfalls (Rhinos)': mapCsvArchetype('Midrange/Tempo'),
  '4C Omnath': mapCsvArchetype('Control/Midrange'),
  'Grixis Shadow': mapCsvArchetype('Aggro-Control'),
  'Jund Shadow': mapCsvArchetype('Aggro'),
  'Rakdos Scam': mapCsvArchetype('Midrange'),
  'Yawgmoth Evolution': mapCsvArchetype('Combo-Midrange'),
  'Yawgmoth Chord': mapCsvArchetype('Combo-Midrange'),
  'Hammer Time': mapCsvArchetype('Aggro-Combo'),
  'Burn (Boros)': mapCsvArchetype('Aggro'),
  'Hardened Scales': mapCsvArchetype('Aggro-Combo'),
  'Mill': mapCsvArchetype('Combo-Control'),
  'Affinity (Classic)': mapCsvArchetype('Aggro'),
  'Dredge': mapCsvArchetype('Combo'),
  'Scapeshift (RG)': mapCsvArchetype('Combo'),
  'Infect (UG)': mapCsvArchetype('Aggro-Combo'),
  'Lantern Control': mapCsvArchetype('Prison'),
  'Whirza': mapCsvArchetype('Combo-Control'),
  'Splinter Twin (UR)': mapCsvArchetype('Combo-Control'),
  'Birthing Pod': mapCsvArchetype('Midrange-Combo'),
  // ── Pioneer ──
  'Izzet Phoenix': mapCsvArchetype('Tempo/Spells'),
  'Rakdos Midrange': mapCsvArchetype('Midrange'),
  'Mono-Green Devotion': mapCsvArchetype('Ramp/Combo'),
  'Azorius Control': mapCsvArchetype('Control'),
  'Abzan Greasefang': mapCsvArchetype('Combo'),
  'Lotus Field Combo': mapCsvArchetype('Combo'),
  'Boros Convoke': mapCsvArchetype('Aggro'),
  'Dimir Control': mapCsvArchetype('Control'),
  'Humans (Mono W)': mapCsvArchetype('Aggro'),
  'Spirits (Mono U)': mapCsvArchetype('Tempo'),
  'Niv-to-Light (5C)': mapCsvArchetype('Midrange/Control'),
  // ── Standard ──
  'Necropotence': mapCsvArchetype('Control'),
  'ProsBloom': mapCsvArchetype('Combo'),
  'Academy Combo': mapCsvArchetype('Combo'),
  'Replenish': mapCsvArchetype('Combo'),
  'Fires of Yavimaya': mapCsvArchetype('Aggro-Midrange'),
  'Psychatog': mapCsvArchetype('Control-Combo'),
  'Astral Slide': mapCsvArchetype('Control'),
  'Ravager Affinity': mapCsvArchetype('Aggro'),
  'Solar Flare': mapCsvArchetype('Control'),
  'Dragonstorm': mapCsvArchetype('Combo'),
  'Faeries (UB)': mapCsvArchetype('Tempo-Control'),
  'Caw-Blade (UW)': mapCsvArchetype('Control'),
  'Valakut Ramp': mapCsvArchetype('Big Mana'),
  'Delver (UW)': mapCsvArchetype('Tempo'),
  'Mono-Black Devotion': mapCsvArchetype('Midrange-Control'),
  'Abzan Siege Rhino': mapCsvArchetype('Midrange'),
  'Temur Energy': mapCsvArchetype('Midrange'),
  'Hazoret Red': mapCsvArchetype('Aggro'),
  'Teferi Control': mapCsvArchetype('Control'),
  'Oko Food': mapCsvArchetype('Midrange/Control'),
  'Omnath Ramp': mapCsvArchetype('Big Mana/Combo'),
  'Domain Ramp': mapCsvArchetype('Big Mana'),
  'Jund (Alara/Zendikar)': mapCsvArchetype('Midrange'),
  // ── Vintage ──
  'Paradoxical Outcome': mapCsvArchetype('Combo-Control'),
  'Tinker Citadel': mapCsvArchetype('Combo'),
  'Ravager Shops': mapCsvArchetype('Aggro-Prison'),
  'Golos Shops': mapCsvArchetype('Prison'),
  'Dredge (Bazaar)': mapCsvArchetype('Combo'),
  'Oath of Druids': mapCsvArchetype('Combo-Control'),
  'Sultai Midrange': mapCsvArchetype('Midrange'),
  'White Initiative': mapCsvArchetype('Aggro-Stompy'),
  // ── Premodern ──
  'Trix (Illusions/Donate)': mapCsvArchetype('Combo'),
  'Stasis': mapCsvArchetype('Prison'),
  'Survival of the Fittest': mapCsvArchetype('Midrange-Combo'),
  'Sligh': mapCsvArchetype('Aggro'),
  'Goblins': mapCsvArchetype('Aggro'),
  'The Rock': mapCsvArchetype('Midrange'),
  'Landstill (UW/UR)': mapCsvArchetype('Control'),
  'Threshold (UG/W)': mapCsvArchetype('Tempo'),
  'Parfait': mapCsvArchetype('Prison/Control'),
  'Dreadnought (Stifle-Nought)': mapCsvArchetype('Aggro-Combo'),
  'Devourer Combo': mapCsvArchetype('Combo'),
  // ── cEDH ──
  'Blue Farm': mapCsvArchetype('Midrange-Combo'),
  'Najeela Tempo': mapCsvArchetype('Aggro-Combo'),
  'Winota Stax': mapCsvArchetype('Stax/Aggro'),
  'Kinnan Big Mana': mapCsvArchetype('Midrange-Combo'),
  'Magda Clock': mapCsvArchetype('Combo-Stax'),
  'Tivit Control': mapCsvArchetype('Control-Combo'),
  'Stella Lee Combo': mapCsvArchetype('Combo'),
  // ── Aliases banco antigo ──
  'Delver': 'Aggro',
  'Storm': 'Combo',
  'Reanimator': 'Combo',
  'Elves': 'Combo',
  'Miracles': 'Control',
  'Dark Depths': 'Combo',
  'Burn': 'Aggro',
  'UW Control': 'Control',
  'Tron': 'Midrange',
  'Rhinos': 'Midrange',
  'Yawgmoth': 'Combo',
  'Infect': 'Aggro',
  "Death's Shadow": 'Aggro',
  'Grixis Control': 'Control',
  'Izzet Prowess': 'Aggro',
  'Humans': 'Aggro',
  'Murktide Regent': 'Aggro',
  'Azorius Spirits': 'Aggro',
  'Green Devotion': 'Combo',
  'Heroic': 'Aggro',
  'Bant Humans': 'Aggro',
  'Niv to Light': 'Control',
  'Mono-Red Aggro': 'Aggro',
  'Caw-Blade': 'Control',
  'Esper Midrange': 'Control',
  'Azorius Soldiers': 'Aggro',
  'Grixis Midrange': 'Midrange',
  'Selesnya Tokens': 'Aggro',
  'Rakdos Reanimator': 'Combo',
  'White Weenie': 'Aggro',
  '5c Ramp': 'Midrange',
  'Abzan Midrange': 'Midrange',
  'Temur Tempo': 'Aggro',
  'Faeries': 'Aggro',
  'Affinity': 'Aggro',
  'Stompy': 'Aggro',
  'Familiars': 'Combo',
  'Caw-Gate': 'Control',
  'Mono-Black Control': 'Control',
  'Dimir Faeries': 'Aggro',
};

export function getDeckSuggestions(format: Format, recentDecks: string[] = []): string[] {
  const db = DECK_DB[format] || [];
  const recent = recentDecks.filter(d => d && !db.includes(d));
  return [...new Set([...recentDecks.slice(0, 5), ...db, ...recent])];
}

/** Retorna true se o deck veio da database (não foi criado pelo usuário). */
export function isDatabaseDeck(name: string): boolean {
  return DB_DECK_NAMES.has(name);
}

/**
 * Retorna o arquétipo de um deck com base na database.
 * Se o deck não estiver na database, retorna undefined.
 */
export function getArchetypeForDeck(deckName: string): Archetype | undefined {
  return DB_DECK_ARCHETYPE[deckName];
}
