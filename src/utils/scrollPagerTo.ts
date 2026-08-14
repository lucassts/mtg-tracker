import type { ScrollView } from 'react-native';

/**
 * Rola um pager horizontal até a posição pedida — versão nativa, onde o ref
 * é a instância do ScrollView e a API é `{ x, animated }`.
 */
export function scrollPagerTo(
  ref: React.RefObject<ScrollView | null>,
  x: number
): void {
  ref.current?.scrollTo({ x, animated: true });
}
