# Design Handoff — MTG Tracker

## Overview

MTG Tracker é um aplicativo mobile (iOS e Android) de rastreamento de partidas de Magic: The Gathering com processamento 100% on-device. O usuário segura um botão de microfone, descreve a partida em voz alta, e um modelo de linguagem local extrai os dados automaticamente. O app também suporta entrada manual via texto ou formulário.

---

## Sobre os arquivos de design

Os arquivos neste pacote são **protótipos de design em HTML/React** — referências visuais e comportamentais de alta fidelidade (hi-fi), **não código de produção para copiar diretamente**.

A tarefa é **recriar estas telas no ambiente mobile real do projeto** (React Native, Flutter, Swift/SwiftUI, Kotlin/Compose, etc.) usando os padrões, bibliotecas e design system já estabelecidos — ou, se o projeto ainda não tem stack definida, escolher o framework mais adequado e implementar a partir deste design.

**Fidelidade:** Alta fidelidade (hi-fi). O protótipo usa cores, tipografia, espaçamento e interações finais. Recrie pixel-a-pixel usando as bibliotecas nativas da stack escolhida.

Para abrir o protótipo interativo: abra `MTG Tracker Prototype.html` num browser.

---

## Stack do protótipo (referência)

- React 18 + Babel (inline JSX, sem bundler)
- CSS custom properties para tokens de design
- Fonte: Inter (UI) + JetBrains Mono (mono/labels)
- LocalStorage para persistência de estado
- Sem dependências externas além do React

---

## Arquitetura de telas

```
App (MTG Tracker Prototype.html)
├── OnboardingScreen        — 4 passos (first-launch)
├── HomeScreen              — Gravação de voz / texto / formulário
├── ReviewScreen            — Revisão dos dados extraídos
├── HistoryScreen           — Lista de partidas agrupadas por dia
├── StatsScreen             — Gráficos e estatísticas filtradas
├── SettingsScreen          — Configurações do app
│   └── ManageDecksScreen   — Gerenciamento de decks
└── LifeScreen              — Contador de vida (2–6 jogadores)
```

Navegação via **TabBar** na parte inferior com 5 itens:
`Life · Stats · [Record — botão central elevado] · Matches · Settings`

---

## Telas — especificação detalhada

---

### 1. HomeScreen (`prototype/screen-home.jsx`)

**Propósito:** Tela principal — o usuário grava, digita ou preenche um formulário para capturar uma partida.

**Estados:**
- `idle` — repouso, fundo claro (`--bg`)
- `recording` — fundo escuro (`--dark`), botão vermelho pulsante
- `processing` — spinner animado, mensagem de progresso

**Layout (idle):**
```
[Header: label "How'd it go?" + badge "On-device"]
[Timer 0:00 em JetBrains Mono 42px]
[Waveform estática (32 barras de 3×8px)]
[Texto instrucional]
[FLEX PUSH]
[Labels acima dos botões: "Type · Hold mic · Form" — fonte mono 9px uppercase]
[Row de botões: [Keyboard 52px] [Mic 168px] [Form 52px]]
[Padding inferior 16px + safe area]
```

**Botão de gravação:**
- Tamanho: 168×168px, `border-radius: 999px`
- Idle: `background: var(--surface)`, borda 1.5px sólida `--ink`
- Recording: `background: var(--accent)` + 2 anéis pulsantes (`pulse-ring`)
- Processing: desabilitado

**Labels dos botões:**
- Posicionadas **acima** de cada botão (não abaixo)
- Fonte: JetBrains Mono, 9px, uppercase, `--ink-4`
- Visíveis apenas no estado `idle`

**Overlays (position: absolute, inset: 0):**
- `type` — textarea para descrever a partida em texto
- `form` — `MatchForm` completo para entrada manual

---

### 2. ReviewScreen (`prototype/screen-review.jsx`)

**Propósito:** Exibido após processamento de voz — mostra o transcript e os dados extraídos para revisão.

**Layout:**
```
[Header: botão "Re-record" + badge "Extracted locally"]
[Card do transcript com duração]
[MatchForm scrollável]
```

**Badges de confiança no MatchForm:**
- `high` — sem badge
- `default` — badge cinza "DEFAULT" (campo usou valor padrão)
- `low` — badge amarelo "LOW CONF"
- `missing` — badge vermelho "MISSING"

---

### 3. HistoryScreen (`prototype/screen-other.jsx`)

**Propósito:** Lista de todas as partidas, agrupadas por data, com edição inline.

