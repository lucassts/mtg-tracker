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

/**
 * O que a IA recebe para preencher em vez de inventar.
 *
 * Tudo ordenado por uso recente porque o prompt corta a cauda: o que fica são
 * os nomes que a pessoa realmente usa, que é onde o casamento importa.
 */
export function useKnownNames() {
  const decks = useStore(s => s.decks);
  const matches = useStore(s => s.matches);
  const opponents = useStore(s => s.opponents);
  const venues = useStore(s => s.venues);

  return React.useMemo(() => {
    const porUso = (nomes: string[]) => {
      const contagem = new Map<string, number>();
      nomes.filter(Boolean).forEach(n => contagem.set(n, (contagem.get(n) ?? 0) + 1));
      return [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
    };

    const registrados = decks.filter(d => !d.archived).map(d => d.name);

    return {
      decks: [...new Set([...registrados, ...porUso(matches.map(m => m.myDeck))])],
      oppDecks: porUso(matches.map(m => m.oppDeck)),
      opponents: opponents.map(o => o.nickname),
      venues: venues.map(v => v.name),
    };
  }, [decks, matches, opponents, venues]);
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
