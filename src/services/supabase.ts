/**
 * Cliente Supabase — só existe quando o build tem servidor configurado.
 *
 * Toda a parte social (conta, oponentes vinculados, locais compartilhados,
 * confirmação de partida) passa por aqui. Sem as variáveis de ambiente,
 * `getSupabase()` devolve null e as telas mostram o estado "não configurado"
 * em vez de quebrar — que é o caso de quem clona o repositório.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, TELEMETRY_CONFIGURED } from '../config';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!TELEMETRY_CONFIGURED) return null;
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // O app não abre por URL de callback: a sessão vem de login anônimo,
      // e deep link de convite é tratado à mão em linking.ts.
      detectSessionInUrl: false,
    },
  });
  return client;
}

export const SOCIAL_AVAILABLE = TELEMETRY_CONFIGURED;
