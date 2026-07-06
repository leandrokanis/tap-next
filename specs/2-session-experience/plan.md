# Plano: Experiência de Sessão v2 — count-in, localização, overtime calmo e som por evento

## Decisões técnicas

- **Fase `leadin` explícita na expansão de fases** — novo membro da union `Phase` (TS) / novo case em `Phase.Kind` (Swift), inserido por `expandPhases` antes de cada `work` com `mode: time`, com `duration: 3` (constante `LEADIN_SECONDS`). Alternativa rejeitada: contagem dinâmica dentro do `tick` — quebraria a simetria fixture ↔ snapshot e espalharia estado implícito.
- **`tick` auto-avança o `leadin`** como qualquer fase cronometrada não-rest (mesmo laço em cascata, boundary exato). `advance` só registra set quando `phase.type === 'work'`, então o `leadin` não loga nada por construção. `next` durante o `leadin` avança direto para o `work` (posicionou antes → começa já).
- **Exclusão do tempo de preparação**: novo campo `leadinSeconds` no `EngineState` (análogo a `pausedSeconds`), acumulado no `advance` ao sair de um `leadin` (tempo ativo da fase). `sessionElapsed` desconta `leadinSeconds` **e** o tempo ativo do `leadin` em curso — o relógio da sessão congela durante o count-in. `summarize`/`durationSeconds` herdam a exclusão de graça.
- **Retrocompatibilidade de snapshot**: snapshots antigos não têm `leadinSeconds` — loader TS (`src/data/activeSession.ts`) faz backfill `?? 0`; Swift decodifica com `decodeIfPresent` + default `0`. Snapshots antigos também não contêm fases `leadin` (expansão gravada) — sessão retomada segue as fases antigas, comportamento aceitável.
- **Eventos de alerta tipados**: enum `AlertEvent = countinTick | go | isometryEnd | restStart | restEnd | sessionDone`. `alerts.ts` expõe `signal(event)` com um player por evento; `SessionProvider` decide o evento pela transição observada (não mais um `signalPhaseEnd()` genérico).
- **Precedência na transição isometria→descanso**: toca só `isometryEnd` (não empilha `restStart` no mesmo instante). `restStart` fica para a entrada em rest vinda de reps (`next` manual).
- **Paleta sintetizada por script**: `scripts/generate-sounds.js` — Node puro, sem dependências, escreve WAV PCM 16-bit mono 44.1kHz em `assets/sounds/` (6 arquivos, versionados). Script npm `sounds` para regenerar. Timbres distintos por frequência/envelope/nº de pulsos.
- **Token de cor**: `colors.rest` (verde-menta, ex. `#35D0A0`) + `restSoftBg`/`restSoftBorder`, distinto de `success` (`#4ECB71`, reservado a "completa"). Espelho no `Theme` do Watch.
- **Hápticos distintos no Watch** (sem paleta de som): mapa por evento — countinTick `.click`, go `.directionUp`, isometryEnd `.notification`, restStart `.start`, restEnd `.stop`, sessionDone `.success`.
- **Sem mudança de persistência**: `SessionRecord`/SQLite/export/sync intocados (`durationSeconds` já deriva de `sessionElapsed`).
- **Notificação de background**: mantém o som do sistema (fora de escopo); `phaseRemaining` já cobre o `leadin` (janela de 3 s, irrelevante na prática).

## Impacto no motor de sessão

**Toca o motor** (ADR 0002 — lockstep TS + Swift + fixtures):

- `EngineState`: + `leadinSeconds: number` / `Double` (com default 0 na decodificação Swift).
- `phases.ts` / `PhaseExpansion.swift`: `LeadinPhase { type:'leadin', exerciseIndex, setNumber, duration: 3 }` antes de cada work `mode:time`; Swift adiciona case `.leadin` em `Phase.Kind` (struct `Phase` já comporta os campos).
- `engine.ts` / `SessionEngine.swift`:
  - `tick`: laço passa a avançar `leadin` e `work` cronometrados (critério continua "não-rest com duration").
  - `advance`: ao sair de `leadin`, acumula `completedAt/at − phaseStartedAt` (ativo) em `leadinSeconds`.
  - `sessionElapsed`: subtrai `leadinSeconds` + elapsed ativo do `leadin` corrente.
  - `phaseOvertime`, registro de set, override: inalterados.
