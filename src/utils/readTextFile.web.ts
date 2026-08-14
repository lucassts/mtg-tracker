/**
 * Lê o conteúdo de um arquivo escolhido pelo seletor de documentos — web.
 * No navegador o `DocumentPicker` devolve um blob URI, que `fetch` resolve.
 */

export async function readTextFile(uri: string): Promise<string> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Não foi possível ler o arquivo (HTTP ${res.status})`);
  return res.text();
}