**Layout:**
```
[Title "Matches" + contagem total]
[Por cada dia: label com a data + card com lista de partidas]
  [Cada partida: badge W/L (28×28 arredondado) + deck vs opp + detalhes + ícone edit]
```

**Ao clicar numa partida:** abre `MatchForm` em modo edição com todos os campos, incluindo **data editável**.

**Cores do badge W/L:**
- Win: `background: --good-soft`, `color: --good`
- Loss: `background: --bad-soft`, `color: --bad`

---

### 4. StatsScreen (`prototype/screen-stats.jsx`)

**Propósito:** Dashboard de estatísticas com filtros combinados.

**Filtros disponíveis:** Format · My Deck · Opponent Deck · Period (7d/30d/90d/All) · Result

**Componentes de gráfico (todos SVG inline):**
- `ChartDonut` — donut com win rate no centro
- `ChartLine` — linha de evolução (rolling 5 partidas)
- `ChartSplit` — barra split On-the-play vs On-the-draw
- `ChartBars` — barras horizontais (oponentes + archetypes)
- `DeckList` — lista W/L/% por deck

**Estrutura do resultado:**
```
[Donut 90px] [Total/W/L] [Streak +N]
[Line chart: Win rate over time]
[Split bar: On play vs On draw]
[Bars: Win rate by my deck]
[Bars: Most faced opponents]
[Bars: Win rate vs archetype]
```

---

### 5. SettingsScreen (`prototype/screen-other.jsx`)

**Seções:**

#### Defaults
- **Default format** — `<select>` dropdown com: Commander · Modern · Standard · Pioneer · Legacy · Pauper · Draft · Other
- **Default deck** — `DeckSelector` (autocomplete com base no formato escolhido)

#### Language
- Seleção de idioma: English (en-US) · Português (pt-BR) · 日本語 (ja-JP)
- Checkmark (✓) na opção ativa
- Implementar i18n real na versão de produção

#### Privacy
- "On-device processing" — toggle sempre ativo (read-only, sempre ON)
- "Share anonymous results" — toggle ligável/desligável

#### Data
- **Export all matches (.csv)** — exporta partidas em CSV com campos: date, format, myDeck, oppDeck, archetype, onPlay, won, notes
- **Import matches (.csv)** — abre file picker, faz parse do CSV, evita duplicatas por ID, exibe feedback "+N imported" ou "Invalid file"
- **Manage decks** — navega para `ManageDecksScreen`
- **Delete all data** — texto vermelho (`--bad`)

---

### 6. ManageDecksScreen (`prototype/screen-other.jsx`)

**Propósito:** Lista todos os decks já usados pelo jogador com estatísticas e permite renomear.

**Layout:**
```
[Header: "← Settings" + título "My Decks"]
[Search input]
[Card list: cada deck com nome, formato, nº de partidas, win rate %]
  [Ícone de lápis (edit) em cada linha]
  [Ao clicar: input inline inline com botões "Save" e "✕"]
```

**Rename:** ao salvar, propagar renomeação para **todos os matches** existentes (myDeck e oppDeck).

---

### 7. LifeScreen (`prototype/screen-life.jsx`)

**Propósito:** Contador de vida para 2–6 jogadores.

**Setup screen (multiplayer):** grid de seleção de número de jogadores (2–6) + vida inicial (20/30/40).
**1v1 (Modern/Standard/etc.):** vai direto para o game screen com 2 jogadores.

**Game screen:**
- 2 jogadores: layout rotacionado 180° para cada lado da mesa
- 3–6 jogadores: grid de linhas com 2 colunas
- Cada célula: zona de toque esquerda (−1) e direita (+1) + número de vida centralizado
- Hold: acelera o decremento/incremento (após 20 taps: step de 5)
- Delta indicator: mostra +N ou −N temporariamente acima do número
- Vida ≤ 5: cor `#e07a40` (laranja alerta)
- Vida ≤ 0: cor `#c0422a` + fundo avermelhado na célula
- Botão reset (topo central): pede confirmação antes de resetar

---

### 8. OnboardingScreen (`prototype/screen-other.jsx`)

**4 passos com dots de progresso:**

1. Splash — proposta de valor + "100% on-device"
2. Escolha de formato padrão (grid 2 colunas, 8 opções)
3. Deck padrão via `DeckSelector`
4. Opt-in para compartilhar resultados anônimos

---

## Componentes compartilhados (`prototype/ui.jsx`)

