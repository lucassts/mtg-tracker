import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match, Settings, PendingReview, TelemetryEvent } from '../types';
import { seedMatches } from '../data/seed';
import { flushQueue, newInstallId, toEvent, QUEUE_LIMIT } from '../services/telemetry';

interface AppState {
  matches: Match[];
  settings: Settings;
  pendingReview: PendingReview | null;
  /** Eventos anônimos aguardando envio. Vazio quando o compartilhamento está desligado. */
  telemetryQueue: TelemetryEvent[];

  // Actions
  addMatch: (match: Omit<Match, 'id' | 'date'>) => void;
  updateMatch: (match: Match) => void;
  deleteAllData: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setPendingReview: (review: PendingReview | null) => void;
  getRecentDecks: () => string[];
  renameDecks: (oldName: string, newName: string) => void;
  importMatches: (incoming: Match[]) => void;
  /** Popula o app com partidas fictícias, para explorar as telas sem histórico. */
  loadDemoData: () => void;
  /** Tenta enviar a fila anônima. Silencioso: falha de rede não incomoda o usuário. */
  flushTelemetry: () => Promise<void>;
}

const defaultSettings: Settings = {
  defaultFormat: 'Commander',
  defaultDeck: '',
  shareAnon: true,
  onboarded: false,
  language: 'pt-BR',
  deckRenames: {},
  installId: '',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Começa vazio de propósito. Semear partidas fictícias no primeiro boot
      // contamina as estatísticas de quem instala o app — quem quiser ver as
      // telas povoadas usa "carregar dados de exemplo" em Configurações.
      matches: [],
      settings: defaultSettings,
      pendingReview: null,
      telemetryQueue: [],

      addMatch: (matchData) => {
        const match: Match = {
          id: 'm' + Date.now(),
          date: new Date().toISOString(),
          ...matchData,
        };

        set(state => {
          const { settings, telemetryQueue } = state;

          // Só entra na fila se o compartilhamento estiver ligado.
          if (!settings.shareAnon) {
            return { matches: [match, ...state.matches] };
          }

          const installId = settings.installId || newInstallId();
          const queue = [...telemetryQueue, toEvent(match, installId)];

          return {
            matches: [match, ...state.matches],
            telemetryQueue: queue.slice(-QUEUE_LIMIT),
            settings: installId === settings.installId
              ? settings
              : { ...settings, installId },
          };
        });

        // Não bloqueia a UI; se falhar, fica na fila para a próxima vez.
        void get().flushTelemetry();
      },

      updateMatch: (updated) => {
        set(state => ({
          matches: state.matches.map(m => m.id === updated.id ? updated : m),
        }));
      },

      deleteAllData: () => {
        // Apagar tudo apaga também o que ainda não foi enviado.
        set({ matches: [], telemetryQueue: [] });
      },

      updateSettings: (partial) => {
        set(state => {
          const settings = { ...state.settings, ...partial };
          // Desligar o compartilhamento descarta imediatamente o que estava
          // na fila. Opt-out não pode deixar resíduo esperando conexão.
          const turnedOff = partial.shareAnon === false;
          return {
            settings,
            telemetryQueue: turnedOff ? [] : state.telemetryQueue,
          };
        });
      },

      setPendingReview: (review) => {
        set({ pendingReview: review });
      },

      getRecentDecks: () => {
        const { matches } = get();
        return [...new Set(matches.map(m => m.myDeck).filter(Boolean))].slice(0, 5);
      },

      renameDecks: (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) return;
        set(state => ({
          matches: state.matches.map(m => ({
            ...m,
            myDeck: m.myDeck === oldName ? trimmed : m.myDeck,
            oppDeck: m.oppDeck === oldName ? trimmed : m.oppDeck,
          })),
          settings: {
            ...state.settings,
            defaultDeck: state.settings.defaultDeck === oldName ? trimmed : state.settings.defaultDeck,
            deckRenames: { ...state.settings.deckRenames, [oldName]: trimmed },
          },
        }));
      },

      importMatches: (incoming: Match[]) => {
        set(state => {
          const existingIds = new Set(state.matches.map(m => m.id));
          const newMatches = incoming.filter(m => m.id && !existingIds.has(m.id));
          return { matches: [...newMatches, ...state.matches] };
        });
      },

      loadDemoData: () => {
        // Dados de exemplo nunca são compartilhados — não passam pela fila.
        set(state => {
          const existingIds = new Set(state.matches.map(m => m.id));
          const demo = seedMatches().filter(m => !existingIds.has(m.id));
          return { matches: [...demo, ...state.matches] };
        });
      },

      flushTelemetry: async () => {
        const { settings, telemetryQueue } = get();
        if (!settings.shareAnon || telemetryQueue.length === 0) return;

        const result = await flushQueue(telemetryQueue);
        if (result.sent === 0 && result.remaining.length === telemetryQueue.length) {
          return; // nada mudou, evita uma escrita inútil no AsyncStorage
        }

        set(state => {
          // Enquanto o envio rodava o usuário pode ter salvo outra partida ou
          // desligado o compartilhamento. Preserva a cauda, respeita o opt-out.
          if (!state.settings.shareAnon) return { telemetryQueue: [] };
          const added = state.telemetryQueue.slice(telemetryQueue.length);
          return { telemetryQueue: [...result.remaining, ...added] };
        });
      },
    }),
    {
      name: 'mtg-tracker-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        matches: state.matches,
        settings: state.settings,
        telemetryQueue: state.telemetryQueue,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState>;
        // v0 → v1: instalações antigas nasceram com 48 partidas fictícias e sem
        // installId. Remove o seed e sorteia o id, sem tocar no que for real.
        if (version === 0 && state.matches) {
          const seedIds = new Set(seedMatches().map(m => m.id));
          state.matches = state.matches.filter(m => !seedIds.has(m.id));
        }
        if (state.settings && !state.settings.installId) {
          state.settings = { ...state.settings, installId: newInstallId() };
        }
        return state as AppState;
      },
    }
  )
);
