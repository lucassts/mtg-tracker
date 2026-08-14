/**
 * Rola um pager horizontal até a posição pedida — versão web.
 *
 * A assinatura é a mesma da nativa (`{ x, animated }`), mas com `animated`
 * desligado: o react-native-web traduz `animated: true` para
 * `behavior: 'smooth'`, e o navegador descarta a rolagem suave sempre que o
 * sistema pede menos movimento (`prefers-reduced-motion`) — o resultado é a
 * aba mudar e a página não sair do lugar. Instantâneo sempre funciona, e num
 * pager de contadores o salto seco nem chama atenção.
 */
export function scrollPagerTo(ref: React.RefObject<unknown>, x: number): void {
  const node = ref.current as
    | { scrollTo?: (o: { x: number; y?: number; animated?: boolean }) => void }
    | null;
  node?.scrollTo?.({ x, y: 0, animated: false });
}