- Runners de fixture (`fixtures.test.ts` + `FixtureTests.swift`): aceitar `phase: "leadin"` nas asserções.

**Fixtures novas** (`fixtures/engine/`):
| Fixture | Prova |
|---|---|
| `12-leadin-before-every-timed-set.json` | start em exercício de tempo → `leadin` remaining 3; tick em +3 → `work`; após rest+next → novo `leadin` na série 2 (toda série, não só a 1ª) |
| `13-leadin-excluded-from-session-elapsed.json` | `sessionElapsed` congela durante o leadin (em curso e acumulado após várias séries); duração de `summarize` implícita |
| `14-next-during-leadin-starts-work.json` | `next` em t+1 do leadin → `work` imediato, remaining cheio, nenhum set logado |
| `15-pause-during-leadin.json` | pause congela remaining do leadin; resume desloca; auto-avanço só após completar 3 s ativos |

**Fixtures existentes a ajustar** (envolvem `mode: time` — ganham fase `leadin` na expansão): `02-time-exercise-auto-advances`, `04-next-ends-timed-exercise-early`, `10-tick-cascades-across-phases`, e qualquer outra com exercício de tempo (verificar 05/06/07). Cascata do 10: tick longo atravessa `leadin`+`work` consecutivos.

## Modelo de dados & persistência

- **Domínio** (`src/domain/`): sem mudança (`Workout`/`Exercise`/`SessionSetRecord` intactos).
- **SQLite / mappers / export / sync**: sem mudança.
- **Snapshot** (`src/data/activeSession.ts` + Swift `SessionViewModel.loadPendingSnapshot`): tolerar ausência de `leadinSeconds` (backfill 0).

## UI

### iPhone
- `src/ui/theme.ts`: tokens `rest`, `restSoftBg`, `restSoftBorder`.
- `src/ui/components.tsx` — `ProgressSegments`: passa a receber séries do exercício atual com estado triplo (feita / atual em destaque / pendente).
- `src/screens/SessionScreen.tsx`:
  - Barra do topo: segmentos = séries do exercício atual; `EXERCÍCIO X DE Y` como rótulo (todas as vistas).
  - Nova `LeadinView`: número gigante 3→2→1, nome do exercício, sem CTA extra além do avanço (pular preparação).
  - `RestView`: cronômetro em `colors.rest`; nome do exercício visível; remoção de "Tempo extra além dos X s", "Toque quando estiver pronto".
  - Overtime: sem `TimerText` de tempo extra; card A SEGUIR vira herói central (tipografia maior), CTA `glow` embaixo; nome do exercício visível.
  - `WorkView`: remove hint "Avança sozinha ao zerar — som + vibração" (`isoHint`); mantém `SEGURE`.
- `src/services/alerts.ts`: `prepareAudio` carrega 6 players; `signal(event: AlertEvent)`; remove `signalPhaseEnd` genérico.
- `src/session/SessionProvider.tsx`: deriva o evento da transição (leadin tick por mudança de `ceil(remaining)`; leadin→work = `go`; timed-work→rest = `isometryEnd`; reps→rest = `restStart`; rest zerou = `restEnd`; completou tudo = `sessionDone`).
- `assets/sounds/*.wav` (novos), `assets/beep.wav` removido do uso.

### Watch (revisável — target Xcode manual, `docs/WATCH_SETUP.md`)
- `SessionView.swift`: `leadinView` (número gigante), nome do exercício em rest/overtime, overtime sem contador (próximo set como herói + CTA), cor rest no cronômetro de descanso, remove `tap_ready`.
- `SessionViewModel.swift`: hápticos por evento (mapa da seção Decisões), incluindo tick do count-in por segundo.
- `Localizable.strings` (pt-BR + en): chaves novas/removidas.

## i18n

