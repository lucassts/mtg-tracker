// Importado peso a peso, e não pelo índice do pacote: o `index.js` faz require
// de todas as ~40 variantes (incluindo itálicos), e o Metro empacota tudo que
// for requerido — o bundle ganhava mais de 10 MB de fonte que ninguém usa.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';

/**
 * Registro das fontes do app.
 *
 * As folhas de estilo escrevem `fontFamily: 'Inter'` e `'JetBrainsMono'`.
 * Sem o registro em `App.tsx`, esses nomes não existem para o sistema e todo o
 * texto cai na fonte padrão do aparelho.
 *
 * Os arquivos vêm dos pacotes `@expo-google-fonts/*`, versionados no
 * package-lock. Não há download em tempo de setup: `npm install` basta.
 * Licenças (SIL OFL 1.1) em NOTICE.md.
 */

export const fonts = {
  ui: 'Inter',
  mono: 'JetBrainsMono',
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * Mapa passado para `useFonts`. As chaves são exatamente os nomes usados nos
 * estilos, mais uma variante por peso.
 *
 * `Inter` e `JetBrainsMono` apontam para a Regular: em estilos que combinam
 * família e `fontWeight` alto, o sistema engrossa sinteticamente. Para usar o
 * desenho real da Bold, escreva `fontFamily: 'Inter-Bold'` em vez de
 * `fontFamily: 'Inter'` com `fontWeight: '700'`.
 */
export const fontAssets = {
  Inter: Inter_400Regular,
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
  JetBrainsMono: JetBrainsMono_400Regular,
  'JetBrainsMono-Regular': JetBrainsMono_400Regular,
  'JetBrainsMono-Medium': JetBrainsMono_500Medium,
};
