# Tasks: Experiência de Sessão v2 — count-in, localização, overtime calmo e som por evento

## Fase 1 — Motor + fixtures (fase `leadin`)
> Objetivo: count-in provado nas duas implementações (CA01, CA02, CA04, CA12)
> Regra de ouro (ADR 0002): fixture → TS → Swift, no mesmo PR

- [x] T001 🔴 Escrever fixture `12-leadin-before-every-timed-set.json` em `fixtures/engine/` (start em exercício de tempo → `leadin` remaining 3 → tick +3 → `work`; pós-descanso → novo `leadin` na série 2)
- [x] T002 🔴 [P] Escrever fixture `13-leadin-excluded-from-session-elapsed.json` em `fixtures/engine/` (`sessionElapsed` congela durante leadin em curso e após múltiplas séries)
- [x] T003 🔴 [P] Escrever fixture `14-next-during-leadin-starts-work.json` em `fixtures/engine/` (`next` no leadin → `work` imediato com remaining cheio, nenhum set logado)
- [x] T004 🔴 [P] Escrever fixture `15-pause-during-leadin.json` em `fixtures/engine/` (pause congela remaining; resume desloca; auto-avanço só após 3 s ativos)
- [x] T005 🔴 Ajustar fixtures existentes com `mode: time` em `fixtures/engine/` (`02-time-exercise-auto-advances.json`, `04-next-ends-timed-exercise-early.json`, `10-tick-cascades-across-phases.json`; auditar 05–07 e demais) para a expansão com `leadin`
- [x] T006 🟢 Aceitar `phase: "leadin"` no runner `src/engine/__tests__/fixtures.test.ts`
- [x] T007 🟢 Implementar `LeadinPhase` em `src/engine/phases.ts` (inserção antes de work `mode:time`, `LEADIN_SECONDS = 3`) e `leadinSeconds` + tick/advance/sessionElapsed em `src/engine/engine.ts` — `npm test` verde
- [x] T008 🟢 Refletir no motor Swift: case `.leadin` + `leadinSeconds` (decode com default 0) em `watch/TapNextEngine/Sources/TapNextEngine/Models.swift`, inserção em `PhaseExpansion.swift`, tick/advance/sessionElapsed em `SessionEngine.swift`, runner `Tests/TapNextEngineTests/FixtureTests.swift` — `swift test --package-path watch/TapNextEngine` verde
- [x] T009 🔴 Teste unitário de edge em `src/engine/__tests__/engine.test.ts` (tick longo em cascata `leadin→work→rest` e `leadin→work→leadin→work`; `finish` durante leadin não loga set)
- [x] T010 🟢 Cobrir edges no TS `src/engine/engine.ts` e no Swift `watch/TapNextEngine/Sources/TapNextEngine/SessionEngine.swift` (suites verdes)
- [x] T011 Atualizar `fixtures/engine/README.md` (fase `leadin` na tabela de asserções e regras de avanço)

## Fase 2 — Snapshot retrocompatível
> Objetivo: snapshots antigos sem `leadinSeconds` hidratam com 0 (RF08 preservado)

- [x] T012 🔴 Teste de backfill em `src/data/__tests__/activeSession.test.ts` (snapshot serializado sem `leadinSeconds` carrega com 0)
- [x] T013 🟢 Backfill `leadinSeconds ?? 0` no loader `src/data/activeSession.ts`

## Fase 3 — Tracer bullet: count-in visível no iPhone
> Critério de aceite: CA01 (3→2→1→vai na tela), CA02 (relógio da sessão congela)

- [x] T014 Chaves i18n do count-in (`session.getReady`, `session.leadinGo`) em `src/i18n/pt-BR.json` e `src/i18n/en.json`
- [x] T015 `LeadinView` em `src/screens/SessionScreen.tsx` (número gigante 3→2→1, nome do exercício, avanço manual pula) preservando testIDs `session-screen`/`phase-clock`/`next-button`
- [x] T016 Atualizar flow `e2e/flows/02-session-happy-path.yaml` para o count-in (aguardar/avançar o leadin do exercício de tempo)

## Fase 4 — Localização e telas calmas (iPhone)
> Critérios de aceite: CA05, CA06, CA07, CA08, CA10

