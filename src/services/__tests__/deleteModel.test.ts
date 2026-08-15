/**
 * `deleteModel` tem uma ordem que importa: soltar o contexto ANTES de apagar
 * o arquivo. Um `initLlama` ativo mantém o .gguf mapeado em memória, e remover
 * o arquivo por baixo dele deixa o app com um contexto apontando para o nada —
 * que só quebra na extração seguinte, longe daqui.
 *
 * O teste existe porque essa ordem é invisível no código lido de cima para
 * baixo: as duas linhas parecem independentes.
 */

// O prefixo `mock` é exigência do jest: a fábrica de `jest.mock` é içada para
// antes das declarações, e só variáveis com esse prefixo podem ser lidas lá.
const mockChamadas: string[] = [];

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/docs/',
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 367_001_600 })),
  deleteAsync: jest.fn(async () => { mockChamadas.push('delete'); }),
  createDownloadResumable: jest.fn(),
}));

const mockRelease = jest.fn(async () => { mockChamadas.push('release'); });
jest.mock('llama.rn', () => ({
  initLlama: jest.fn(async () => ({ release: mockRelease, completion: jest.fn() })),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { deleteModel, getLlamaContext, MODEL_PATH } from '../llamaExtractor';

describe('deleteModel', () => {
  beforeEach(() => { mockChamadas.length = 0; });

  it('devolve quantos bytes foram liberados', async () => {
    expect(await deleteModel()).toBe(367_001_600);
  });

  it('apaga o arquivo no caminho do modelo, sem falhar se nao existir', async () => {
    await deleteModel();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      MODEL_PATH,
      { idempotent: true }
    );
  });

  it('solta o contexto antes de apagar', async () => {
    await getLlamaContext();
    await deleteModel();
    expect(mockChamadas).toEqual(['release', 'delete']);
  });
});
