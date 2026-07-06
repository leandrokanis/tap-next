# Redesign — "Tap Next — Protótipo v1"

Reimplementação completa da UI do iPhone (e restyle do Watch) seguindo o
protótipo hi-fi. A UI atual é descartada; motor, dados e navegação são
mantidos onde já cumprem a SPEC — e corrigidos onde divergem.

- **Fonte da verdade visual:** projeto Claude Design
  [`Tap Next.dc.html`](https://claude.ai/design/p/9e8a6a9e-5b09-421b-af4b-e51ac9a4d9c0?file=Tap+Next.dc.html)
  — cópia local em [`docs/design/tap-next-prototipo-v1.dc.html`](design/tap-next-prototipo-v1.dc.html).
- **Fonte da verdade de comportamento:** [SPEC §3](SPEC.md) e [PRD RF-\*](PRD.md).

## 1. Como o layout funciona (sistema de design)

Direção: **dark, alto contraste, números gigantes** — legível a um braço de
distância. O conceito do produto (*sempre saber o que vem a seguir*) vira
elemento fixo: a **barra "A SEGUIR"** aparece em toda fase da sessão, logo
acima do CTA.

Regras do sistema:

- **Uma cor de ação.** Azul `#4DA3FF` é o único acento de interação (CTA,
  progresso, destaques). Texto sobre azul é `#06121F` (quase-preto), nunca
  branco.
- **Âmbar `#FFB020` reservado ao overtime** (descanso zerou) e a estados
  parciais. Verde `#4ECB71` só para "completa". Vermelho `#FF5A3C` só para
  erro/descartar.
- **Duas famílias tipográficas.** `Archivo` (display/UI; 800 para números e
  títulos, letter-spacing negativo) e `IBM Plex Mono` (rótulos, metadados e
  dados; SEMPRE uppercase com letter-spacing 1–3px quando é rótulo).
- **Números tabulares** (`fontVariant: ['tabular-nums']`) em todo cronômetro
  e contador.
- **Hierarquia de superfície:** tela `#0B0D11` → card `#141820` → controle
  elevado `#171B22`. Bordas `rgba(255,255,255,0.06)` (cards) e `0.08`
  (controles). Raios: 16 (cards/linhas), 20 (cards grandes/CTA), 999 (pills,
  botões redondos).
- **Um CTA gigante por tela** (68–88px de altura, Archivo 800, uppercase),
  sempre no rodapé. Ações secundárias são botões `#171B22` com borda.
- **Cabeçalho de sessão fixo:** `SESSÃO mm:ss` (mono) à esquerda, círculos de
  pausa `❚❚` e fechar `✕` (40px, `#171B22`) à direita. Sem header nativo.
- **Progresso por exercício:** fileira de segmentos de 4px (1 por exercício),
  azul = feito/atual, `rgba(255,255,255,0.12)` = pendente.
- **Ícones são glifos de texto** (`‹ ✕ ❚❚ + ↑ ✓ ! − →`) — nenhuma lib de
  ícones.

### Tokens (novo `src/ui/theme.ts`)

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0B0D11` | fundo de tela |
| `card` | `#141820` | cards, linhas de lista |
| `control` | `#171B22` | botões redondos, botão secundário, chips de stepper |
| `borderCard` | `rgba(255,255,255,0.06)` | borda de card |
| `borderControl` | `rgba(255,255,255,0.08)` | borda de controle |
| `borderPending` | `rgba(255,255,255,0.12)` | segmento de progresso pendente, divisores |
| `text` | `#FFFFFF` | títulos, números |
| `textMid` | `#A7ADBA` | corpo, dados secundários |
| `textDim` | `#8A919E` | rótulos mono, metadados |
| `textDisabled` | `#5A616E` | CTA desabilitado |
| `accent` | `#4DA3FF` | ação, progresso, destaque |
| `onAccent` | `#06121F` | texto sobre azul |
| `accentSoftBg` / `accentSoftBorder` | `rgba(77,163,255,0.08)` / `0.25–0.35` | chips/realces azuis |
| `warning` | `#FFB020` (+ soft `0.12`/`0.35`) | overtime, parcial |
| `success` | `#4ECB71` (+ soft `0.12`) | badge completa |
| `danger` | `#FF5A3C` (+ soft `0.10`/`0.35`) | erro de import, descartar |

Tipos (escala usada nos mocks): display 40/44 (Archivo 800, ls −1), timer
gigante 92–128 (Archivo 800, ls −3/−4, tabular), título de card 17–22
(Archivo 700/800), corpo 13–14 (Archivo 400/500), rótulo mono 10–12
(Plex Mono 500/600, uppercase, ls 1–3).

### Inventário de componentes (novo `src/ui/`)

- `MonoLabel` — rótulo mono uppercase c/ letter-spacing (variantes dim/accent/warning).
- `Card` — superfície `card` + borda + raio 16/20.
- `RoundIconButton` — círculo 40/44px `control` (‹ ✕ ❚❚ + ↑).
- `BigCTA` — CTA azul 68–88px (variantes: primária, secundária escura,
  desabilitada, glow p/ overtime `shadow 0 0 0 6px rgba(77,163,255,0.18)`).
- `ProgressSegments` — segmentos por exercício.
- `NextUpBar` — card fino `A SEGUIR | <o que vem> | <detalhe>` (presente em
  TODA fase da sessão).
- `TimerText` — número gigante tabular (tamanhos m/l/xl; cores text/accent/warning).
- `Badge` — pill mono 10px (HOJE, TEMPO, COMPLETA, PARCIAL n/m).
- `StatCard` — número + rótulo (grid do resumo).
- `StepperField` — `− valor +` sobre `#0B0D11` raio 14 (REPS / KG).
- `SegmentedTabs` — pill dupla Treinos/Histórico no rodapé.
- `ProgressRing` — anel SVG 280px p/ isometria (**requer `react-native-svg`**).
- `AppModal` — modal card (`#171B22`, raio 24, overlay `rgba(0,0,0,0.5)`) p/
  retomada e confirmações (substitui `Alert`/`dialogs.ts` nos fluxos do design).

## 2. Divergências motor ↔ design (pré-requisito das telas 1.3–1.5)

O design (e a SPEC §3, PRD RF-02b/RF-06) exige comportamento que o motor
atual **não tem**:

1. **Descanso não avança sozinho** (RF-02b). Hoje `engine.tick()`
   (`src/engine/engine.ts:92`) auto-avança **qualquer** fase com duração —
   inclusive `rest`. Correto: ao zerar, descanso dispara alerta e entra em
   **overtime** (`+m:ss`, âmbar), aguardando toque. Isometria (`work` +
   `time`) continua auto-avançando.
2. **Registro prospectivo** (RF-06). Hoje `updateLoggedSet` edita a série já
   feita. Correto: "Próximo" grava a série com o prescrito na hora; os
   steppers do descanso editam o **próximo** set (override aplicado quando
   ele for gravado). Ajustes aparecem em azul no resumo → precisa de flag
   `adjusted` no `SessionSetRecord`.

Motores TS e Swift são gêmeos por fixtures compartilhadas
(`fixtures/engine/`) — toda mudança acontece nos dois + fixtures.

## 3. Plano

### Fase 0 — Fundamentos

- [x] Adicionar deps: `npx expo install expo-font @expo-google-fonts/archivo @expo-google-fonts/ibm-plex-mono react-native-svg`
- [x] Carregar fontes no `App.tsx` (Archivo 400/500/700/800 + itálicas se necessário; Plex Mono 400/500/600/700); segurar splash até carregar; fallback no web.
- [x] Reescrever `src/ui/theme.ts` com os tokens da tabela acima (cores, spacing, raios, escala tipográfica, famílias).
- [x] Reescrever `src/ui/components.tsx` → primitivos do inventário (MonoLabel, Card, RoundIconButton, BigCTA, Badge, StatCard, StepperField, SegmentedTabs, ProgressSegments, NextUpBar, TimerText, AppModal).
- [x] `ProgressRing` com `react-native-svg` (stroke-dasharray/offset como no mock 1.5).
- [x] Remover header nativo do stack (`headerShown: false`) — telas desenham o próprio cabeçalho.
- [x] i18n: adicionar todas as strings novas do protótipo em `pt-BR.json` **e** `en.json` (A SEGUIR, TEMPO DA SÉRIE, DESCANSO ZEROU, SEGURE, ENCERRAR ANTES, INICIAR PRÓXIMO, Sessão completa, Sessão interrompida, RETOMAR DE ONDE PAREI, etc.).

### Fase 1 — Motor (RF-02b + RF-06)

- [x] TS: `tick()` para de auto-avançar `rest`; descanso permanece ativo após zerar (overtime = `elapsed − duration`). Sinal (som/notificação) dispara ao zerar, sem transição de fase.
- [x] TS: gravação prospectiva — "Próximo" grava set com prescrito; novo `setUpcomingOverride({ reps?, weight? })` aplicado ao próximo work quando gravado; marca `adjusted: true`.
- [x] `SessionSetRecord`: campo opcional `adjusted?: boolean` (domain, mappers, export, watch sync — retrocompatível).
- [x] Atualizar fixtures em `fixtures/engine/` para o novo contrato (descanso segura, override prospectivo).
- [x] Swift: espelhar em `watch/TapNextEngine` (mesmas fixtures; `swift test --package-path watch/TapNextEngine` verde).
- [x] `SessionProvider`/`alerts`: sinal ao zerar descanso sem avançar fase; notificação local de fim de descanso mantida; auto-avanço só em isometria.
- [x] Testes Jest do motor atualizados (`src/engine/__tests__`).

### Fase 2 — Fluxo de sessão (telas 1.1–1.6)

- [x] **1.1 Pré-sessão** — nova rota `WorkoutDetail` (`Home` → detalhe → `Session`): header `‹ | TREINO`, nome display 40, linha meta mono `N EXERCÍCIOS · N SÉRIES · ~N MIN` (estimativa), lista numerada (índice azul mono, nome 17, prescrição mono 12 `3 × 10 · 60 kg · desc 90 s`), badge `TEMPO` nos de isometria, CTA `INICIAR` 76px.
- [x] **1.2 Execução (reps)** — header sessão (elapsed mono + ❚❚ ✕), ProgressSegments, `EXERCÍCIO X DE Y` (mono azul), nome 44, `Série X de Y · reps · kg`, centro `TEMPO DA SÉRIE` + timer progressivo 104px, NextUpBar (`Descanso 90 s → série 2/3`), CTA `PRÓXIMO` 88px.
- [x] **1.3 Descanso** — chip azul `✓ Série N gravada — reps · kg`, `DESCANSO` + countdown azul 128px + `DE m:ss`, card `A SEGUIR` com steppers prospectivos REPS/KG (StepperField), CTA `INICIAR PRÓXIMO`.
- [x] **1.4 Overtime** — pill âmbar `● DESCANSO ZEROU`, `+m:ss` âmbar 128px, texto `Tempo extra além dos N s prescritos` + `Toque quando estiver pronto.`, NextUpBar, CTA com glow azul.
- [x] **1.5 Isometria** — ProgressRing 280px com countdown 92px + `SEGURE`, legenda `Avança sozinha ao zerar — som + vibração`, NextUpBar (`Pausa 15 s → série 3/3`), botão secundário `ENCERRAR ANTES` 64px.
- [x] **1.6 Resumo** — nova rota/estado pós-conclusão: ✓ azul, `Sessão completa`, `NOME · HOJE, HH:MM`, grid StatCard (DURAÇÃO / SÉRIES / KG TOTAL com separador pt-BR), linhas por exercício com sets `reps·kg` (ajustados em azul via `adjusted`), rodapé `AJUSTES FEITOS NO DESCANSO EM AZUL`, CTA `CONCLUIR` (persiste via `saveCompleted`).
- [x] Pausa: estado visual de pausado (design não mostra — manter overlay/estado simples coerente com o sistema).
- [x] Manter `testID`s existentes dos flows Maestro (ou atualizar flows na Fase 5).

### Fase 3 — Treinos · Histórico · Dados (telas 2.1–2.4)

- [x] **2.1 Lista de treinos** (reescrever `HomeScreen`) — título display `Treinos` + RoundIconButton `+` (vai p/ Importar), cards: nome 22, meta mono, linha `Última: <quando> · <status> · <kg total>`; card do treino do dia com borda azul + badge `HOJE`; SegmentedTabs no rodapé.
- [x] Dados p/ 2.1: `sessionRepository.lastSessionPerWorkout()` (+ tonelagem `Σ reps×kg`); util de tempo relativo (`há 5 dias`, `ontem`).
- [x] **2.2 Histórico** (reescrever `HistoryScreen`) — título + botão export `↑` (fluxo `export.ts` atual), agrupamento por mês (mono uppercase), cards com badge `COMPLETA`/`PARCIAL n/m` e linha mono `DATA · DURAÇÃO · N SÉRIES · IPHONE|WATCH`; SegmentedTabs.
- [x] `PARCIAL n/m`: n = sets feitos, m = sets prescritos — verificar se `SessionRecord` permite derivar m (workoutName → treino atual pode ter mudado); se não, gravar `plannedSets` no record (retrocompatível).
- [x] **HistoryDetail** — restylizar na mesma linguagem (layout tipo resumo 1.6, sem CTA).
- [x] **2.3 Importar** (reescrever `ImportScreen`) — header `‹ | IMPORTAR TREINO`, texto de apoio, editor/preview mono do JSON, card de erro vermelho `N ERRO(S) ENCONTRADO(S)` + `exercises[i].campo — regra` (de `parseWorkout`; linha/coluna best-effort do `JSON.parse`), CTA `IMPORTAR` desabilitado enquanto inválido.
- [x] **2.4 Retomada pós-crash** — substituir alert por `AppModal` sobre a lista (dim `rgba(0,0,0,0.5)`): ícone `!` âmbar, `Sessão interrompida`, corpo com treino/fase/tempo (`parou há N min... Nada foi perdido.`), botões `RETOMAR DE ONDE PAREI` (azul) / `Salvar como parcial e sair` (escuro) / `Descartar` (texto vermelho).
- [x] Confirmações restantes de `dialogs.ts` nos fluxos redesenhados migram p/ `AppModal` (web continua com fallback).

### Fase 4 — Apple Watch (3.1–3.3)

- [x] Paleta e linguagem nos views SwiftUI (`watch/TapNextWatch`): fundo preto, azul `#4DA3FF`/texto `#06121F`, âmbar overtime, mono p/ rótulos (SF Mono — Archivo/Plex não embarcadas).
- [x] **3.1 Execução** — `n/n` azul + relógio, nome, prescrição, timer 54, CTA `PRÓXIMO`.
- [x] **3.2 Descanso** — countdown azul, `A SEGUIR · SÉRIE n/n`, card `reps | kg` ajustável pela Digital Crown (prospectivo, RF-06), CTA `INICIAR PRÓXIMO`.
- [x] **3.3 Overtime** — `ZEROU` âmbar, `+m:ss`, `Toque quando estiver pronto`, CTA com glow.
- [x] Motor Swift já alinhado pela Fase 1 (fixtures) — só UI.

### Fase 5 — QA / paridade

- [x] `npm run typecheck` e `npm test` verdes.
- [x] `swift test --package-path watch/TapNextEngine` verde (paridade de fixtures).
- [x] Flows Maestro (`e2e/flows/*.yaml`) atualizados p/ novos textos/testIDs; `npm run e2e` verde.
- [ ] Sanidade no web (`npm run web`): fontes, SVG ring, modais.
- [x] Rodar no simulador (`npm run ios`) e conferir tela a tela contra o protótipo (side-by-side).
- [x] Atualizar screenshots/READMEs se citarem UI antiga.

## 4. Fora de escopo (por ora)

- Criação/edição de treino no app (mock 2.1 tem `+`, que leva ao Importar).
- Blur real atrás do modal de retomada (usamos dim; `expo-blur` se fizer falta).
- Fontes custom no watchOS.
