import React from 'react';

/**
 * Versão web do "manter a tela ligada".
 *
 * `expo-keep-awake` usa a Wake Lock API, que o navegador só concede a uma aba
 * visível — e rejeita com `NotAllowedError` quando não está. Como a rejeição
 * acontece fora do nosso controle, ela vira unhandled rejection e polui o
 * console. Aqui pedimos o lock à mão, tratando a recusa como o que ela é: um
 * caso normal, não um erro.
 */
export function useScreenAwake(): void {
  React.useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: any }).wakeLock;
    if (!wakeLock) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await wakeLock.request('screen');
        if (cancelled) { void lock.release(); return; }
        sentinel = lock;
      } catch {
        // Aba em segundo plano, bateria fraca ou política do navegador.
        // Nada a fazer: a tela apaga como apagaria normalmente.
      }
    };

    // O navegador solta o lock sozinho ao esconder a aba; ao voltar, refaz.
    const onVisibility = () => { if (document.visibilityState === 'visible') void request(); };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, []);
}
