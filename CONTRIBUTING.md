# Contribuindo

Obrigado pelo interesse. Este é um projeto pessoal mantido nas horas vagas, então PRs pequenos e focados andam bem mais rápido do que reescritas grandes.

Issues, discussões e PRs podem ser em **português ou inglês**. Código, comentários e mensagens de commit: **inglês ou português, mas mantenha a consistência do arquivo que você está editando** — hoje o código é comentado em português.

## Antes de começar

Para qualquer coisa maior que um bugfix, **abra uma issue primeiro**. Evita você investir horas em algo que não cabe no projeto.

Bom candidato a PR sem discussão prévia:

- corrigir bug com passos de reprodução
- traduzir para um idioma novo (veja `src/i18n/translations.ts`)
- adicionar teste para comportamento existente
- melhorar acessibilidade
- corrigir documentação

Abra issue antes se envolver: mudança de esquema de dados, nova dependência, mudança no que a telemetria coleta, ou redesenho de tela.

## Ambiente

Node 20+ e o [ambiente Expo para desenvolvimento nativo](https://docs.expo.dev/get-started/set-up-your-environment/).

```bash
npm install
npm run setup
npx expo run:android
```

`llama.rn` é módulo nativo: **não funciona no Expo Go**. É preciso build de desenvolvimento.

## Antes de abrir o PR

```bash
npm run typecheck
npm test
```

Os dois precisam passar. O CI roda exatamente isso.

Se você mexeu em versão de dependência, rode também `npm run deps:check` — o Expo é rígido quanto a versões casadas com a SDK.

## Padrões do código

- **TypeScript em modo strict.** Sem `any` novo; se precisar de escape, use `unknown` e estreite.
- **Sem biblioteca de UI.** Componentes são feitos à mão com `StyleSheet`. Cores vêm de `src/theme/colors.ts`, nunca hardcoded — exceto as cores canônicas de mana em `CountersModal.tsx`, que são do jogo e não da marca.
- **Texto visível ao usuário vive em `src/i18n/translations.ts`**, nos três idiomas. Uma string solta em JSX é motivo de pedir mudança na revisão.
- **Estado global é Zustand**, em `src/store/useStore.ts`. Estado de tela é `useState` local.
- **Comentário explica o porquê, não o quê.** `// incrementa i` não ajuda ninguém; `// draw quebra a sequência` ajuda.

## Testes

Funções puras (`src/utils/`, `src/services/`) têm testes em `__tests__/` ao lado. Se você corrigir um bug ali, adicione o teste que falhava antes.

Não há testes de componente hoje. Se quiser introduzir `@testing-library/react-native`, abra uma issue antes — é uma decisão de infraestrutura.

## Telemetria

Mudanças no que é coletado exigem, na mesma PR:

1. atualizar `TelemetryEvent` em `src/types/index.ts`
2. atualizar `supabase/schema.sql`
3. atualizar [PRIVACY.md](PRIVACY.md) e o texto do onboarding nos três idiomas
4. justificar na descrição do PR por que o campo novo não permite reidentificar alguém

PRs que ampliam a coleta sem os quatro itens serão fechados.

## Commits

Formato livre, mas prefira imperativo e escopo claro:

```
contadores: corrige aba órfã ao reduzir jogadores
csv: preserva nota com quebra de linha
```

## Código de conduta

Ao participar, você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).

## Licença

Contribuições entram sob a licença [MIT](LICENSE) do projeto.
