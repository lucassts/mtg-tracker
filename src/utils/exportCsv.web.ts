/**
 * Exportação de partidas em CSV — versão web.
 *
 * O navegador não tem diretório de documentos nem folha de compartilhamento do
 * sistema, então gera um Blob e dispara o download pelo caminho padrão da
 * plataforma. Mesma assinatura da versão nativa.
 */

import { Match } from '../types';
import { CSV_FILENAME, toCSV } from './csv';

export async function exportCSV(matches: Match[]): Promise<void> {
  // ﻿ na frente: sem o BOM, o Excel abre acento como caractere quebrado.
  const blob = new Blob(['﻿', toCSV(matches)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Sem o revoke o Blob fica preso na memória da aba até recarregar.
  URL.revokeObjectURL(url);
}
