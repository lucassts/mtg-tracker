import { DeckCard, ParsedDecklist } from '../types';

/**
 * Interpreta uma lista colada no formato do MTGO:
 *
 *     4 Lightning Bolt
 *     2 Ragavan, Nimble Pilferer
 *
 *     3 Pyroblast
 *
 * A regra do MTGO é posicional: a primeira linha em branco separa o main do
 * sideboard. Isso é frágil quando a pessoa cola com linhas em branco no meio,
 * então também aceitamos um cabeçalho explícito (`Sideboard`, `Reserva`), que
 * é o que Arena e a maioria dos sites exportam. O cabeçalho ganha da linha em
 * branco quando os dois aparecem.
 *
 * Tolera o que aparece na prática: `4x Bolt`, numeral separado por tabulação,
 * o sufixo de coleção do Arena (`4 Bolt (M21) 139`) e comentários com `//`.
 * O que não casar volta em `ignored` — sem bloquear o salvamento, porque a
 * lista é do jogador e não cabe ao app recusá-la.
 */

const SIDEBOARD_HEADERS = /^(sideboard|side ?board|reserva|サイドボード)\b[:\s]*$/i;
const DECK_HEADERS = /^(deck|maindeck|main ?deck|main|companion|commander|メインデッキ)\b[:\s]*$/i;
/** `4 Nome`, `4x Nome`, `4 Nome (SET) 123` — a coleção é descartada. */
const CARD_LINE = /^(\d{1,3})\s*x?\s+(.+?)(?:\s+\([A-Za-z0-9]{2,5}\)(?:\s+\S+)?)?$/;

const MAX_QTY = 999;

function parseLine(line: string): DeckCard | null {
  const m = CARD_LINE.exec(line);
  if (!m) return null;
  const qty = Math.min(parseInt(m[1], 10), MAX_QTY);
  const name = m[2].trim();
  if (!qty || !name) return null;
  return { qty, name };
}

function merge(cards: DeckCard[]): DeckCard[] {
  // A mesma carta pode vir em duas linhas quando alguém junta duas listas.
  // Somar é o comportamento que o MTGO tem e o que o jogador espera.
  const order: string[] = [];
  const byName = new Map<string, DeckCard>();
  cards.forEach(c => {
    const key = c.name.toLowerCase();
    const found = byName.get(key);
    if (found) { found.qty = Math.min(found.qty + c.qty, MAX_QTY); return; }
    byName.set(key, { ...c });
    order.push(key);
  });
  return order.map(k => byName.get(k)!);
}

export function parseDecklist(text: string): ParsedDecklist {
  const main: DeckCard[] = [];
  const side: DeckCard[] = [];
  const ignored: string[] = [];

  // Comentário sai antes de tudo: uma linha só de comentário não é conteúdo
  // ignorado nem separador, é ausência de linha.
  const lines = (text || '')
    .split(/\r?\n/)
    .map(l => l.replace(/\/\/.*$/, '').trim());

  // Decidido antes do laço de propósito: um cabeçalho lá embaixo precisa
  // invalidar a linha em branco lá em cima, e não só o que vem depois dele.
  const hasHeader = lines.some(l => SIDEBOARD_HEADERS.test(l));

  let inSide = false;
  let seenCard = false;

  for (const line of lines) {
    if (SIDEBOARD_HEADERS.test(line)) { inSide = true; continue; }
    if (DECK_HEADERS.test(line)) { inSide = false; continue; }

    if (!line) {
      // Linha em branco só separa quando não há cabeçalho para mandar, e só
      // depois de já ter vindo alguma carta — senão o espaço antes da lista
      // jogaria tudo para o sideboard.
      if (!hasHeader && seenCard) inSide = true;
      continue;
    }

    const card = parseLine(line);
    if (!card) { ignored.push(line); continue; }
    seenCard = true;
    (inSide ? side : main).push(card);
  }

  const mergedMain = merge(main);
  const mergedSide = merge(side);

  return {
    main: mergedMain,
    side: mergedSide,
    mainCount: mergedMain.reduce((n, c) => n + c.qty, 0),
    sideCount: mergedSide.reduce((n, c) => n + c.qty, 0),
    ignored,
  };
}

/** Reescreve no formato canônico do MTGO, para copiar de volta. */
export function formatDecklist(parsed: ParsedDecklist): string {
  const block = (cards: DeckCard[]) => cards.map(c => `${c.qty} ${c.name}`).join('\n');
  return parsed.sideCount > 0
    ? `${block(parsed.main)}\n\n${block(parsed.side)}`
    : block(parsed.main);
}
