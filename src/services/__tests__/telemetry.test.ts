import { isoWeek, toEvent } from '../telemetry';
import { Match } from '../../types';

jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
}));

describe('isoWeek', () => {
  it.each([
    ['2026-01-01T12:00:00', '2026-W01'],
    ['2026-08-10T12:00:00', '2026-W33'],
    ['2026-12-31T12:00:00', '2026-W53'],
    // 1º de janeiro de 2023 foi domingo: pela ISO 8601 pertence à semana 52 de 2022.
    ['2023-01-01T12:00:00', '2022-W52'],
  ])('%s → %s', (input, expected) => {
    expect(isoWeek(new Date(input))).toBe(expected);
  });

  it('sempre produz o formato AAAA-Www', () => {
    for (let d = 1; d <= 28; d++) {
      expect(isoWeek(new Date(2026, 1, d))).toMatch(/^\d{4}-W\d{2}$/);
    }
  });
});

describe('toEvent', () => {
  const match: Match = {
    id: 'm1',
    date: '2026-08-10T23:47:12.000Z',
    format: 'Commander',
    myDeck: 'Atraxa',
    oppDeck: 'Edgar Markov',
    archetype: 'Aggro',
    onPlay: true,
    won: false,
    drew: true,
    notes: 'perdi por causa de um mulligan pra 5, que raiva',
  };

  const event = toEvent(match, 'install-abc');

  it('não carrega notas, id local nem data exata', () => {
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('mulligan');
    expect(serialized).not.toContain('23:47');
    expect(serialized).not.toContain('m1');
    expect(event).not.toHaveProperty('notes');
    expect(event).not.toHaveProperty('date');
  });

  it('reduz a data para a semana ISO', () => {
    expect(event.played_week).toBe('2026-W33');
  });

  it('preserva os campos de meta', () => {
    expect(event).toMatchObject({
      install_id: 'install-abc',
      format: 'Commander',
      archetype: 'Aggro',
      my_deck: 'Atraxa',
      opp_deck: 'Edgar Markov',
      on_play: true,
      won: false,
      drew: true,
    });
  });

  it('normaliza drew ausente para false', () => {
    const { drew, ...semDrew } = match;
    expect(toEvent(semDrew as Match, 'x').drew).toBe(false);
  });
});
