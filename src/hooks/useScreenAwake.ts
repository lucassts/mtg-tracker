import { useKeepAwake } from 'expo-keep-awake';

/**
 * Mantém a tela ligada enquanto a partida corre. Uma mesa de Commander passa
 * de uma hora e ninguém quer destravar o celular a cada dois turnos.
 */
export function useScreenAwake(): void {
  useKeepAwake();
}
