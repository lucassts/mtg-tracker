import { applyFilters, computeStats } from '../stats';
import { Filters, Match } from '../../types';

const m = (over: Partial<Match> & { id: string }): Match => ({
  date: '2026-08-10T12:00:00.000Z',
  format: 'Commander',
  myDeck: 'Atraxa',
  oppDeck: 'Urza',
  archetype: 'Midrange',
  onPlay: true,
  won: true,
  drew: false,
  notes: '',
  ...over,
});

const noFilters: Filters = {
  format: 'All', deck: [], oppDeck: [], period: 'All', result: 'All',
};

describe('computeStats', () => {
  it('conta empate como empate, não como derrota', () => {
    const s = computeStats([
      m({ id: '1', won: true }),
      m({ id: '2', won: false }),
      m({ id: '3', won: false, drew: true }),
    ]);
    expect(s).toMatchObject({ total: 3, wins: 1, losses: 1, draws: 1 });
  });

  it('trata lista vazia sem dividir por zero', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ total: 0, wr: 0, streak: 0, streakType: null });
    expect(s.evolution).toEqual([]);
  });

  it('interrompe a sequência num empate', () => {
    const s = computeStats([
      m({ id: '1', won: true }),
      m({ id: '2', won: true }),
      m({ id: '3', won: false, drew: true }),
      m({ id: '4', won: true }),
    ]);
    expect(s.streak).toBe(2);
    expect(s.streakType).toBe(true);
  });
});

describe('applyFilters', () => {
  it('separa vitória, derrota e empate', () => {
    const all = [
      m({ id: '1', won: true }),
      m({ id: '2', won: false }),
      m({ id: '3', won: false, drew: true }),
    ];
    expect(applyFilters(all, { ...noFilters, result: 'Wins' }).map(x => x.id)).toEqual(['1']);
    expect(applyFilters(all, { ...noFilters, result: 'Losses' }).map(x => x.id)).toEqual(['2']);
    expect(applyFilters(all, { ...noFilters, result: 'Draws' }).map(x => x.id)).toEqual(['3']);
  });

  it('filtra por vários decks ao mesmo tempo', () => {
    const all = [
      m({ id: '1', myDeck: 'Atraxa' }),
      m({ id: '2', myDeck: 'Kinnan' }),
      m({ id: '3', myDeck: 'Burn' }),
    ];
    expect(
      applyFilters(all, { ...noFilters, deck: ['Atraxa', 'Burn'] }).map(x => x.id)
    ).toEqual(['1', '3']);
  });

  it('descarta partidas fora da janela de 7 dias', () => {
    const recent = new Date(Date.now() - 2 * 86400000).toISOString();
    const old = new Date(Date.now() - 30 * 86400000).toISOString();
    const all = [m({ id: 'novo', date: recent }), m({ id: 'velho', date: old })];
    expect(applyFilters(all, { ...noFilters, period: '7d' }).map(x => x.id)).toEqual(['novo']);
  });
});
