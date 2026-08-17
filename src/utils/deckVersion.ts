/**
 * Qual versão do deck já vem marcada ao registrar uma partida.
 *
 * A regra é uma só: entre a versão que o jogador usou por último e a versão
 * mais recente que ele criou, vence a mais recente das duas.
 *
 * Ela existe porque as duas situações são comuns e pedem respostas opostas.
 * Quem acabou de montar uma lista nova vai jogar com ela — a versão criada
 * depois da última partida é a aposta certa. Quem criou uma variante e
 * continuou jogando a antiga não quer que o app troque o deck dele toda vez.
 * Comparar as duas datas resolve os dois casos sem perguntar nada.
 *
 * Vale para o formulário e para o que a IA preenche: quando nada foi dito
 * sobre a versão, o campo nasce daqui.
 */

export interface VersionInfo {
  label: string;
  createdAt: string;
}

export interface LastUse {
  /** Rótulo usado naquela partida. Ausente = jogou sem versão. */
  deckVersion?: string;
  /** Quando a partida foi jogada. */
  date: string;
}

/**
 * @param versions  Versões do deck escolhido, em qualquer ordem.
 * @param lastUse   A partida mais recente com esse deck, se houver.
 * @returns O rótulo a marcar, ou `undefined` para "sem versão".
 */
export function defaultDeckVersion(
  versions: VersionInfo[],
  lastUse?: LastUse
): string | undefined {
  if (versions.length === 0) return undefined;

  const newest = versions.reduce((a, b) =>
    b.createdAt.localeCompare(a.createdAt) > 0 ? b : a
  );

  if (!lastUse) return newest.label;

  if (newest.createdAt.localeCompare(lastUse.date) > 0) return newest.label;

  // Jogou sem versão depois de a última ter sido criada: foi escolha dele, e
  // marcar uma versão agora seria desfazê-la.
  if (lastUse.deckVersion === undefined) return undefined;

  // Rótulo apagado ou renomeado depois da partida: não dá para remarcar o que
  // não existe mais, então cai na mais recente.
  const aindaExiste = versions.some(v => v.label === lastUse.deckVersion);
  return aindaExiste ? lastUse.deckVersion : newest.label;
}

/**
 * A partida mais recente jogada com um deck, por nome. Comparar nome e não id
 * é proposital: partidas guardam o nome do deck, não uma referência a ele.
 */
export function lastUseOfDeck<T extends LastUse & { myDeck?: string }>(
  matches: T[],
  deckName: string
): LastUse | undefined {
  const alvo = deckName.trim().toLowerCase();
  if (!alvo) return undefined;

  let melhor: T | undefined;
  for (const m of matches) {
    if ((m.myDeck ?? '').trim().toLowerCase() !== alvo) continue;
    if (!melhor || m.date.localeCompare(melhor.date) > 0) melhor = m;
  }
  return melhor && { deckVersion: melhor.deckVersion, date: melhor.date };
}
