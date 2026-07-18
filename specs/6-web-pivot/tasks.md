# Tasks: Pivô para app web (PWA instalável)

## Fase 1 — Remoção do nativo + promoção da camada web (tracer bullet)
> Critério de aceite: CA06, CA07 — repo web-only com suites verdes

- [x] T001 Deletar `ios/`, `watch/`, `e2e/`, `docs/WATCH_SETUP.md`; podar
      entradas nativas do `.gitignore`; remover script `e2e` do `package.json`
- [x] T002 `package.json`: remover `expo-sqlite`, `expo-notifications`,
      `expo-haptics`, `react-native-watch-connectivity` (+ `npm install`)
- [x] T003 `app.json`: remover seção `ios` e plugins nativos; adicionar config
      `web` (nome, tema escuro)
- [x] T004 `src/data/`: promover `*.web.ts` → `*.ts` (activeSession,
      sessionRepository, workoutRepository); deletar `database.ts`,
      `mappers.ts`, `watchSync.ts`; remover `pushWorkoutsToWatch` de
      `src/screens/HomeScreen.tsx` e `src/screens/ImportScreen.tsx`
- [x] T005 🔴 Testes de round-trip sobre localStorage em
      `src/data/__tests__/storage.test.ts` (workout salvo sobrevive a novo
      acesso; snapshot v2 round-trips); migrar cobertura de
      `buildExportBundle` para `export.test.ts`; deletar `mappers.test.ts`
- [x] T006 🟢 Ajustes mínimos até `npm run typecheck` e `npm test` verdes

## Fase 2 — Alertas web + wake lock
> Critério de aceite: CA03, CA04

- [x] T007 `src/services/alerts.ts`: remover expo-notifications/haptics;
      vibração via `navigator.vibrate` (padrão por evento); sons seguem
      expo-audio; apagar chaves i18n órfãs de notificação (pt-BR + en)
- [x] T008 🔴 Teste de `src/services/wakeLock.ts` (best-effort: sem
      `navigator.wakeLock` → no-op) em `src/services/__tests__/wakeLock.test.ts`
- [x] T009 🟢 `src/services/wakeLock.ts` + integração no
      `src/session/SessionProvider.tsx` (adquire com sessão ativa, libera ao
      sair, re-adquire em `visibilitychange`); remover efeito de notificação
      local do provider

## Fase 3 — PWA
> Critério de aceite: CA02, CA05

- [x] T010 Gerar ícones `public/icon-192.png` e `public/icon-512.png` a
      partir de `assets/icon.png`; escrever `public/manifest.webmanifest`
      (standalone, dark, ícones)
- [x] T011 `public/sw.js`: precache do shell no install + runtime
      cache-first same-origin; `src/services/pwa.ts` registra SW e injeta
      `<link rel="manifest">` (só web + produção); chamada no `App.tsx`
- [x] T012 Validar `npx expo export --platform web` gera `dist/` com
      manifest + sw na raiz

## Fase 4 — Docs & CI
> Critério de aceite: CA08, CA09

- [x] T013 PRD 3.0 em `docs/PRD.md`: plataforma web/PWA, RF-09/10/11/21
      removidos, RF-02/02b/18 sem Watch/háptico, seção Watch fora, novo RF de
      instalabilidade/offline, backlog e riscos atualizados
- [x] T014 `docs/SPEC.md`: plataformas, persistência (localStorage), som
      (Web Audio + vibrate + wake lock), testes (sem XCTest/Maestro),
      layout do repo; `fixtures/engine/README.md` sem Swift
- [x] T015 `README.md` + `README.pt-BR.md`: rodar/instalar/deploy web
- [x] T016 `.github/workflows/ci.yml` só typecheck+Jest; deletar
      `e2e-ios.yml`

## Dependências entre fases

- Fase 2 e 3 dependem da Fase 1 (deps limpas)
- Fase 4 por último (docs descrevem o estado final)

## MVP

Fases 1–3 (app web instalável e offline com suites verdes)
