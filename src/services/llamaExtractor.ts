/**
 * llamaExtractor.ts
 * Serviço de inferência on-device usando llama.rn + Qwen2.5-0.5B-Instruct Q4_K_M.
 *
 * O modelo (~350 MB) é baixado do Hugging Face na primeira execução e
 * armazenado em FileSystem.documentDirectory.
 *
 * USO:
 *   const result = await extractMatch("Venci o Tron com Rhinos no Modern");
 *   // → { won: true, myDeck: "Rhinos", oppDeck: "Tron", format: "Modern", ... }
 */

// A API nova do expo-file-system (SDK 54) não expõe download com progresso.
// `createDownloadResumable` só existe no entrypoint legado, que segue suportado.
import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, LlamaContext } from 'llama.rn';
import type { ExtractedMatch } from '../types';

// ── Configuração ─────────────────────────────────────────────────────────────

export const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/' +
  'qwen2.5-0.5b-instruct-q4_k_m.gguf';

export const MODEL_FILENAME = 'qwen2.5-0.5b-q4km.gguf';
/** Nome exibido na interface. Trocar o modelo é trocar só esta constante e a URL. */
export const MODEL_LABEL = 'Qwen2.5-0.5B';
/** Tamanho aproximado, em MB, mostrado antes do download. */
export const MODEL_SIZE_MB = 350;
export const MODEL_PATH = (FileSystem.documentDirectory ?? '') + MODEL_FILENAME;

const N_CTX   = 512;   // janela de contexto (tokens)
const N_BATCH = 512;
const N_PREDICT = 200; // máximo de tokens gerados

const SYSTEM_PROMPT =
  'You are a Magic: The Gathering match data extractor. ' +
  'Given a natural language match description (in any language), ' +
  'extract structured data as JSON.\n\n' +
  'Fields:\n' +
  '- won: boolean — true if the match was won\n' +
  '- drew: boolean — true if it was a draw (won must be false)\n' +
  '- myDeck: string|null — the player\'s deck name\n' +
  '- oppDeck: string|null — the opponent\'s deck name\n' +
  '- format: "Commander"|"Modern"|"Standard"|"Pioneer"|"Legacy"|"Pauper"|"Other"|null\n' +
  '- onPlay: boolean|null — true=went first (on the play), false=went second\n' +
  '- archetype: "Aggro"|"Midrange"|"Control"|"Combo"|"Stax"|null — opponent\'s archetype\n\n' +
  'Rules:\n' +
  '- Use null for any field not mentioned or unclear.\n' +
  '- drew defaults to false unless a draw is explicitly stated.\n' +
  '- If drew is true, won must be false.\n' +
  '- Respond with ONLY valid JSON. No explanation, no markdown.';

// ── Estado singleton ──────────────────────────────────────────────────────────

let _context: LlamaContext | null = null;
let _loading = false;
let _loadPromise: Promise<LlamaContext> | null = null;

// ── Download / verificação do modelo ─────────────────────────────────────────

export type DownloadProgress = (bytesWritten: number, totalBytes: number) => void;

/**
 * Verifica se o modelo já foi baixado. Retorna o tamanho em bytes ou 0.
 */
export async function getModelSize(): Promise<number> {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  return info.exists ? (info.size ?? 0) : 0;
}

/**
 * Baixa o modelo na primeira execução.
 * Chame com onProgress para mostrar uma barra de progresso.
 */
export async function downloadModel(onProgress?: DownloadProgress): Promise<void> {
  const existing = await getModelSize();
  if (existing > 100_000_000) {
    return; // já existe (> 100 MB = não está corrompido)
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      onProgress?.(totalBytesWritten, totalBytesExpectedToWrite);
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('Download do modelo falhou.');
  }
}

// ── Inicialização do contexto Llama ───────────────────────────────────────────

/**
 * Inicializa (ou reutiliza) o contexto llama.rn.
 * Idempotente — múltiplas chamadas retornam o mesmo contexto.
 */
export async function getLlamaContext(): Promise<LlamaContext> {
  if (_context) return _context;
  if (_loadPromise) return _loadPromise;

  _loading = true;
  _loadPromise = (async () => {
    const size = await getModelSize();
    if (size < 100_000_000) {
      throw new Error(
        'Modelo não encontrado no dispositivo. Chame downloadModel() primeiro.'
      );
    }

    const ctx = await initLlama({
      model: MODEL_PATH,
      use_mlock: false,
      n_ctx: N_CTX,
      n_batch: N_BATCH,
      n_gpu_layers: 0, // CPU — ajuste para 1+ se o dispositivo tiver GPU compatível
    });

    _context = ctx;
    _loading = false;
    return ctx;
  })();

  return _loadPromise;
}

/** Libera o contexto (chame ao sair da sessão). */
export async function releaseLlamaContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _loadPromise = null;
  }
}

export function isLlamaLoading(): boolean {
  return _loading;
}

// ── Extração principal ────────────────────────────────────────────────────────

/**
 * Extrai dados estruturados de uma descrição de partida em linguagem natural.
 *
 * @param text  Transcrição ou texto digitado pelo usuário.
 * @returns     Dados parciais de ExtractedMatch (campos não identificados = null/undefined).
 */
export async function extractMatch(
  text: string
): Promise<Partial<ExtractedMatch>> {
  const ctx = await getLlamaContext();

  // llama.rn aceita messages[] com chat template
  const { text: raw } = await ctx.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: text },
    ],
    n_predict:   N_PREDICT,
    temperature: 0.1,
    stop:        ['```', '\n\n\n'],
  });

  return parseExtracted(raw.trim());
}

// ── Parser defensivo do JSON ──────────────────────────────────────────────────

function parseExtracted(raw: string): Partial<ExtractedMatch> {
  // Remove markdown code fences se o modelo os incluiu
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const obj = JSON.parse(cleaned);
    return sanitize(obj);
  } catch {
    // Tenta extrair o primeiro bloco JSON da resposta
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return sanitize(JSON.parse(match[0]));
      } catch { /* ignora */ }
    }
    console.warn('[llamaExtractor] JSON inválido:', raw);
    return {};
  }
}

function sanitize(obj: Record<string, unknown>): Partial<ExtractedMatch> {
  const formats = ['Commander','Modern','Standard','Pioneer','Legacy','Pauper','Other'] as const;
  const archetypes = ['Aggro','Midrange','Control','Combo','Stax'] as const;

  return {
    won:       typeof obj.won  === 'boolean' ? obj.won  : undefined,
    drew:      typeof obj.drew === 'boolean' ? obj.drew : false,
    myDeck:    typeof obj.myDeck  === 'string' ? obj.myDeck  : undefined,
    oppDeck:   typeof obj.oppDeck === 'string' ? obj.oppDeck : undefined,
    format:    formats.includes(obj.format as any)    ? (obj.format as any) : undefined,
    onPlay:    typeof obj.onPlay === 'boolean' ? obj.onPlay : undefined,
    archetype: archetypes.includes(obj.archetype as any) ? (obj.archetype as any) : undefined,
    notes:     '',
  };
}
