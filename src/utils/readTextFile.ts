/**
 * Lê o conteúdo de um arquivo escolhido pelo seletor de documentos — nativo.
 * O URI vem de `DocumentPicker` com `copyToCacheDirectory: true`, então já é
 * um arquivo local acessível.
 */

import { File } from 'expo-file-system';

export async function readTextFile(uri: string): Promise<string> {
  return new File(uri).text();
}
