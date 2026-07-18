# Contributing to Tap Next

Thanks for your interest! Tap Next is MIT-licensed and contributions are
welcome. Project docs under `docs/` are currently written in Brazilian
Portuguese; issues and PRs are welcome in Portuguese or English.

## Ground rules

### 1. The fixtures are the engine's spec — keep them in sync

The session engine (`src/engine/`) is specified by the executable fixtures
in `fixtures/engine/`
([ADR 0007](docs/adr/0007-pivo-para-pwa-web.md), heir to
[ADR 0002](docs/adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)).

**If a PR changes engine behavior, it must update the fixture(s) describing
the new behavior in the same PR.** A behavior change without a fixture
change is a bug.

### 2. Keep the engine pure

`src/engine/` must not import React Native or browser APIs. The engine
receives events (`start`, `next`, `pause`, `resume`, `finish`, `tick`,
`setOverride`) and returns state — all side effects (sound, vibration,
wake lock, persistence) live outside it, in `src/services/` and `src/data/`.

### 3. Structural decisions go through ADRs

Anything that changes architecture (storage, schema shape, PWA strategy)
needs a new file in `docs/adr/` following the existing format. Accepted ADRs
are immutable — supersede, don't edit.

## Development setup

- **Requirements**: Node.js 22+. Any OS — the app is web-only.
- **Install**: `npm install`
- **Typecheck**: `npm run typecheck`
- **Tests** (engine, domain, data, services): `npm test`
- **Run**: `npm run web` (dev server in the browser)
- **Static build**: `npx expo export --platform web` → `dist/`

## Pull requests

- Small, focused PRs with a clear description of behavior change.
- New behavior comes with tests (Jest; fixtures for engine changes).
- User-facing strings go through i18n (`src/i18n/`) in both `en` and `pt-BR`.
