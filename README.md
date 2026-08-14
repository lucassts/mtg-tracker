# MTG Tracker

Registro de partidas de Magic: The Gathering para Android e iOS. Você conta como foi a partida em voz alta, um modelo de linguagem rodando **no próprio aparelho** transforma isso em dados estruturados, e as estatísticas aparecem sem você preencher formulário.

Traz também um contador de vida para 2 a 6 jogadores, com contadores de storm, mana, veneno, energia, experiência e dano de comandante.

> [!NOTE]
> Projeto pessoal, em desenvolvimento. Contribuições são bem-vindas — veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## O que ele faz

| Tela | O que tem |
|---|---|
| **Vida** | 2–6 jogadores, layouts rotacionados, segurar para contar rápido, contadores da mesa e por jogador |
| **Gravar** | Segure o microfone e descreva a partida · ou digite em texto livre · ou preencha o formulário |
| **Revisão** | Confere o que o modelo extraiu, com marca de confiança por campo, antes de salvar |
| **Stats** | Win rate, evolução, on the play vs on the draw, desempenho por deck e por arquétipo do oponente |
| **Partidas** | Histórico agrupado por data, com edição |
| **Configurações** | Padrões, idioma, privacidade, importar/exportar CSV, renomear decks |

Interface em português, inglês e japonês.

## Como a IA funciona

O app usa [`llama.rn`](https://github.com/mybigday/llama.rn) para rodar **Qwen2.5-0.5B-Instruct Q4_K_M** (~350 MB) localmente. O modelo é baixado do Hugging Face na primeira vez que você usa voz ou texto livre — o resto do app funciona antes disso.

Sua voz e suas notas nunca são enviadas para lugar nenhum. Não há servidor de inferência, não há conta, não há assinatura.

## Privacidade

Duas coisas separadas, e vale não confundi-las:

1. **A IA é 100% local.** Áudio, transcrição e notas não saem do aparelho. Isso não é configurável porque não há para onde enviar.
2. **Resultados anônimos são compartilhados por padrão**, para montar um retrato agregado do meta. Sai formato, arquétipo, nomes de deck, resultado e a *semana* da partida. Não sai voz, notas, nome, data exata nem localização.

O item 2 é desligável no onboarding e em Configurações → Privacidade. Desligar descarta na hora o que ainda estava na fila. Detalhes em [PRIVACY.md](PRIVACY.md).

Builds sem Supabase configurado — o caso de quem clona o repositório — não enviam nada, e a tela de Configurações diz isso explicitamente.

## Rodando localmente

Requer Node 20+ e o [ambiente Expo para desenvolvimento nativo](https://docs.expo.dev/get-started/set-up-your-environment/) (Android Studio ou Xcode).

```bash
npm install
npm run setup          # baixa Inter e JetBrains Mono para assets/fonts
npx expo run:android   # ou: npx expo run:ios
```

`npx expo start` sozinho não basta: `llama.rn` é um módulo nativo e não roda no Expo Go.

### Comandos

```bash
npm test           # testes das funções puras (CSV, estatísticas, telemetria)
npm run typecheck  # tsc --noEmit
npm run deps:check # confere versões contra a SDK do Expo
```

### Telemetria (opcional)

Sem as variáveis abaixo o app funciona normalmente e a telemetria vira no-op.

1. Crie um projeto no [Supabase](https://supabase.com).
2. Rode [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor. Ele cria a tabela, liga RLS e libera **apenas inserção** para a chave `anon`.
3. Copie `.env.example` para `.env` e preencha:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Variáveis `EXPO_PUBLIC_*` são embutidas no bundle — são públicas por definição. É por isso que a policy de RLS, e não o segredo da chave, é o que protege os dados.

## Estrutura

```
App.tsx                  raiz: onboarding, navegação, flush da telemetria
src/
  components/            componentes reutilizáveis (charts/ para os gráficos SVG)
  config.ts              variáveis de ambiente do build
  data/                  base de decks + gerador de dados de exemplo
  i18n/                  pt-BR · en-US · ja-JP
  navigation/            tab bar customizada
  screens/               uma tela por arquivo
  services/              llamaExtractor (IA local) · telemetry (envio anônimo)
  store/                 Zustand + persistência em AsyncStorage
  theme/                 cores, tipografia, espaçamento
  types/                 tipos compartilhados
  utils/                 estatísticas e CSV
supabase/schema.sql      esquema e políticas da telemetria
finetune/                scripts de fine-tuning (opcional, não usado no app)
design_handoff/          protótipo HTML que originou o design
```

## Stack

React Native 0.81 · Expo SDK 54 · TypeScript · Zustand · React Navigation 6 · react-native-svg · llama.rn · Jest

## Licença

[MIT](LICENSE).

Magic: The Gathering é marca da Wizards of the Coast. Este é um projeto de fã, não oficial e sem vínculo com a WotC, e não distribui dados nem imagens de cartas. Fontes, modelo de IA e demais dependências estão creditados em [NOTICE.md](NOTICE.md).
