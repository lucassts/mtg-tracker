/**
 * social.ts — conta anônima, vínculos entre jogadores, locais e confirmação
 * de partida. É a única porta do app para o lado social do Supabase.
 *
 * Nada aqui roda sem o usuário ligar explicitamente em Configurações. A conta
 * é anônima: sem e-mail, sem senha, sem nome real. O que ela dá é um
 * identificador estável, que é o mínimo para um oponente conseguir confirmar
 * uma partida sua — ver docs/rfc-001.
 */

import { getSupabase } from './supabase';
import { Match, TelemetryEvent, VenueKind } from '../types';
import { isoWeek, toEvent } from './telemetry';
import { APP_VERSION } from '../config';

export interface RemotePlayer {
  id: string;
  display_name: string;
}

export interface RemoteVenue {
  id: string;
  name: string;
  kind: VenueKind;
  city: string;
  country: string;
  score?: number;
}

export interface PendingClaim {
  id: string;
  reporter_id: string;
  reporterName: string;
  payload: TelemetryEvent & { venue_id?: string };
  created_at: string;
}

class NotConfiguredError extends Error {
  constructor() {
    super('Este build não tem servidor configurado.');
    this.name = 'NotConfiguredError';
  }
}

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) throw new NotConfiguredError();
  return supabase;
}

// ─── Conta ──────────────────────────────────────────────────

/** Devolve o id da conta atual, ou null se ninguém entrou ainda. */
export async function currentPlayerId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Liga a parte social: cria a conta anônima se não existir e registra o
 * apelido. Idempotente — chamar de novo só atualiza o apelido.
 */
export async function enableSocial(displayName: string): Promise<RemotePlayer> {
  const supabase = requireClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  const { data, error } = await supabase.rpc('ensure_player', {
    p_display_name: displayName.trim().slice(0, 40),
  });
  if (error) throw error;
  return data as RemotePlayer;
}

/** Sai da conta. Os dados locais continuam; só o vínculo remoto para. */
export async function disableSocial(): Promise<void> {
  const supabase = getSupabase();
  await supabase?.auth.signOut();
}

// ─── Vínculo entre jogadores ────────────────────────────────

export async function createInvite(): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('create_invite');
  if (error) throw error;
  return String(data);
}

export interface InviteStatus {
  used: boolean;
  playerId?: string;
  playerName?: string;
}

/**
 * Diz se um convite já foi aceito. Quem convida não é avisado — o resgate
 * acontece no aparelho do outro — então o app pergunta ao abrir a tela.
 */
export async function inviteStatus(code: string): Promise<InviteStatus> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('invite_status', { p_code: code });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { used: false };
  return {
    used: Boolean(row.used),
    playerId: row.player_id ?? undefined,
    playerName: row.player_name || undefined,
  };
}

export async function redeemInvite(code: string): Promise<RemotePlayer> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('redeem_invite', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('convite inválido');
  return { id: row.inviter_id, display_name: row.inviter_name };
}

// ─── Locais ─────────────────────────────────────────────────

/**
 * Busca antes de criar. É a peça que impede a base virar dez "Loja do Zé":
 * a interface só oferece criar depois de mostrar o que já existe.
 */
export async function searchVenues(query: string, city = ''): Promise<RemoteVenue[]> {
  const supabase = getSupabase();
  if (!supabase || !query.trim()) return [];

  const { data, error } = await supabase.rpc('search_venues', {
    p_query: query.trim(),
    p_city: city.trim(),
  });
  if (error) throw error;
  return (data ?? []) as RemoteVenue[];
}

export async function createVenue(input: {
  name: string;
  kind: Exclude<VenueKind, 'casa'>;
  city?: string;
  country?: string;
}): Promise<RemoteVenue> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('create_venue', {
    p_name: input.name,
    p_kind: input.kind,
    p_city: input.city ?? '',
    p_country: input.country ?? '',
  });
  if (error) throw error;
  return data as RemoteVenue;
}

// ─── Partidas verificadas ───────────────────────────────────

/** Monta o payload da reivindicação: o evento anônimo mais o local. */
export function claimPayload(
  match: Match,
  installId: string,
  venueId?: string
): TelemetryEvent & { venue_id?: string } {
  const event = toEvent(match, installId);
  return venueId ? { ...event, venue_id: venueId } : event;
}

/**
 * Registra a partida para o oponente confirmar. Devolve o id da
 * reivindicação, que o aparelho guarda junto da partida local.
 */
export async function submitClaim(
  opponentPlayerId: string,
  payload: TelemetryEvent & { venue_id?: string }
): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('submit_claim', {
    p_opponent: opponentPlayerId,
    p_payload: payload,
  });
  if (error) throw error;
  return String(data);
}

/** Partidas que alguém registrou contra você e estão esperando resposta. */
export async function listPendingClaims(): Promise<PendingClaim[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const me = await currentPlayerId();
  if (!me) return [];

  const { data, error } = await supabase
    .from('match_claims')
    .select('id, reporter_id, payload, created_at, players!match_claims_reporter_id_fkey(display_name)')
    .eq('opponent_id', me)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    reporter_id: String(row.reporter_id),
    reporterName:
      (row.players as { display_name?: string } | null)?.display_name || '',
    payload: row.payload as TelemetryEvent & { venue_id?: string },
    created_at: String(row.created_at),
  }));
}

export async function resolveClaim(claimId: string, accept: boolean): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('resolve_claim', {
    p_claim: claimId,
    p_accept: accept,
  });
  if (error) throw error;
  return String(data);
}

/** Reexportado para a interface montar o resumo de uma reivindicação. */
export { isoWeek, APP_VERSION };
