/**
 * Exportação de partidas em CSV — versão nativa.
 *
 * Grava no diretório de documentos do app e entrega para a folha de
 * compartilhamento do sistema. A serialização em si mora em `csv.ts`, que é
 * puro e testável; aqui fica só o que depende de sistema de arquivos.
 *
 * A variante `exportCsv.web.ts` faz o equivalente com Blob e download.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Match } from '../types';
import { CSV_FILENAME, toCSV } from './csv';

export async function exportCSV(matches: Match[]): Promise<void> {
  const file = new File(Paths.document, CSV_FILENAME);
  file.create({ overwrite: true });
  file.write(toCSV(matches));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar partidas MTG',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
