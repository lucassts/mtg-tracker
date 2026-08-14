import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Match } from '../types';

/**
 * Colunas exportadas. `id` entra para que reimportar o próprio export não
 * duplique partidas, e `drew` entra porque sem ela todo empate volta como derrota.
 */
export const CSV_HEADERS = [
  'id', 'date', 'format', 'myDeck', 'oppDeck',
  'archetype', 'onPlay', 'won', 'drew', 'notes',
] as const;

function escapeCell(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value == null) return '';
  const s = String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function toCSV(matches: Match[]): string {
  const rows = matches.map(m =>
    CSV_HEADERS.map(h => escapeCell((m as unknown as Record<string, unknown>)[h])).join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

const BOOL_COLUMNS = new Set(['onPlay', 'won', 'drew']);

/**
 * Tokeniza o arquivo inteiro de uma vez, em vez de quebrar por linha antes.
 *
 * Quebrar por `\n` primeiro parece funcionar até alguém escrever uma nota com
 * mais de uma linha: dentro de aspas, a quebra faz parte do campo e não separa
 * registros. Este laço só encerra a linha quando está fora de aspas.
 */
function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let cellWasQuoted = false;

  const endCell = () => {
    // Campo sem aspas ganha trim; entre aspas, o espaço é do usuário.
    row.push(cellWasQuoted ? cell : cell.trim());
    cell = '';
    cellWasQuoted = false;
  };
  const endRow = () => {
    endCell();
    // Ignora a linha em branco que sobra no fim do arquivo.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }  // "" = aspa literal
        else inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; cellWasQuoted = true; }
    else if (ch === ',') endCell();
    else if (ch === '\r') { /* consumido junto com o \n seguinte */ }
    else if (ch === '\n') endRow();
    else cell += ch;
  }

  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

/**
 * Lê um CSV exportado pelo app (ou compatível) e devolve partidas.
 * Linhas sem id ganham um id derivado do índice — a deduplicação acontece na store.
 */
export function parseCSV(text: string, now: number = Date.now()): Match[] {
  const rows = parseRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());

  return rows.slice(1).map((cols, idx) => {
    const obj: Record<string, unknown> = {};

    headers.forEach((h, i) => {
      if (!h) return;
      const raw = cols[i] ?? '';
      obj[h] = BOOL_COLUMNS.has(h) ? raw.trim().toUpperCase() === 'TRUE' : raw;
    });

    if (!obj.id) obj.id = `imp_${now}_${idx}`;
    if (!obj.date) obj.date = new Date(now).toISOString();
    if (obj.drew == null) obj.drew = false;

    return obj as unknown as Match;
  });
}

export async function exportCSV(matches: Match[]): Promise<void> {
  const file = new File(Paths.document, 'mtg-matches.csv');
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
