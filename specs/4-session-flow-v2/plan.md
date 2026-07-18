# Plano: Fluxo de sessão v2 — Preparação-first

## Decisões técnicas

1. **Preparação é fase do motor** (`prepare`), inserida por `expandPhases`
   antes de **cada** `work`. Alternativa (estado só de UI) quebraria a
   paridade iPhone↔Watch e não seria testável por fixtures. → ADR 0006.
2. **Descanso auto-avança ao zerar → `prepare`** (nunca → `work`). O
   invariante do produto passa a ser "exercício nunca começa sozinho" (o
   `work` continua exigindo evento explícito). `tick` cascateia rests como já
   faz com works cronometrados.
3. **Overtime medido na Preparação** via `restDeadline` no `EngineState`:
   ao entrar em `prepare` vindo de um `rest`, guarda `restStartedAt +
   duration` (o prazo original, mesmo se o rest foi cortado antes);
   `overtime = max(0, now − restDeadline)`. `prepare` sem rest anterior
   (1ª série, exercícios sem descanso) → `restDeadline = null`, sem overtime.
4. **Contagem 3-2-1 modelada como deslocamento do início do work**: avançar
   `prepare`→`work` de `mode: time` define `phaseStartedAt = at + 3`.
   `phaseElapsed` já clampa em 0, então `remaining === duration` durante a
   contagem; helper novo `countdownRemaining(state, at)` expõe os segundos
   3→0 para UI/fixture. Duração da série gravada exclui a contagem por
   construção. Séries `reps` não têm contagem.
5. **`UpcomingOverride` ganha `duration?`** (ajuste de tempo de isometria na
   Preparação). Override continua "aplicado e limpo quando o set é gravado";
   passa a poder ser setado em qualquer fase (a UI só o oferece na
   Preparação). Duração efetiva do próximo work `time` =
   `override.duration ?? phase.duration`.
6. **Duração da sessão** já é relógio-de-parede menos pausas
   (`sessionElapsed`) — preparação/overtime/3-2-1 contam sem mudança.
7. **Sem mudança de schema**: `SessionRecord`/`SessionSetRecord`, SQLite,
   export e sync ficam intactos. Snapshot do `EngineState` (retomada) ganha
   campos novos serializáveis por JSON (retrocompat: snapshot antigo sem
   `restDeadline` → tratado como `null`; fases antigas sem `prepare` só
   existiriam numa sessão ativa durante o upgrade — aceitável descartar via
   versão do snapshot em `activeSession.ts`).
8. **Wheel picker próprio** (`src/ui/WheelPicker.tsx`, ScrollView com snap)
   em vez de `@react-native-picker/picker`: visual do protótipo (números
   gigantes, escala de opacidade), zero dependência nativa nova (sem
   rebuild, sem ADR de módulo nativo).
9. **Sons por evento**: mapa evento→asset em `src/services/alerts.ts`;
   arquivos wav curtos gerados proceduralmente (pitches distintos) em
   `assets/sounds/`. Watch usa `WKHaptic` distintos + som.
10. **Erro de importação com linha/coluna**: a validação de domínio já
    aponta o caminho do campo; adicionar localização linha/coluna calculada
    sobre o texto colado (scanner leve do JSON, sem dependência) em
    `src/domain/` e exibida no preview do `ImportScreen`.

## Impacto no motor de sessão

**Toca o motor — tríade obrigatória (ADR 0002).**

### `src/engine/phases.ts` + `watch/.../PhaseExpansion.swift`
- Novo `PreparePhase { type:'prepare', exerciseIndex, setNumber, mode, duration? }`.
- `expandPhases`: para cada série emite `prepare` → `work`; rests inalterados.

### `src/engine/engine.ts` + `watch/.../SessionEngine.swift` + `Models.swift`
- `EngineState.restDeadline: number | null` (novo).
- `UpcomingOverride.duration?: number` (novo).
- `next` em `prepare` → entra no `work` (se `mode:'time'`, com
  `phaseStartedAt = at + COUNTDOWN_SECONDS(3)` e duração efetiva com
  override).
- `next` em `rest` → avança para `prepare` (corte de descanso), gravando
  `restDeadline` = prazo original do rest.
