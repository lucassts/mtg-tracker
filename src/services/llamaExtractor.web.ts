/**
 * llamaExtractor.web.ts
 *
 * Variante de plataforma resolvida automaticamente pelo Metro no build web.
 * Existe para que `llama.rn` — que é código nativo — nunca entre no bundle do
 * navegador, onde não há como carregá-lo.
 *
 * A consequência é que, no preview web, gravar por voz e digitar texto livre
 * ficam indisponíveis. Tudo o mais funciona: contador de vida com contadores,
 * decks e versões, entrada por formulário, estatísticas, histórico, CSV.
 */

import type { ExtractedMatch } from '../types';

export const MODEL_URL = '';
export const MODEL_FILENAME = '';
export const MODEL_PATH = '';
export const MODEL_LABEL = 'Qwen2.5-0.5B';
export const MODEL_SIZE_MB = 350;

export type DownloadProgress = (bytesWritten: number, totalBytes: number) => void;

/** Erro reconhecível pela interface, para diferenciar de falha de rede. */
export class UnsupportedOnWebError extends Error {
  constructor() {
    super('A IA on-device roda apenas no aplicativo instalado.');
    this.name = 'UnsupportedOnWebError';
  }
}

/** Sempre 0: no navegador não há modelo baixado, e nunca haverá. */
export async function getModelSize(): Promise<number> {
  return 0;
}

export async function downloadModel(_onProgress?: DownloadProgress): Promise<void> {
  throw new UnsupportedOnWebError();
}

export async function getLlamaContext(): Promise<never> {
  throw new UnsupportedOnWebError();
}

export async function releaseLlamaContext(): Promise<void> {
  // Nada para liberar.
}

export function isLlamaLoading(): boolean {
  return false;
}

export async function extractMatch(_text: string): Promise<Partial<ExtractedMatch>> {
  throw new UnsupportedOnWebError();
}
