/**
 * Quando vale a pena falar com o servidor.
 *
 * A sincronização é disparada de quatro lugares — ao abrir, ao voltar para o
 * primeiro plano, no relógio de 30 minutos e no botão — e nada impede que os
 * quatro caiam juntos: abrir o app com o timer vencido e tocar em atualizar
 * são três chamadas em dois segundos. Sem uma regra única, o servidor recebe
 * rajada por um ganho de zero.
 *
 * A regra vive aqui, e não dentro da store, para poder ser testada sem montar
 * o app inteiro.
 */

/** Intervalo mínimo entre duas idas ao servidor. */
export const MIN_INTERVAL_MS = 60_000;

/** De quanto em quanto tempo o app sincroniza sozinho, com o app aberto. */
export const AUTO_INTERVAL_MS = 30 * 60_000;

export type SyncOutcome =
  /** Falou com o servidor. */
  | 'ok'
  /** Pulou: a última foi há menos de um minuto. */
  | 'skipped'
  /** Sem conta conectada — não há o que sincronizar. */
  | 'off'
  | 'error';

/**
 * `force` existe para um caso só, e é importante: ao salvar uma partida, ela
 * precisa estar no servidor ANTES da reivindicação sair, senão o servidor não
 * acha a linha para irmanar com a do oponente. Esperar o minuto ali quebraria
 * o pareamento; nos outros lugares, esperar não custa nada.
 */
export function shouldSync(
  lastAt: string | undefined,
  now: number,
  force = false
): boolean {
  if (force || !lastAt) return true;
  const last = new Date(lastAt).getTime();
  if (Number.isNaN(last)) return true;
  // Relógio do aparelho andando para trás não pode travar a sincronização
  // para sempre.
  if (last > now) return true;
  return now - last >= MIN_INTERVAL_MS;
}

/** Quantos segundos faltam para a próxima ser permitida. 0 = já pode. */
export function secondsUntilNext(lastAt: string | undefined, now: number): number {
  if (!lastAt) return 0;
  const last = new Date(lastAt).getTime();
  if (Number.isNaN(last) || last > now) return 0;
  return Math.max(0, Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000));
}