### MatchForm
Formulário completo de partida. Campos:
| Campo | Tipo | Notas |
|---|---|---|
| Date | `<input type="date">` | Editável — suporte a entradas retroativas |
| Result | Segmented (Win/Loss) | |
| Format | Segmented (6 opções) | |
| My deck | DeckSelector | Autocomplete |
| Opponent deck | DeckSelector | Autocomplete |
| On the play/draw | Segmented | |
| Opponent archetype | Segmented (5 opções) | |
| Notes | Textarea | Opcional |

### DeckSelector
Autocomplete com:
- "Create new" sempre no topo (sticky)
- Seção "Recently used" (últimos 5)
- Lista completa do formato (~30–50 decks por formato)
- Filtro por query em tempo real
- Dropdown com `max-height: 220px` + scroll

**Database de decks** (`prototype/data.js` — `DECK_DB`):
Cobre os últimos 5 anos dos formatos principais:
- Commander: ~80 commanders (cEDH + casual)
- Modern: ~50 archetypes
- Standard: ~40 archetypes
- Pioneer: ~45 archetypes
- Legacy: ~35 archetypes
- Pauper: ~30 archetypes

### Gráficos
Todos implementados como SVG inline — recomenda-se usar Victory Native, Recharts, ou equivalente na stack de produção.

### Icon
SVG inline para os ícones do app. Ícones usados:
`mic · keyboard · form · stats · list · settings · chev · check · x · edit · plus · filter · back · trash · heart · share · shield`

Recomenda-se substituir por uma biblioteca de ícones (Lucide, Phosphor, etc.) na produção.

---

## Design Tokens

### Cores
```css
/* Neutros — escala cinza quente */
--bg:        #f7f6f2   /* fundo principal */
--bg-2:      #efede7   /* fundo alternativo */
--surface:   #ffffff   /* cards, inputs */
--surface-2: #fafaf7   /* cards secundários */
--ink:       #17160f   /* texto principal */
--ink-2:     #3d3b32
--ink-3:     #6b685c
--ink-4:     #9e9a8b
--ink-5:     #c7c3b4
--line:      #e6e3da   /* bordas */
--line-2:    #eeece5   /* separadores sutis */

/* Accent — vermelho-laranja para gravação/atenção */
--accent:      oklch(0.62 0.16 28)   /* ~#d45f3c */
--accent-soft: oklch(0.95 0.03 28)

/* Semântico */
--good:      oklch(0.54 0.09 155)  /* ~#3a8c5c — vitória */
--good-soft: oklch(0.95 0.03 155)
--bad:       oklch(0.56 0.13 25)   /* ~#c0422a — derrota */
--bad-soft:  oklch(0.95 0.03 25)

/* Dark — tela de gravação */
--dark:   #16150f
--dark-2: #24231c
--dark-3: #33322a
```

### Tipografia
```
UI:   Inter, -apple-system, system-ui, sans-serif
Mono: JetBrains Mono, ui-monospace, Menlo, monospace
```

| Uso | Tamanho | Peso |
|---|---|---|
| Page title | 22px | 700 |
| Section title | 18px | 700 |
| Body / list item | 13px | 500 |
| Body small | 12px | 400 |
| Label (mono, uppercase) | 10px | 400 |
| Micro label | 9px | 400 |
| Timer | 42px | 600 |
| Life counter | 80px | 700 |

### Espaçamento
```
Padding de página:  18px horizontal
Gap entre seções:   14px
Padding de card:    12–16px
Row height mínima:  52px
Border radius:
  --radius:    14px  (cards)
  --radius-sm: 8px   (inputs, chips)
  --radius-lg: 20px  (modais)
  Botões:      999px (pill)
```

### Sombras
```
Phone shell:
  0 40px 80px rgba(0,0,0,0.14),
  0 8px 30px rgba(0,0,0,0.08),
  0 0 0 1px rgba(0,0,0,0.08)

Mic button (recording):
  0 0 0 10px rgba(220,95,60,0.18),
  0 20px 40px rgba(220,95,60,0.35)

Mic button (idle):
  0 10px 30px rgba(0,0,0,0.14),
  0 2px 6px rgba(0,0,0,0.08)
```

---

## Comportamentos e interações

### Gravação de voz
1. `onMouseDown` / `onTouchStart` → inicia timer + anéis pulsantes
2. `onMouseUp` / `onTouchEnd` → se duração < 1.2s, cancela; senão → estado `processing`
3. Após 2.2s simulados → navega para `ReviewScreen`
4. **Produção:** integrar com API de speech-to-text on-device (Whisper, MLKit, etc.)

