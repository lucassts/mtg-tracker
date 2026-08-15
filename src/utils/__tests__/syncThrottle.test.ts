import { shouldSync, secondsUntilNext, MIN_INTERVAL_MS } from '../syncThrottle';

const AGORA = new Date('2026-08-15T12:00:00.000Z').getTime();
const emSegundos = (s: number) => new Date(AGORA - s * 1000).toISOString();

describe('shouldSync', () => {
  it('libera na primeira vez, sem histórico', () => {
    expect(shouldSync(undefined, AGORA)).toBe(true);
  });

  it('bloqueia dentro do minuto', () => {
    expect(shouldSync(emSegundos(10), AGORA)).toBe(false);
    expect(shouldSync(emSegundos(59), AGORA)).toBe(false);
  });

  it('libera exatamente no minuto', () => {
    expect(shouldSync(emSegundos(60), AGORA)).toBe(true);
  });

  it('force ignora o intervalo — e precisa, porque a reivindicação depende', () => {
    expect(shouldSync(emSegundos(1), AGORA, true)).toBe(true);
  });

  it('data inválida não trava a sincronização', () => {
    expect(shouldSync('não é data', AGORA)).toBe(true);
  });

  it('relógio do aparelho no futuro não trava para sempre', () => {
    const futuro = new Date(AGORA + 3600_000).toISOString();
    expect(shouldSync(futuro, AGORA)).toBe(true);
  });
});

describe('secondsUntilNext', () => {
  it('zero quando nunca sincronizou', () => {
    expect(secondsUntilNext(undefined, AGORA)).toBe(0);
  });

  it('conta o que falta do minuto', () => {
    expect(secondsUntilNext(emSegundos(20), AGORA)).toBe(40);
  });

  it('zero quando o minuto já passou', () => {
    expect(secondsUntilNext(emSegundos(120), AGORA)).toBe(0);
  });

  it('nunca passa do intervalo cheio', () => {
    expect(secondsUntilNext(emSegundos(0), AGORA)).toBe(MIN_INTERVAL_MS / 1000);
  });
});
