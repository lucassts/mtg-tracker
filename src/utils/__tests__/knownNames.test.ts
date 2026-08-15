import { normalizeName, similarity, matchKnown, snapToKnown } from '../knownNames';

describe('normalizeName', () => {
  it('tira acento, pontuacao e caixa', () => {
    expect(normalizeName('Loja do Zé!')).toBe('loja do ze');
    expect(normalizeName("Atraxa,  Praetors' Voice")).toBe('atraxa praetors voice');
  });

  it('nao quebra com vazio', () => {
    expect(normalizeName('')).toBe('');
  });
});

describe('similarity', () => {
  it('nome identico vale 1', () => {
    expect(similarity('Atraxa', 'atraxa')).toBe(1);
  });

  it('nome curto contido no longo vale 1', () => {
    expect(similarity('Atraxa', 'Atraxa Superfriends')).toBe(1);
  });

  it('nomes sem palavra em comum valem 0', () => {
    expect(similarity('Burn', 'Yuriko')).toBe(0);
  });

  it('ignora conectivos ao comparar', () => {
    expect(similarity('Loja do Ze', 'Loja Ze')).toBe(1);
  });
});

describe('matchKnown', () => {
  const decks = ['Atraxa Superfriends', 'Kinnan Combo', 'Burn'];

  it('encaixa o nome parcial no deck cadastrado', () => {
    expect(matchKnown('atraxa', decks)).toBe('Atraxa Superfriends');
  });

  it('encaixa ignorando acento', () => {
    expect(matchKnown('Loja do Ze', ['Loja do Zé'])).toBe('Loja do Zé');
  });

  it('devolve null quando nao ha parecido', () => {
    expect(matchKnown('Tron', decks)).toBeNull();
  });

  it('devolve null com entrada vazia ou lista vazia', () => {
    expect(matchKnown('', decks)).toBeNull();
    expect(matchKnown('atraxa', [])).toBeNull();
  });

  it('nao casa por uma palavra solta em nome longo', () => {
    // "Combo" sozinho nao pode virar "Kinnan Combo": e generico demais.
    expect(matchKnown('Combo Storm Bruto', decks)).toBeNull();
  });
});

describe('snapToKnown', () => {
  const decks = ['Atraxa Superfriends'];

  it('usa o nome cadastrado quando reconhece', () => {
    expect(snapToKnown('atraxa', decks)).toBe('Atraxa Superfriends');
  });

  it('mantem o falado quando nao reconhece', () => {
    expect(snapToKnown('Tron', decks)).toBe('Tron');
  });

  it('vazio continua indefinido', () => {
    expect(snapToKnown('   ', decks)).toBeUndefined();
    expect(snapToKnown(undefined, decks)).toBeUndefined();
  });
});
