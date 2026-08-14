import { parseDecklist, formatDecklist } from '../decklist';

describe('parseDecklist', () => {
  it('separa main e sideboard pela linha em branco, como o MTGO', () => {
    const r = parseDecklist('4 Lightning Bolt\n2 Ragavan, Nimble Pilferer\n\n3 Pyroblast');
    expect(r.main).toEqual([
      { qty: 4, name: 'Lightning Bolt' },
      { qty: 2, name: 'Ragavan, Nimble Pilferer' },
    ]);
    expect(r.side).toEqual([{ qty: 3, name: 'Pyroblast' }]);
    expect(r.mainCount).toBe(6);
    expect(r.sideCount).toBe(3);
  });

  it('o cabecalho explicito manda mais que a linha em branco', () => {
    const r = parseDecklist('Deck\n4 Bolt\n\n4 Opt\n\nSideboard\n2 Pyroblast');
    expect(r.mainCount).toBe(8);
    expect(r.side).toEqual([{ qty: 2, name: 'Pyroblast' }]);
  });

  it('linha em branco antes da primeira carta nao joga tudo para o sideboard', () => {
    const r = parseDecklist('\n\n4 Bolt\n4 Opt');
    expect(r.mainCount).toBe(8);
    expect(r.sideCount).toBe(0);
  });

  it('aceita 4x, tabulacao e o sufixo de colecao do Arena', () => {
    const r = parseDecklist('4x Bolt\n2\tOpt\n1 Ragavan, Nimble Pilferer (MH2) 138');
    expect(r.main).toEqual([
      { qty: 4, name: 'Bolt' },
      { qty: 2, name: 'Opt' },
      { qty: 1, name: 'Ragavan, Nimble Pilferer' },
    ]);
  });

  it('soma linhas repetidas da mesma carta', () => {
    const r = parseDecklist('2 Bolt\n2 bolt');
    expect(r.main).toEqual([{ qty: 4, name: 'Bolt' }]);
    expect(r.mainCount).toBe(4);
  });

  it('descarta comentario e devolve o que nao casou em ignored', () => {
    const r = parseDecklist('// meu deck\n4 Bolt\nisto nao e uma carta');
    expect(r.main).toEqual([{ qty: 4, name: 'Bolt' }]);
    expect(r.ignored).toEqual(['isto nao e uma carta']);
  });

  it('lista vazia nao quebra', () => {
    const r = parseDecklist('');
    expect(r.mainCount).toBe(0);
    expect(r.sideCount).toBe(0);
    expect(r.ignored).toEqual([]);
  });

  it('formatDecklist volta ao formato canonico', () => {
    const r = parseDecklist('4x Bolt\n\n2x Pyroblast');
    expect(formatDecklist(r)).toBe('4 Bolt\n\n2 Pyroblast');
  });
});
