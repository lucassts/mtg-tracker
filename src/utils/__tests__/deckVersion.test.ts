import { defaultDeckVersion, lastUseOfDeck } from '../deckVersion';

const v = (label: string, createdAt: string) => ({ label, createdAt });

const V1 = v('v1', '2026-01-10T00:00:00.000Z');
const V2 = v('v2 pós-ban', '2026-03-01T00:00:00.000Z');
const TODAS = [V1, V2];

describe('defaultDeckVersion', () => {
  it('deck sem versões não marca nada', () => {
    expect(defaultDeckVersion([], { date: '2026-04-01T00:00:00.000Z' })).toBeUndefined();
  });

  it('sem partida anterior, marca a versão criada mais recentemente', () => {
    expect(defaultDeckVersion(TODAS)).toBe('v2 pós-ban');
  });

  it('versão criada depois da última partida ganha da usada', () => {
    // Jogou v1 em fevereiro; criou a v2 em março. Vai jogar a v2.
    const usou = { deckVersion: 'v1', date: '2026-02-01T00:00:00.000Z' };
    expect(defaultDeckVersion(TODAS, usou)).toBe('v2 pós-ban');
  });

  it('versão usada depois da criação da mais nova continua marcada', () => {
    // Criou a v2 mas seguiu jogando a v1 em abril: não troca o deck dele.
    const usou = { deckVersion: 'v1', date: '2026-04-01T00:00:00.000Z' };
    expect(defaultDeckVersion(TODAS, usou)).toBe('v1');
  });

  it('quem jogou sem versão depois da última criada continua sem versão', () => {
    const usou = { date: '2026-04-01T00:00:00.000Z' };
    expect(defaultDeckVersion(TODAS, usou)).toBeUndefined();
  });

  it('rótulo que não existe mais cai na versão mais recente', () => {
    const usou = { deckVersion: 'apagada', date: '2026-04-01T00:00:00.000Z' };
    expect(defaultDeckVersion(TODAS, usou)).toBe('v2 pós-ban');
  });

  it('ordem da lista de versões não importa', () => {
    expect(defaultDeckVersion([V2, V1])).toBe('v2 pós-ban');
    expect(defaultDeckVersion([V1, V2])).toBe('v2 pós-ban');
  });

  it('empate entre criação e partida fica com a usada', () => {
    const usou = { deckVersion: 'v1', date: V2.createdAt };
    expect(defaultDeckVersion(TODAS, usou)).toBe('v1');
  });
});

describe('lastUseOfDeck', () => {
  const partidas = [
    { myDeck: 'Atraxa', deckVersion: 'v1', date: '2026-02-01T00:00:00.000Z' },
    { myDeck: 'atraxa ', deckVersion: 'v2', date: '2026-05-01T00:00:00.000Z' },
    { myDeck: 'Turbo Doomsday', deckVersion: 'v9', date: '2026-06-01T00:00:00.000Z' },
  ];

  it('pega a partida mais recente do deck, ignorando caixa e espaço', () => {
    expect(lastUseOfDeck(partidas, 'ATRAXA')).toEqual({
      deckVersion: 'v2',
      date: '2026-05-01T00:00:00.000Z',
    });
  });

  it('deck nunca jogado não tem último uso', () => {
    expect(lastUseOfDeck(partidas, 'Burn')).toBeUndefined();
  });

  it('nome vazio não casa com nada', () => {
    expect(lastUseOfDeck(partidas, '  ')).toBeUndefined();
  });

  it('a lista não precisa estar ordenada', () => {
    const fora = [partidas[1], partidas[0]];
    expect(lastUseOfDeck(fora, 'Atraxa')?.date).toBe('2026-05-01T00:00:00.000Z');
  });
});