- `tick`: passa a auto-avançar `rest` no boundary (→ `prepare`), além dos
  works cronometrados; nunca auto-avança `prepare`.
- `phaseOvertime` → recalculado sobre `prepare`/`restDeadline` (em `rest`
  retorna 0 enquanto conta; nunca cresce além do boundary porque o rest
  auto-avança).
- `countdownRemaining(state, at)` helper novo.
- `logFor`: `durationSeconds = min(elapsed, effectiveDuration)` com
  override de duração; `adjusted` também quando `duration` foi ajustada.
- `summarize`/`plannedSets`: continuam contando fases `work`.

### Fixtures (`fixtures/engine/`) — reescritas + novas
Todas as existentes mudam onde o fluxo passa a ter `prepare` (01–11).
Novas/renomeadas (nome + o que provam):
- `01-start-lands-in-prepare` — `start` → `prepare` do set 1; `next` →
  `work`.
- `02-time-set-has-countdown` — `next` na preparação de isometria → 3 s de
  contagem (`countdown: 3→0`, `remaining` congelado), work auto-avança no
  boundary deslocado; `durationSeconds` gravado = duração cheia.
- `03-rest-auto-opens-prepare` — rest zera → `tick` cai em `prepare`;
  `overtime` cresce a partir do zero do rest.
- `04-skip-rest-goes-to-prepare` — `next` no meio do rest → `prepare`;
  `overtime` 0 até o prazo original, depois cresce.
- `05-pause-resume-freezes-clock` — atualizada com `prepare` (pausa na
  preparação congela overtime e sessão).
- `06-finish-mid-session-is-partial` — atualizada.
- `07-rest-after-exercise` — atualizada (rest após exercício → `prepare` do
  próximo exercício).
- `08-no-rest-goes-straight-to-prepare` — sem descanso: work → `prepare`
  sem `restDeadline` (overtime null).
- `09-override-in-prepare-applies-to-that-set` — ajuste na preparação
  (inclusive **da 1ª série**) grava o set com `adjusted: true`.
- `10-tick-cascades-across-phases` — cascata agora para em `prepare`.
- `11-early-end-of-timed-set` — "Encerrar antes" numa isometria loga o
  tempo executado (excluindo contagem).
- `12-duration-override-in-prepare` — ajuste de tempo na preparação muda a
  duração efetiva e o log.
Runners ganham: fase `prepare` nas asserções, campos `countdown` e
`overtime` em prepare.

## Modelo de dados & persistência

- **Domínio** (`src/domain/`): sem mudança de tipos públicos
  (`Workout`/`SessionRecord`). Novo utilitário de localização linha/coluna
  para erros de validação (usado pelo Import).
- **SQLite / mappers / export / sync**: sem mudança.
- **`src/data/activeSession.ts`**: bump da versão do snapshot (descarta
  snapshot de formato antigo com segurança).

## UI

### iPhone
- **`SessionScreen.tsx` refatorada para anatomia única**: cabeçalho
  (SESSÃO m:ss · pausar · encerrar), barra segmentada por exercício,
  rótulo do momento (+info direita: "QUANDO ESTIVER PRONTO" / "+0:23"
  âmbar / "AO ZERAR, ABRE A PREPARAÇÃO"), nome do exercício, pontos de
  série, **palco trocável** (PrepareStage com WheelPickers ·
  RepsStage cronômetro · TimeStage anel+contagem 3-2-1 · RestStage anel +
  "✓ Série N gravada" + DEPOIS), barra A SEGUIR, botão principal 88 px
  (INICIAR / PRÓXIMO / INICIAR PRÓXIMO / ENCERRAR ANTES secundário).
- **`SummaryScreen.tsx` nova** (rota `Summary`): métricas, lista por
  exercício, ajustes em azul, CONCLUIR.
- **`ImportScreen.tsx`**: erro inline no preview (linha/coluna destacada) +
  cartão de erro com campo·linha·coluna; Importar desabilitado (já é
  paste-only).
- **`HomeScreen.tsx`**: remover botão "+" se existir; abas conforme
  protótipo (sem redesign completo fora da sessão nesta entrega).
- **`src/ui/`**: `WheelPicker.tsx` novo; `SegmentedProgress.tsx` e
  `SetDots.tsx` novos; tokens já existentes em `theme.ts`.
