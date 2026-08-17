import React from 'react';
import { ScrollView, TextInput, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Leva o campo em foco para o topo da tela quando o teclado abre.
 *
 * O problema é do aparelho, não do formulário: com o teclado aberto sobra
 * pouco mais de um terço da altura, e um campo no meio da lista some atrás
 * dele. Encostar o campo no topo resolve os dois lados de uma vez — ele fica
 * visível, e o que vem depois dele também.
 *
 * Duas peças fazem funcionar:
 *
 * 1. Sobe o campo. `measureLayout` dá a posição dele dentro do conteúdo, e a
 *    rolagem vai para essa posição menos um respiro.
 * 2. Cria espaço embaixo. Sem folga no fim do conteúdo o último campo não tem
 *    para onde subir e a rolagem trava no meio do caminho. Enquanto o teclado
 *    está aberto o conteúdo ganha quase uma tela de sobra, que some junto com
 *    o teclado para a lista não ficar com um buraco no fim.
 *
 * É um hook e não um componente de propósito: quem renderiza a rolagem é a
 * mesma tela que renderiza os campos, e ela precisa da função de subir no
 * próprio escopo. Por contexto, essa tela ficaria acima do provedor e receberia
 * a versão vazia — o tipo de armadilha que só aparece em teste manual.
 *
 * Uso:
 *   const { scrollProps, subirCampo, folga } = useKeyboardAware();
 *   <ScrollView {...scrollProps}>
 *     <TextInput onFocus={subirCampo} />
 *     <View style={{ height: folga }} />
 *   </ScrollView>
 */

/** Respiro entre o topo da área visível e o campo. */
const GAP = 12;

/** O que continua visível abaixo do campo quando ele encosta no topo. */
const CAUDA = 140;

export function useKeyboardAware() {
  const scrollRef = React.useRef<ScrollView>(null);
  const alturaRef = React.useRef(0);
  const [folga, setFolga] = React.useState(0);

  // O app desenha por baixo da barra de status, então o topo da rolagem não é
  // o topo do que se enxerga. Sem descontar isso, o campo sobe até ficar atrás
  // do relógio.
  const insets = useSafeAreaInsets();
  const topo = insets.top + GAP;

  const subir = React.useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current;
    if (!input || !scroll) return;

    // A referência da view interna, e não o node numérico: na arquitetura nova
    // `measureLayout` só mede contra uma referência. O elenco existe porque os
    // tipos publicados do React Native ainda não declaram este método, embora
    // ele esteja lá — com queda para o node em runtime antigo.
    const scrollAny = scroll as unknown as {
      getInnerViewRef?: () => unknown;
      getInnerViewNode?: () => number | null;
    };
    const conteudo = scrollAny.getInnerViewRef?.() ?? scrollAny.getInnerViewNode?.();
    if (!conteudo) return;

    input.measureLayout(
      conteudo as never,
      (_x: number, y: number) => {
        scroll.scrollTo({ y: Math.max(0, y - topo), animated: true });
      },
      () => { /* o campo saiu da tela antes da medida; não há o que rolar */ }
    );
  }, [topo]);

  /**
   * O atraso não é superstição: no instante do foco o teclado ainda não abriu,
   * a tela ainda tem a altura antiga e a medida sairia errada.
   */
  const subirCampo = React.useCallback(() => {
    setTimeout(subir, 80);
  }, [subir]);

  React.useEffect(() => {
    // `keyboardDidShow` cobre abrir o teclado; o `onFocus` de cada campo cobre
    // pular de um campo para o outro, quando o teclado já está aberto e este
    // evento não acontece de novo.
    const abriu = Keyboard.addListener('keyboardDidShow', () => {
      setFolga(Math.max(0, alturaRef.current - CAUDA));
      subirCampo();
    });
    const fechou = Keyboard.addListener('keyboardDidHide', () => setFolga(0));
    return () => { abriu.remove(); fechou.remove(); };
  }, [subirCampo]);

  const scrollProps = {
    ref: scrollRef,
    keyboardShouldPersistTaps: 'handled' as const,
    onLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
      alturaRef.current = e.nativeEvent.layout.height;
    },
  };

  return { scrollProps, subirCampo, folga };
}
