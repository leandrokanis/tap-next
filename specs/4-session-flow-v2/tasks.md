# Tasks: Fluxo de sessão v2 — Preparação-first

## Fase 1 — Motor + fixtures (tracer bullet)
> Objetivo: máquina de estados nova provada nas duas implementações
> Regra de ouro (ADR 0002): fixture → TS → Swift, no mesmo PR

- [ ] T001 🔴 Reescrever/criar as fixtures do fluxo novo em `fixtures/engine/`:
      `01-start-lands-in-prepare.json`, `02-time-set-has-countdown.json`,
      `03-rest-auto-opens-prepare.json`, `04-skip-rest-goes-to-prepare.json`,
      `05-pause-resume-freezes-clock.json`, `06-finish-mid-session-is-partial.json`,
      `07-rest-after-exercise.json`, `08-no-rest-goes-straight-to-prepare.json`,
      `09-override-in-prepare-applies-to-that-set.json`,
      `10-tick-cascades-across-phases.json`, `11-early-end-of-timed-set.json`,
      `12-duration-override-in-prepare.json` (+ atualizar `README.md` do formato:
      fase `prepare`, campos `countdown`/`overtime`, override com `duration`)
- [ ] T002 🟢 `PreparePhase` + inserção antes de cada work em `src/engine/phases.ts`
- [ ] T003 🟢 Motor TS em `src/engine/engine.ts`: `restDeadline`, rest auto-avança
      no tick → prepare, `next` em prepare/rest, contagem 3 s (`phaseStartedAt = at+3`),
      `countdownRemaining`, `phaseOvertime` sobre prepare, `UpcomingOverride.duration`,
      `logFor` com duração efetiva — runner de fixtures atualizado em
      `src/engine/__tests__/fixtures.test.ts`; `npm test` verde
- [ ] T004 🟢 Motor Swift em lockstep: `watch/TapNextEngine/Sources/TapNextEngine/Models.swift`,
      `PhaseExpansion.swift`, `SessionEngine.swift` + runner
      `watch/TapNextEngine/Tests/TapNextEngineTests/FixtureTests.swift` e
      `PhaseExpansionTests.swift`; `swift test --package-path watch/TapNextEngine` verde
- [ ] T005 🔴 Edge cases em `src/engine/__tests__/engine.test.ts`: pausa durante
      contagem 3-2-1; pausa em prepare congela overtime; finish em prepare não loga
      set em voo; snapshot round-trip com campos novos
- [ ] T006 🟢 Cobrir os edges no TS e no Swift (mesmas fixtures/testes espelhados)

## Fase 2 — Domínio & persistência
> Objetivo: erro de importação com linha/coluna; retomada segura

- [ ] T007 🔴 Teste em `src/domain/__tests__/workout.test.ts`: `parseWorkout` de
      texto com `"sets": 0` retorna erro com caminho `exercises[1].sets` + linha/coluna
- [ ] T008 🟢 Localizador linha/coluna em `src/domain/workout.ts` (scanner do texto
      colado, sem dependência) + chaves i18n de erro em `src/i18n/pt-BR.json` e `en.json`
- [ ] T009 Bump da versão do snapshot de sessão ativa em `src/data/activeSession.ts`
      (snapshot antigo descartado com segurança) — teste em `src/data/__tests__/`

## Fase 3 — Tracer bullet de UI: sessão completa na anatomia nova (iPhone)
> Critério de aceite: CA01, CA02, CA05 do spec

- [ ] T010 Chaves i18n da sessão v2 em `src/i18n/pt-BR.json` e `src/i18n/en.json`
      (`session.preparation`, `session.whenReady`, `session.overtime`,
      `session.setLogged`, `session.after`, `session.start`, `session.startNext`,
      `session.endEarly`, `session.countdownGo`, `session.adjustHint`, `summary.*`)
- [ ] T011 [P] `src/ui/WheelPicker.tsx` — roda de rolagem com snap, números
      tabulares, escala de opacidade do protótipo
- [ ] T012 [P] `src/ui/SegmentedProgress.tsx` e `src/ui/SetDots.tsx` — barra por
      exercício e pontos de série
- [ ] T013 Refatorar `src/screens/SessionScreen.tsx` para a anatomia única:
      cabeçalho, barra segmentada, rótulo do momento (+ "+m:ss" âmbar), nome,
      pontos, palco trocável (Prepare/Reps/Time/Rest), barra A SEGUIR / DEPOIS,
      botão principal — testIDs: `prepare-start`, `next-button`, `skip-rest`,
      `end-early` (preservar os existentes)
- [ ] T014 `src/screens/SummaryScreen.tsx` nova + rota `Summary` em
      `src/navigation/types.ts` — métricas, séries por exercício, ajustes em azul,
      CONCLUIR (`summary-done`)
- [ ] T015 Ligar `src/session/SessionProvider.tsx` ao fluxo novo (tick dispara
      auto-abertura, countdown, navegação para Summary ao concluir)
- [ ] T016 Flow E2E `e2e/flows/02-session-happy-path.yaml` atualizado para o
      fluxo Preparação-first até o Resumo

## Fase 4 — Sons por evento + importação com erro inline
> Critério de aceite: CA03, CA04, CA06

- [ ] T017 Gerar assets curtos distintos em `assets/sounds/` (script) e mapear
      evento→som em `src/services/alerts.ts` (contagem, vai, fim isometria,
      início/fim descanso, sessão concluída)
- [ ] T018 Erro inline no preview de `src/screens/ImportScreen.tsx` (destaque do
      trecho + cartão campo · linha · coluna; Importar desabilitado) — preservar
      testID `paste-button`
- [ ] T019 Remover o botão "+" da lista se existir em `src/screens/HomeScreen.tsx`
- [ ] T020 Flow E2E `e2e/flows/01-import-workout.yaml` atualizado (erro com
      linha/coluna); `e2e/flows/03-finish-partial-history.yaml` (encerrar durante
      preparação)

## Fase 5 — Watch (paridade de fluxo)
> Nota: target Xcode manual (docs/WATCH_SETUP.md) — fontes revisáveis; motor já
> coberto por `swift test` na Fase 1

- [ ] T021 `watch/TapNextWatch/Session/SessionViewModel.swift`: fase prepare,
      countdown, overtime, override pela coroa (reps/kg/tempo)
- [ ] T022 `watch/TapNextWatch/Views/SessionView.swift`: palcos Preparação
      (valores + coroa), Execução reps/tempo, Descanso em anel; rótulo âmbar;
      hápticos por evento
- [ ] T023 Strings em `watch/TapNextWatch/Resources/{en,pt-BR}.lproj/Localizable.strings`

## Dependências entre fases

- Fase 2 (T009) e Fase 3 dependem da Fase 1 (motor em paridade)
- Fase 4 independe da Fase 3 exceto T020 (usa testIDs de T013)
- Fase 5 depende da Fase 1

## MVP

Fase 1 + Fase 2 + Fase 3 (sessão completa na anatomia nova, com fixtures em
paridade e retomada segura)
