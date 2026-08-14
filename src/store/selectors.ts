import React from 'react';
import { useStore } from './useStore';

/**
 * Seletores derivados.
 *
 * Regra que vale para todos: um seletor passado a `useStore` precisa devolver
 * referência estável. O zustand v5 compara o resultado com `Object.is` a cada
 * render, então `useStore(s => s.algo.filter(...))` cria array novo toda vez,
 * a comparação nunca bate e o componente entra em loop de re-render.
 *
 * O padrão correto é o daqui: selecionar as fatias cruas e derivar com
 * `useMemo`.
 */

/** Sugestões de deck: cadastrados primeiro, histórico completa. */
export function useRecentDecks(): string[] {
  const decks = useStore(s => s.decks);
  const matches = useStore(s => s.matches);

  return React.useMemo(() => {
    const registered = decks.filter(d => !d.archived).map(d => d.name);
    const played = matches.map(m => m.myDeck).filter(Boolean);
    return [...new Set([...registered, ...played])].slice(0, 8);
  }, [decks, matches]);
}

/** Versões de um deck, da mais recente para a mais antiga. */
export function useDeckVersions(deckId: string) {
  const all = useStore(s => s.deckVersions);

  return React.useMemo(
    () => all
      .filter(v => v.deckId === deckId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, deckId]
  );
}