- **testIDs**: manter `paste-button` etc.; novos: `prepare-start`,
  `next-button`, `skip-rest`, `end-early`, `summary-done`.

### Watch (fontes revisáveis; target Xcode é manual — WATCH_SETUP.md)
- `SessionViewModel.swift`: expor fase `prepare`, countdown, overtime,
  override por coroa (reps/kg/tempo).
- `SessionView.swift`: palco por momento espelhando o iPhone (preparação
  com valores + coroa, execução reps/tempo, descanso em anel); rótulo
  âmbar no overtime; hápticos por evento.

## i18n

Chaves novas em `src/i18n/pt-BR.json` **e** `en.json`:
`session.preparation`, `session.whenReady`, `session.execution`,
`session.rest`, `session.restZeroOpensPrep`, `session.overtime`,
`session.setLogged`, `session.next`, `session.upNext`, `session.after`,
`session.start`, `session.startNext`, `session.endEarly`, `session.hold`,
`session.countdownGo`, `session.adjustHint`, `summary.*`, `import.error.*`
(linha/coluna).

## Cenários de teste (BDD)

### Motor — Jest + fixtures (rodam também em swift test)

```
Scenario: start abre a Preparação da primeira série
  Given um treino com 1 exercício de reps
  When  start
  Then  phase == prepare, setNumber == 1, overtime == null

Scenario: descanso zerado abre a Preparação sozinho
  Given work concluído e rest de 90 s correndo
  When  tick em t = fim do rest + 23
  Then  phase == prepare e overtime == 23

Scenario: cortar o descanso vai para a Preparação
  Given rest com 30 s decorridos de 90
  When  next
  Then  phase == prepare e overtime == 0 (até vencer o prazo original)

Scenario: contagem de entrada não conta no tempo da série
  Given preparação de isometria de 30 s
  When  next em t0 e tick em t0+33
  Then  série auto-conclui com durationSeconds == 30

Scenario: ajuste na preparação da 1ª série grava adjusted
  Given preparação do set 1
  When  setOverride(reps 8, weight 55) e a série é concluída
  Then  lastSet == { reps 8, weight 55, adjusted: true }
```

### Domínio — Jest
```
Scenario: erro de validação carrega linha e coluna
  Given JSON colado com "sets": 0 na linha 8
  When  parseWorkout
  Then  erro aponta exercises[1].sets, linha 8, coluna correta
```

### E2E — Maestro (`e2e/flows/`)
- `02-session-happy-path.yaml` atualizado: Iniciar (prepare) → Próximo →
  rest → prepare → … → Summary → Concluir (testIDs novos).
- `01-import-workout.yaml`: erro inline com linha/coluna.
- `03-finish-partial-history.yaml`: encerrar durante preparação.

## Fluxo de implementação

### Fase 1 — Motor + fixtures
1. Reescrever/criar fixtures em `fixtures/engine/` (12 cenários)
2. `src/engine/` (phases + engine + runner Jest) verde
3. `watch/TapNextEngine/` (Models + PhaseExpansion + SessionEngine +
   FixtureTests) — `swift test` verde

### Fase 2 — Domínio & persistência
1. Localizador linha/coluna de erros (`src/domain/`) + testes
2. Bump de versão do snapshot em `activeSession.ts`

### Fase 3 — UI + i18n
1. Chaves i18n pt-BR + en
2. `WheelPicker`, `SegmentedProgress`, `SetDots`; refactor `SessionScreen`
   (palco por momento); `SummaryScreen` + rota; `ImportScreen` erro inline;
   sons por evento em `alerts.ts` + assets
3. Watch: `SessionViewModel` + `SessionView` (+ `Localizable.strings`)

### Fase 4 — E2E
1. Atualizar flows Maestro

## Riscos e decisões pendentes

- Snapshot de sessão ativa de versão anterior é descartado no upgrade
  (aceito: janela minúscula, app pré-release).
- Sons procedurais podem soar artificiais — trocáveis por assets curados
  depois sem mudança de código.
- Watch UI não é compilável no CI local (target manual) — validação visual
  fica para o Xcode; motor Swift coberto por fixtures.
