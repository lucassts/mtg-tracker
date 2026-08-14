import React from 'react';
import * as Linking from 'expo-linking';
import { useStore } from '../store/useStore';
import { parseInviteUrl } from '../services/linking';
import { redeemInvite } from '../services/social';
import { useT } from '../i18n/useT';

interface Banner {
  kind: 'ok' | 'error';
  message: string;
}

/**
 * Aceita convites que chegam por link ou QR.
 *
 * Cobre os dois caminhos: o app aberto pelo link (getInitialURL) e o app já
 * aberto recebendo um (addEventListener). O código é resgatado uma vez só —
 * `handled` evita reprocessar a mesma URL quando a tela remonta.
 */
export function useInviteLink() {
  const t = useT();
  const o = t.opponents;

  const socialOn = useStore(s => s.settings.social.enabled);
  const addOpponent = useStore(s => s.addOpponent);
  const updateOpponent = useStore(s => s.updateOpponent);

  const [banner, setBanner] = React.useState<Banner | null>(null);
  const handled = React.useRef<Set<string>>(new Set());

  const consume = React.useCallback(async (url: string | null) => {
    const code = parseInviteUrl(url ?? '');
    if (!code || handled.current.has(code)) return;
    handled.current.add(code);

    if (!socialOn) {
      setBanner({ kind: 'error', message: o.linkNeedsSocial });
      return;
    }

    try {
      const player = await redeemInvite(code);
      const name = player.display_name || o.defaultOpponentName;
      const created = addOpponent(name);
      if (created) {
        updateOpponent(created.id, {
          linkState: 'linked',
          playerId: player.id,
          remoteName: player.display_name,
        });
      }
      setBanner({ kind: 'ok', message: o.linkOk(name) });
    } catch (e) {
      setBanner({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [socialOn, addOpponent, updateOpponent, o]);

  React.useEffect(() => {
    void Linking.getInitialURL().then(consume);
    const sub = Linking.addEventListener('url', ({ url }) => { void consume(url); });
    return () => sub.remove();
  }, [consume]);

  // O aviso some sozinho; erro fica mais tempo porque exige leitura.
  React.useEffect(() => {
    if (!banner) return;
    const ms = banner.kind === 'ok' ? 5000 : 9000;
    const handle = setTimeout(() => setBanner(null), ms);
    return () => clearTimeout(handle);
  }, [banner]);

  return { banner, dismiss: () => setBanner(null) };
}
