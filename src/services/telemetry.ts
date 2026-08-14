/**
 * telemetry.ts
 * Envio anônimo e agregável de resultados de partida.
 *
 * Contrato com o usuário — o que sai do aparelho:
 *   formato · arquétipo · deck próprio · deck do oponente · começou ou não ·
 *   vitória/derrota/empate · semana ISO da partida · versão do app · id da instalação
 *
 * O que NUNCA sai:
 *   áudio · transcrição · notas · nome · data exata · localização · qualquer id de conta
 *
 * O `install_id` é um UUID sorteado na primeira execução. Ele existe para
 * deduplicar e para medir retenção agregada, não para identificar pessoa.
 * Apagar os dados do app o descarta; a próxima execução sorteia outro.
 *
 * Nada é enviado enquanto `settings.shareAnon` estiver desligado, e nada é
 * enviado se o build não tiver Supabase configurado (ver src/config.ts).
 */

import * as Crypto from 'expo-crypto';
import { Match, TelemetryEvent } from '../types';
import {
  APP_VERSION,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  TELEMETRY_CONFIGURED,
  TELEMETRY_TABLE,
} from '../config';

/** Acima disso a fila para de crescer — descarta o mais antigo. */
export const QUEUE_LIMIT = 500;

/** Quantos eventos vão por requisição. */
const BATCH_SIZE = 50;

export function newInstallId(): string {
  return Crypto.randomUUID();
}

/**
 * Semana ISO 8601 da partida, no formato `AAAA-Www`.
 * Granularidade proposital: dá para ver evolução do meta sem saber quando a
 * pessoa jogou.
 */
export function isoWeek(date: Date): string {
  // Copia em UTC para não deixar o fuso empurrar a data para outro dia.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Quinta-feira da mesma semana define o ano ISO.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Converte uma partida local no evento que sai do aparelho.
 * Repare no que não é copiado: `notes`, `date` exata e `id` local.
 */
export function toEvent(match: Match, installId: string): TelemetryEvent {
  return {
    install_id: installId,
    event_id: Crypto.randomUUID(),
    format: match.format,
    archetype: match.archetype,
    my_deck: match.myDeck,
    opp_deck: match.oppDeck,
    on_play: match.onPlay,
    won: match.won,
    drew: match.drew === true,
    played_week: isoWeek(new Date(match.date)),
    app_version: APP_VERSION,
  };
}

export interface FlushResult {
  /** Eventos aceitos pelo servidor — podem sair da fila. */
  sent: number;
  /** Eventos que ficaram na fila (falha de rede, servidor fora, opt-out). */
  remaining: TelemetryEvent[];
  error?: string;
}

/**
 * Envia a fila em lotes. Falha de rede não perde dado: o que não foi aceito
 * volta em `remaining` e tenta de novo na próxima chamada.
 *
 * `Prefer: resolution=ignore-duplicates` faz o Postgres ignorar `event_id`
 * repetido, então reenviar um lote que na verdade chegou não duplica nada.
 */
export async function flushQueue(queue: TelemetryEvent[]): Promise<FlushResult> {
  if (!TELEMETRY_CONFIGURED) {
    return { sent: 0, remaining: queue, error: 'not-configured' };
  }
  if (queue.length === 0) return { sent: 0, remaining: [] };

  const endpoint = `${SUPABASE_URL}/rest/v1/${TELEMETRY_TABLE}`;
  let sent = 0;

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=minimal,resolution=ignore-duplicates',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        return {
          sent,
          remaining: queue.slice(i),
          error: `HTTP ${res.status}`,
        };
      }
      sent += batch.length;
    } catch (e) {
      return {
        sent,
        remaining: queue.slice(i),
        error: e instanceof Error ? e.message : 'network',
      };
    }
  }

  return { sent, remaining: [] };
}
