/**
 * Casamento de nome falado contra o que já existe no aparelho.
 *
 * O modelo recebe as listas no prompt e é instruído a preferir os nomes que
 * estão nelas, mas um modelo de 0,5 B erra isso com frequência: devolve
 * "atraxa" quando o deck cadastrado é "Atraxa Superfriends", ou "loja do ze"
 * quando o local é "Loja do Zé". Confiar só no prompt cria um deck novo a cada
 * partida e parte as estatísticas em dez nomes quase iguais.
 *
 * Então a decisão final é aqui, em código determinístico e testável: o que o
 * modelo devolve é uma sugestão, e esta função a encaixa no que já existe
 * quando é claramente a mesma coisa.
 */

/** Minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizeName(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras curtas demais para distinguir uma coisa da outra. */
const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'the', 'of', 'e', 'and']);

function tokens(s: string): string[] {
  return normalizeName(s).split(' ').filter(w => w && !STOP.has(w));
}

/**
 * Quanto dois nomes se parecem, de 0 a 1.
 *
 * Não é distância de edição: o caso real não é erro de digitação, é nome
 * parcial — a pessoa fala "Atraxa" e o deck cadastrado é "Atraxa
 * Superfriends". Por isso a conta é sobre palavras em comum, e o denominador
 * é o menor dos dois: um nome curto contido inteiro num longo vale 1.
 */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const setB = new Set(tb);
  const comuns = ta.filter(w => setB.has(w)).length;
  if (comuns === 0) return 0;

  return comuns / Math.min(ta.length, tb.length);
}

/**
 * Encaixa `input` num dos `candidates`, ou devolve null.
 *
 * O limiar é alto de propósito. Errar para o lado de não casar cria um nome
 * novo, que a pessoa vê na tela de revisão e corrige em um toque. Errar para
 * o lado de casar grava a partida no deck errado e ninguém percebe.
 */
export function matchKnown(
  input: string | undefined,
  candidates: readonly string[],
  threshold = 0.75
): string | null {
  if (!input?.trim() || candidates.length === 0) return null;

  let melhor: string | null = null;
  let melhorScore = 0;

  for (const c of candidates) {
    const score = similarity(input, c);
    if (score > melhorScore) {
      melhorScore = score;
      melhor = c;
    }
  }

  return melhorScore >= threshold ? melhor : null;
}

/**
 * Devolve o nome cadastrado quando reconhece, e o falado quando não.
 * É o que a tela de revisão exibe já preenchido.
 */
export function snapToKnown(
  input: string | undefined,
  candidates: readonly string[]
): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  return matchKnown(trimmed, candidates) ?? trimmed;
}