- [x] T017 Tokens `rest`, `restSoftBg`, `restSoftBorder` em `src/ui/theme.ts`
- [x] T018 `ProgressSegments` com estado triplo (feita/atual/pendente) em `src/ui/components.tsx`
- [x] T019 Barra do topo por séries do exercício atual + rótulo `EXERCÍCIO X DE Y` em todas as vistas de `src/screens/SessionScreen.tsx`
- [x] T020 `RestView` em `src/screens/SessionScreen.tsx`: cronômetro em `colors.rest`, nome do exercício visível, remoção de `session.overtimeHint`/`session.tapReady`
- [x] T021 Overtime herói em `src/screens/SessionScreen.tsx`: sem contador de tempo extra, card A SEGUIR central ampliado + CTA `glow`; nome do exercício visível
- [x] T022 Remover `session.isoHint` do `WorkView` em `src/screens/SessionScreen.tsx` e limpar chaves obsoletas (`isoHint`, `overtimeHint`, `tapReady`, `restZeroed`) de `src/i18n/pt-BR.json` e `src/i18n/en.json`
- [x] T023 Atualizar flows `e2e/flows/01-import-workout.yaml`/`02-session-happy-path.yaml`/`03-finish-partial-history.yaml` (asserts de textos removidos/novos rótulos, se referenciados)

## Fase 5 — Som por evento (iPhone)
> Critérios de aceite: CA03, CA09

- [x] T024 Script `scripts/generate-sounds.js` (Node puro, WAV PCM 16-bit) + npm script `sounds` em `package.json`; gerar e versionar `assets/sounds/{countin-tick,go,isometry-end,rest-start,rest-end,session-done}.wav`
- [x] T025 🔴 Teste de mapeamento evento→asset em `src/services/__tests__/alerts.test.ts` (6 eventos, 6 assets distintos)
- [x] T026 🟢 `signal(event: AlertEvent)` com um player por evento em `src/services/alerts.ts` (remove `signalPhaseEnd` genérico)
- [x] T027 🔴 Teste da derivação de eventos em `src/session/__tests__/sessionEvents.test.ts` (leadin tick por segundo; leadin→work = `go`; timed-work→rest = `isometryEnd` sem `restStart`; reps→rest = `restStart`; rest zerado = `restEnd`; conclusão = `sessionDone`)
- [x] T028 🟢 Extrair derivação pura (helper `sessionEvents.ts` em `src/session/`) e ligar em `src/session/SessionProvider.tsx`

## Fase 6 — Watch
> Nota: target Xcode manual (docs/WATCH_SETUP.md) — revisável + `swift test`; sem build local
> Critério de aceite: CA11

- [x] T029 `leadinView`, nome do exercício em rest/overtime, overtime sem contador (próximo set herói + CTA), cor rest em `watch/TapNextWatch/Views/SessionView.swift`
- [x] T030 Hápticos distintos por evento (countinTick `.click`, go `.directionUp`, isometryEnd `.notification`, restStart `.start`, restEnd `.stop`, sessionDone `.success`) em `watch/TapNextWatch/Session/SessionViewModel.swift`
- [x] T031 Strings novas/removidas em `watch/TapNextWatch/Resources/{en,pt-BR}.lproj/Localizable.strings`

## Fase 7 — Documentação de contrato
> Objetivo: SPEC/PRD refletem o novo contrato

- [x] T032 Atualizar `docs/SPEC.md` §3 (fase `leadin`) e §8 (paleta de som por evento)
- [x] T033 Registrar RF-17 (count-in) e RF-18 (sons por evento) e ajustar RF-01/RF-02b em `docs/PRD.md`

## Dependências entre fases

- Fase 2 depende da Fase 1 (campo `leadinSeconds` existe)
- Fase 3 depende das Fases 1–2 (motor emite `leadin`)
- Fase 4 independe da Fase 3 (mesma tela — executar em sequência para evitar conflito)
- Fase 5 depende da Fase 1 (eventos derivam das transições com `leadin`)
- Fase 6 depende da Fase 1 em paridade
- Fase 7 por último (contrato final)

## MVP

Fase 1 + Fase 2 + Fase 3 (count-in funcional e correto no iPhone, motor em paridade)
