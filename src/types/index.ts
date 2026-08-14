export interface Match {
  id: string;
  date: string; // ISO 8601
  format: Format;
  myDeck: string;
  oppDeck: string;
  archetype: Archetype;
  onPlay: boolean;
  won: boolean;
  /** true = empate/draw. Retrocompat: undefined means loss when won=false */
  drew?: boolean;
  notes: string;
  /**
   * Rótulo da versão do deck no momento em que a partida foi salva.
   * É uma cópia, não uma referência: renomear a versão depois não reescreve o
   * histórico, que é o ponto de comparar versões entre si.
   */
  deckVersion?: string;
}

// ─── Decks e versões ────────────────────────────────────────

export interface Deck {
  id: string;
  name: string;
  format: Format;
  archetype?: Archetype;
  /** Versão em uso. Aponta para `DeckVersion.id`. */
  currentVersionId?: string;
  createdAt: string;
  /** Arquivado some das listas de seleção mas preserva o histórico. */
  archived?: boolean;
}

export interface DeckVersion {
  id: string;
  deckId: string;
  /** Rótulo curto: "v3", "pós-ban", "sideboard novo". */
  label: string;
  notes: string;
  createdAt: string;
}

export type Language = 'en-US' | 'pt-BR' | 'ja-JP';

export interface Settings {
  defaultFormat: Format;
  defaultDeck: string;
  /** Compartilhamento anônimo de resultados. Ligado por padrão, desligável em Config. */
  shareAnon: boolean;
  onboarded: boolean;
  language: Language;
  deckRenames: Record<string, string>;
  /** UUID sorteado na instalação. Identifica o aparelho, nunca a pessoa. */
  installId: string;
  /** O que a aba de contadores mostra. */
  counterPrefs: CounterPrefs;
}

export interface Filters {
  format: string;     // 'All' | format name
  deck: string[];     // [] = todos; pode ter vários decks selecionados
  oppDeck: string[];  // [] = todos; pode ter vários decks do oponente
  period: string;     // '1d'|'7d'|'30d'|'90d'|'All'
  result: string;     // 'All'|'Wins'|'Losses'|'Draws'
}

export type Format =
  | 'Commander'
  | 'Modern'
  | 'Standard'
  | 'Pioneer'
  | 'Legacy'
  | 'Pauper'
  | 'Draft'
  | 'Other';

export type Archetype = 'Aggro' | 'Midrange' | 'Control' | 'Combo' | 'Stax';

export type ConfidenceLevel = 'high' | 'low' | 'missing' | 'default';

export interface MatchConfidence {
  won?: ConfidenceLevel;
  format?: ConfidenceLevel;
  myDeck?: ConfidenceLevel;
  oppDeck?: ConfidenceLevel;
  archetype?: ConfidenceLevel;
  onPlay?: ConfidenceLevel;
}

export interface ComputedStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  wr: number;
  streak: number;
  streakType: boolean | null;
  onPlayWR: number;
  onDrawWR: number;
  evolution: number[];
  decks: { l: string; wins: number; losses: number; wr: number }[];
  opponents: { l: string; v: number }[];
  archetypes: { l: string; v: number; n: number }[];
}

export interface PendingReview {
  transcript: string;
  duration: number;
  confidence: MatchConfidence;
  extracted: Partial<Match>;
}

/**
 * Formato bruto devolvido pelo extrator on-device (llama.rn).
 * Todo campo é opcional: o modelo devolve apenas o que conseguiu identificar.
 */
export interface ExtractedMatch {
  won: boolean;
  drew: boolean;
  myDeck: string;
  oppDeck: string;
  format: Format;
  onPlay: boolean;
  archetype: Archetype;
  notes: string;
}

// ─── Contadores da mesa (aba Vida) ──────────────────────────

export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ManaColor = (typeof MANA_COLORS)[number];
export type ManaPool = Record<ManaColor, number>;

export interface PlayerCounters {
  mana: ManaPool;
  poison: number;
  energy: number;
  experience: number;
  /** Dano de comandante recebido, indexado pelo índice do jogador que causou. */
  cmdDamage: Record<number, number>;
  /** Contadores criados pelo usuário, indexados por `CustomCounter.id`. */
  custom: Record<string, number>;
}

export interface TableCounters {
  /** Mágicas lançadas no turno — zera a cada novo turno. Vale para a mesa toda. */
  storm: number;
}

/** Contador inventado pelo usuário em Configurações → Contadores. */
export interface CustomCounter {
  id: string;
  name: string;
  enabled: boolean;
}

/** Quais contadores aparecem na tela. Mana e storm estão sempre visíveis. */
export interface CounterPrefs {
  poison: boolean;
  energy: boolean;
  experience: boolean;
  commanderDamage: boolean;
  custom: CustomCounter[];
}

export const DEFAULT_COUNTER_PREFS: CounterPrefs = {
  poison: true,
  energy: false,
  experience: false,
  commanderDamage: true,
  custom: [],
};

// ─── Telemetria anônima ─────────────────────────────────────

/**
 * O que sai do aparelho quando o compartilhamento anônimo está ligado.
 * Sem nome de jogador, sem notas, sem áudio, sem localização, sem data exata.
 */
export interface TelemetryEvent {
  /** UUID sorteado na instalação. Não é o usuário, é o aparelho. */
  install_id: string;
  /** Chave local para deduplicar reenvios. Nunca é o id da partida no aparelho. */
  event_id: string;
  format: Format;
  archetype: Archetype;
  my_deck: string;
  opp_deck: string;
  on_play: boolean;
  won: boolean;
  drew: boolean;
  /** Semana ISO da partida (AAAA-Www). Granularidade proposital: não é a data. */
  played_week: string;
  app_version: string;
}
