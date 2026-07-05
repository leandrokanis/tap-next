# Contributing to Tap Next

Thanks for your interest! Tap Next is MIT-licensed and contributions are
welcome. Project docs under `docs/` are currently written in Brazilian
Portuguese; issues and PRs are welcome in Portuguese or English.

## Ground rules

### 1. The engine exists twice — keep it in sync

The session engine is implemented in TypeScript (`src/engine/`) for the
iPhone app and in Swift (inside `ios/TapNextWatch/`) for the Watch app
([ADR 0002](docs/adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)).
Behavior parity is enforced by shared fixtures in `fixtures/engine/`.

**If a PR changes engine behavior, it must update, in the same PR:**

1. the fixture(s) describing the new behavior,
2. the TypeScript engine, and
3. the Swift engine.

CI runs both test suites against the same fixtures; a PR that changes only
one side will fail.

### 2. Keep the engine pure

`src/engine/` must not import React Native, and the Swift engine must not
import SwiftUI/UIKit. The engine receives events (`start`, `next`, `pause`,
`resume`, `finish`, `tick`) and returns state — all side effects (sound,
haptics, persistence, HealthKit) live outside it.

### 3. Structural decisions go through ADRs

Anything that changes architecture (sync semantics, storage, schema shape)
needs a new file in `docs/adr/` following the existing format. Accepted ADRs
are immutable — supersede, don't edit.

## Development setup

- **Requirements**: Node.js 22+. macOS + Xcode 16 only for running the apps
  and E2E (everything else works on Linux).
- **Install**: `npm install`
- **Typecheck**: `npm run typecheck`
- **TS unit tests** (engine, domain, data): `npm test`
- **Swift engine tests** (same shared fixtures, no Xcode needed):
  `swift test --package-path watch/TapNextEngine`
- **iPhone app**: `npx expo run:ios` (macOS; generates `ios/` on first run —
  see [ADR 0001](docs/adr/0001-react-native-iphone-swiftui-watch.md)).
- **Watch app**: one-time Xcode target setup in
  [docs/WATCH_SETUP.md](docs/WATCH_SETUP.md), then run the `TapNextWatch`
  scheme.
- **E2E**: [Maestro](https://maestro.mobile.dev) flows in `e2e/flows/` —
  `npm run e2e` with the app installed on a booted simulator (see
  [e2e/README.md](e2e/README.md)).

## Pull requests

- Small, focused PRs with a clear description of behavior change.
- New behavior comes with tests (Jest and/or XCTest; fixtures for engine
  changes).
- User-facing strings go through i18n (`src/i18n/`, `Localizable.strings`) in
  both `en` and `pt-BR`.
- Do not run `expo prebuild` casually — it can clobber the Watch target.
  If an Expo upgrade requires it, review the `ios/` diff carefully.
