# Plano: Pivô para app web (PWA instalável)

## Decisões técnicas

1. **Stack mantida**: Expo/RN-Web. Telas, motor, domínio e i18n intocados.
   Pivô = remoção do nativo + camada PWA. → ADR 0007.
2. **Camada de dados**: as variantes `.web.ts` viram a implementação única —
   `activeSession.web.ts`/`sessionRepository.web.ts`/`workoutRepository.web.ts`
   **substituem** os arquivos homônimos nativos (rename sobre o `.ts`);
   `database.ts` e `mappers.ts` (SQLite) somem. `webStorage.ts` permanece o
   backend (JSON em localStorage). `export.ts` fica (não depende de SQLite).
3. **Sync/HealthKit/notificações**: `watchSync.ts` deletado; chamadas
   `pushWorkoutsToWatch` removidas dos call-sites (Home/Import). Em
   `alerts.ts`: `expo-notifications` e `expo-haptics` saem; vibração via
   `navigator.vibrate` (padrões por evento), sons seguem em `expo-audio`
   (suporte web).
4. **Wake lock (RF03)**: `src/services/wakeLock.ts` novo —
   `navigator.wakeLock.request('screen')` best-effort; adquirido pelo
   `SessionProvider` enquanto `state != null`, liberado ao sair; re-adquire
   em `visibilitychange`. Browsers sem suporte: no-op silencioso.
5. **PWA (RF02)**: diretório `public/` (Expo copia para a raiz do export):
   `manifest.webmanifest` (nome, ícones 192/512 gerados do 2c, standalone,
   `background_color/theme_color` #0B0D11) e `sw.js` — precache do shell no
   install + runtime cache-first para GETs same-origin (bundle, fontes,
   sons ficam offline após o primeiro uso). Registro do SW e link do
   manifest via `App.tsx` (só `Platform.OS === 'web'`, só em produção).
6. **Dependências removidas**: `expo-sqlite`, `expo-notifications`,
   `expo-haptics`, `react-native-watch-connectivity`. `app.json`: seção
   `ios` e plugins correspondentes saem; entra config `web`.
7. **Remoções de árvore**: `ios/`, `watch/`, `e2e/` (flows Maestro eram
   iOS; E2E web fica no backlog), `docs/WATCH_SETUP.md`, script `e2e`.
8. **CI**: `ci.yml` só typecheck + Jest (ubuntu); `swift-engine` job e
   `e2e-ios.yml` removidos.
9. **Docs**: PRD 3.0 (visão/plataformas web-only; RF-09/10/11/21 removidos;
   RF-02/02b/18 sem menção a háptico/Watch; backlog atualizado); SPEC
   reescrita nas seções de plataforma/persistência/som/testes; ADRs
   0001/0002/0004/0005 → `Status: Substituído (ADR 0007)`; **ADR 0007 —
   pivô para PWA** criado; README/README.pt-BR atualizados (rodar = web).
10. **Motor**: zero mudança de comportamento. `fixtures/engine/` segue como
    spec executável (Jest); README das fixtures deixa de citar Swift.

## Impacto no motor de sessão

Comportamento: **nenhum** (nenhuma fixture muda). Estrutural: implementação
Swift e XCTest removidos; regra de ouro vira "mudou o motor ⇒ mudou a
fixture" (ADR 0007 substitui a 0002).

## Modelo de dados & persistência

- Sem mudança de tipos (`Workout`/`SessionRecord`).
- `src/data/`: ficam `workoutRepository.ts` (ex-web), `sessionRepository.ts`
  (ex-web), `activeSession.ts` (ex-web), `webStorage.ts`, `export.ts`.
  Saem: `database.ts`, `mappers.ts`, `watchSync.ts` e as cópias nativas.
- `src/data/__tests__/mappers.test.ts`: parte de mappers morre; a cobertura
  de `buildExportBundle` migra para `export.test.ts`; novo teste de
  round-trip dos repositórios sobre localStorage (mock de `localStorage`).

## UI

- Sem tela nova. `HomeScreen`/`ImportScreen` perdem o `pushWorkoutsToWatch`.
- `SessionProvider`: remove agendamento de notificação local (efeito
  AppState) — timestamps já garantem recálculo correto (RF07); adiciona
  wake lock.

## i18n

Sem chaves novas de UI. Remover chaves órfãs de notificação
(`session.restOverTitle`, `restOverBody`, `phaseOverTitle`) em pt-BR e en.

## Cenários de teste (BDD)

### Dados — Jest
```
Scenario: treino sobrevive ao reload (localStorage)
  Given um workout salvo pelo repositório
  When  a página "recarrega" (novo acesso ao storage)
  Then  listWorkouts devolve o mesmo workout

Scenario: snapshot de sessão round-trips no storage web
  Given uma sessão ativa em prepare com restDeadline
  When  saveSnapshot + loadSnapshot
  Then  o estado retorna idêntico (v2 do envelope)
```

### Serviços — Jest
```
Scenario: wake lock é best-effort
  Given navigator sem wakeLock
  When  acquireWakeLock()
  Then  nenhuma exceção; retorno nulo
```

### Manual/browser (CA02–CA04)
- Lighthouse installable; offline após primeiro load; sons + vibração;
  tela acesa durante sessão.

## Fluxo de implementação

### Fase 1 — Remoção do nativo
1. Deletar `ios/`, `watch/`, `e2e/`, `WATCH_SETUP.md`; podar `.gitignore`
2. `package.json` (deps + scripts) e `app.json` limpos
3. `src/data/`: promover web variants, deletar sqlite/sync; ajustar
   call-sites e testes

### Fase 2 — Alertas e wake lock
1. `alerts.ts` web-only (Web Audio + vibrate)
2. `wakeLock.ts` + integração no `SessionProvider` (testes)

### Fase 3 — PWA
1. `public/manifest.webmanifest` + ícones 192/512 + `sw.js`
2. Registro no `App.tsx` (web/prod)

### Fase 4 — Docs & CI
1. PRD 3.0, SPEC, ADR 0007 + status dos substituídos, READMEs
2. `ci.yml` enxuto; deletar `e2e-ios.yml`

## Riscos e decisões pendentes

- iOS Safari limita PWA (sem push, storage pode ser limpo em desuso
  prolongado) — mitigado por export JSON (dado é do usuário).
- `expo-audio` no web depende de gesto do usuário para desbloquear áudio —
  o INICIAR da primeira Preparação já é esse gesto.
- localStorage ~5 MB — suficiente por anos; IndexedDB no backlog.
