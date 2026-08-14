import { Match } from '../types';

const DECKS_MINE = ['Atraxa', 'Kinnan', 'Burn', 'Yuriko'];
const DECKS_OPP = [
  'Edgar Markov', 'Urza', 'Atraxa', 'Krenko', 'Yuriko',
  'Winota', 'Narset', 'Kaalia', 'Tymna/Thrasios',
];
const FORMATS = ['Commander', 'Modern', 'Standard', 'Pioneer'] as const;
const ARCHETYPES = ['Aggro', 'Midrange', 'Control', 'Combo', 'Stax'] as const;

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedMatches(): Match[] {
  const rng = mulberry32(42);
  const now = Date.now();
  const out: Match[] = [];

  for (let i = 0; i < 48; i++) {
    const daysAgo = Math.floor(rng() * 28);
    const date = new Date(now - daysAgo * 86400000 - Math.floor(rng() * 50000000));
    const format = i < 36 ? 'Commander' : FORMATS[1 + Math.floor(rng() * 3)];
    const myDeck = DECKS_MINE[Math.floor(rng() * DECKS_MINE.length)];
    const oppDeck = DECKS_OPP[Math.floor(rng() * DECKS_OPP.length)];
    const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];
    const onPlay = rng() > 0.5;

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
      format,
      myDeck,
      oppDeck,
      archetype,
      onPlay,
      won,
      notes: i % 6 === 0 ? 'Mulligan to 6, topdecked perfectly.' : '',
    });
  }

  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
