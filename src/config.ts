/**
 * Configuração vinda do ambiente de build.
 *
 * Variáveis `EXPO_PUBLIC_*` são embutidas no bundle pelo Expo — ou seja, são
 * públicas por definição. Só entra aqui o que pode ser lido por qualquer um que
 * abra o APK: a URL do projeto Supabase e a chave `anon`, que sozinha não dá
 * acesso a nada além do que a policy de RLS permitir (inserir na fila anônima).
 *
 * Sem essas variáveis o app funciona normalmente e a telemetria vira no-op.
 * É esse o caso de quem clonar o repositório sem configurar nada.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Tabela que recebe os eventos anônimos. */
export const TELEMETRY_TABLE = 'matches_anon';

/** Só tenta enviar se as duas variáveis existirem. */
export const TELEMETRY_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const APP_VERSION = '1.0.0';
