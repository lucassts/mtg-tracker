/**
 * Deep link de convite.
 *
 * O QR e o link carregam o mesmo código. O endereço https existe para quem
 * ainda não tem o app instalado: abre o preview web, que explica o que é e
 * oferece o código para colar.
 */

import * as Linking from 'expo-linking';

/** Precisa bater com `expo.scheme` no app.json. */
export const APP_SCHEME = 'mtgtracker';

/** Página que atende o link quando o app não está instalado. */
export const WEB_BASE = 'https://mtg-tracker-livid.vercel.app';

export function inviteUrl(code: string): string {
  return `${WEB_BASE}/link/${code}`;
}

export function inviteDeepLink(code: string): string {
  return `${APP_SCHEME}://link/${code}`;
}

/**
 * Extrai o código de convite de uma URL, seja o esquema do app ou o https.
 * Devolve null quando a URL não é um convite.
 */
export function parseInviteUrl(url: string): string | null {
  if (!url) return null;
  try {
    const { path } = Linking.parse(url);
    const match = (path ?? '').match(/(?:^|\/)link\/([A-Za-z0-9]+)/);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}