### Processamento on-device
- O protótipo **simula** o processamento com timeout
- Em produção: modelo local (ex: Gemma 3n, Whisper) extrai: format, myDeck, oppDeck, archetype, onPlay, won
- Cada campo extraído recebe um nível de confiança: `high | low | default | missing`

### Safe Area (Android)
- Tab bar: `padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px)`
- Adicionar `<meta name="viewport" content="viewport-fit=cover">` no app
- Usar `WindowInsets` (Compose) ou `SafeAreaView` (RN) para todas as telas

### Persistência
- Produção: SQLite ou Room (Android) / CoreData (iOS) / Realm (RN)
- O protótipo usa `localStorage` — estrutura de dados idêntica à produção

### Estrutura de uma partida (Match)
```typescript
interface Match {
  id: string;           // unique ID
  date: string;         // ISO 8601
  format: string;       // 'Commander' | 'Modern' | 'Standard' | 'Pioneer' | 'Legacy' | 'Pauper' | 'Draft' | 'Other'
  myDeck: string;       // nome do deck do jogador
  oppDeck: string;      // nome do deck do oponente
  archetype: string;    // 'Aggro' | 'Midrange' | 'Control' | 'Combo' | 'Stax'
  onPlay: boolean;      // true = on the play
  won: boolean;         // true = vitória
  notes: string;        // notas livres
}
```

### Estrutura de settings
```typescript
interface Settings {
  defaultFormat: string;
  defaultDeck: string;
  shareAnon: boolean;
  language: 'en-US' | 'pt-BR' | 'ja-JP';
  onboarded: boolean;
  deckRenames: Record<string, string>; // { oldName: newName }
}
```

### Export/Import CSV
- Campos: `date, format, myDeck, oppDeck, archetype, onPlay, won, notes`
- Booleanos: `TRUE` / `FALSE`
- Campos com vírgulas: envolvidos em aspas duplas
- Import: parse tolerante a erros, deduplicação por `id`

---

## i18n

O app suporta 3 idiomas (selecionável em Settings → Language):
- `en-US` — English (padrão)
- `pt-BR` — Português (Brasil)
- `ja-JP` — 日本語

O protótipo ainda usa strings em inglês fixas. Na produção, usar `i18next`, `react-intl`, ou equivalente nativo. Todas as strings visíveis ao usuário devem ser externalizadas.

---

## Animações

| Elemento | Animação | Duração | Easing |
|---|---|---|---|
| Pulse rings (recording) | scale 1→1.3 + fade | 1.6s | cubic-bezier(0.4,0,0.6,1) |
| Pulse ring delay | igual, delay 0.8s | — | — |
| Processing spinner | rotate 360° | 0.9s | linear, infinite |
| Waveform bars | altura aleatória | 80ms tick | ease |
| Mic button state | background + shadow | 0.25s | ease |
| Segmented pill | background | 0.12s | ease |
| Toggle | translateX(18px) | 0.2s | ease |
| Donut chart | stroke-dashoffset | 0.6s | ease |

---

## Arquivos neste pacote

```
design_handoff/
├── README.md                        ← este arquivo
├── MTG Tracker Prototype.html       ← protótipo interativo completo
├── styles-hifi.css                  ← tokens de design + CSS
└── prototype/
    ├── data.js                      ← dados mock + DECK_DB + funções de stats
    ├── ui.jsx                       ← componentes compartilhados (Icon, TabBar, Phone, Charts, DeckSelector, MatchForm)
    ├── screen-home.jsx              ← tela de gravação
    ├── screen-review.jsx            ← revisão pós-processamento
    ├── screen-stats.jsx             ← estatísticas e gráficos
    ├── screen-other.jsx             ← History, Settings, ManageDecks, Onboarding
    └── screen-life.jsx              ← contador de vida
```

---

## Checklist de implementação

- [ ] Configurar safe area (topo e inferior) em todas as telas
- [ ] Implementar gravação de voz com modelo on-device
- [ ] Implementar DeckSelector com autocomplete nativo
- [ ] Implementar persistência de matches (SQLite/CoreData/Room)
- [ ] Implementar export/import CSV
- [ ] Implementar i18n (en-US, pt-BR, ja-JP)
- [ ] Implementar gráficos com biblioteca nativa (Victory, MPAndroidChart, etc.)
- [ ] Implementar rename de deck com propagação para todos os matches
- [ ] Adicionar campo de data editável no formulário de partida
- [ ] Implementar onboarding (first-launch, 4 passos)
- [ ] Contador de vida (2–6 jogadores, hold para acelerar)
- [ ] Adicionar haptic feedback no botão de gravação e nas interações de vida