- Novas: `session.leadinGo` ("VAI"), `session.exerciseOf` (já existe — reutilizada nas demais vistas), rótulo do count-in (ex. `session.getReady` "PREPARE"), o que mais surgir nas telas.
- Removidas: `session.isoHint`, `session.overtimeHint`, `session.tapReady`, `session.restZeroed` (manter? — vira rótulo curto opcional; decidir na implementação, default: remover).
- Sempre em `pt-BR.json` **e** `en.json`.

## Cenários de teste (BDD)

### Motor / domínio / dados — Jest
```
Scenario: leadin antecede toda série de tempo
  Given treino com exercício mode:time de 2 séries
  When a sessão inicia
  Then a fase atual é leadin com remaining 3
  When tick em t+3
  Then a fase é work da série 1

Scenario: leadin não conta no tempo de sessão
  Given sessão em leadin há 2 s
  Then sessionElapsed é 0
  When o leadin completa e o work corre 10 s
  Then sessionElapsed é 10

Scenario: next durante o leadin pula a preparação
  Given fase leadin com 2 s restantes
  When next
  Then fase work com remaining igual à duração prescrita e nenhum set novo logado

Scenario: pause durante o leadin congela a contagem
  Given fase leadin com 2 s restantes
  When pause por 30 s e resume
  Then remaining segue 2 e o auto-avanço ocorre 2 s depois

Scenario: snapshot antigo sem leadinSeconds
  Given um snapshot serializado sem o campo leadinSeconds
  When o snapshot é carregado
  Then o estado hidrata com leadinSeconds 0
```

### Fixtures compartilhadas
As quatro fixtures novas + ajustes descritos em "Impacto no motor". Rodam em Jest e `swift test`.

### UI — Jest (alerts/provider)
```
Scenario: cada evento tem som próprio
  Given os 6 players preparados
  When signal(evento) para cada evento
  Then cada chamada usa um asset distinto

Scenario: isometria→descanso toca só fim de isometria
  Given work mode:time que zera para um rest
  Then dispara isometryEnd e não restStart
```

### E2E — Maestro
- `02-session-happy-path.yaml`: incorporar count-in se o flow usa exercício de tempo (aguardar 3 s ou avançar), asserts dos novos textos/ausência dos removidos (`session-screen`, `work-phase`, `rest-phase`, `next-button`).
- Verificar 01/03 por textos removidos.

## Fluxo de implementação

### Fase 1 — Motor + fixtures
1. Fixtures novas 12–15 + ajuste das existentes com `mode: time`
2. TS: `phases.ts`, `engine.ts`, runner; Jest verde
3. Swift: `Models.swift` (case `.leadin`, `leadinSeconds` com default), `PhaseExpansion.swift`, `SessionEngine.swift`, `FixtureTests.swift`; `swift test` verde

### Fase 2 — Domínio & persistência
1. Backfill `leadinSeconds` no loader de snapshot TS (`activeSession.ts`) + teste

### Fase 3 — UI + i18n
1. `scripts/generate-sounds.js` + `assets/sounds/` + npm script
2. Chaves i18n (pt-BR + en): novas e remoção das obsoletas
3. `theme.ts` (tokens rest), `components.tsx` (ProgressSegments triplo), `alerts.ts` (signal por evento), `SessionProvider.tsx` (derivação de eventos)
4. `SessionScreen.tsx`: LeadinView, barra por séries, nome no rest/overtime, overtime herói, textos removidos
5. Watch: `SessionView.swift`, `SessionViewModel.swift`, `Localizable.strings`

### Fase 4 — E2E
1. Atualizar flows Maestro afetados

## Riscos e decisões pendentes

- **Cascata do tick com leadin**: tick longo (app acordando do background) atravessa `leadin→work→leadin→…`; o laço existente cobre, mas a fixture 10 ajustada é o guarda.
- **Notificação de background durante leadin**: agenda para +3 s se o app for para background durante o count-in — inócuo; não tratar nesta entrega.
- **Contraste do verde-menta**: validar legibilidade sobre `#0B0D11` na implementação (ajustar tom se preciso).
- **ProgressSegments**: exercícios com 1 série → barra de 1 segmento (ok); treinos sem exercício de tempo não veem leadin (por construção).
