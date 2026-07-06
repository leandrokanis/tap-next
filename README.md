# Tap Next

**Read this in: [Português (Brasil)](README.pt-BR.md)**

An open source workout companion for strength training and physiotherapy
sessions. Tap Next guides you through a workout exercise by exercise, timing
every phase, sounding a signal when it's time to move on — and asking for just
one tap when it isn't.

> **Status:** 🛠 v1 implemented — TS + Swift engines (shared fixtures), iPhone
> app, watchOS app sources, Maestro flows and CI. Remaining manual step: the
> one-time Xcode watch-target setup ([docs/WATCH_SETUP.md](docs/WATCH_SETUP.md)).

## What it does

- **Guided sessions** — shows the current exercise, separates work and rest
  phases, and times each one.
- **Auto-advance (only where it makes sense)** — isometric holds move on by
  themselves at zero, with a sound on iPhone and haptics + sound on Apple
  Watch. A rest that hits zero alerts and **waits** in overtime (`+0:23`) —
  the next set never starts without you.
- **One big "Next" button** — rep-based sets have no natural end, so you
  advance them with a single, hard-to-miss tap. Tapping Next during a timed
  phase skips it.
- **Per-set logging without friction (prospective)** — when a set ends it is
  logged with the prescription and rest starts immediately; during the rest
  the **upcoming** set appears pre-filled (reps · kg), adjustable right
  there. Don't touch it and the prescription stands.
- **Standalone Apple Watch app** — runs the whole session on the Watch inside
  an `HKWorkoutSession` (no iPhone needed mid-workout, records to Apple
  Health), then syncs the results back.
- **Workout management** — keep multiple workouts, import new ones as JSON,
  export everything (workouts and history) as JSON. Your data is yours.
- **History** — every finished (or partially finished) session is saved:
  workout, date, duration, sets actually done — browsable on the iPhone,
  including sessions done on the Watch.

## Workout format

```json
{
  "version": 1,
  "name": "Legs A",
  "exercises": [
    {
      "name": "Squat",
      "mode": "reps",
      "sets": 3,
      "reps": 10,
      "weight": 60,
      "restBetweenSets": 90
    },
    {
      "name": "Plank",
      "mode": "time",
      "sets": 3,
      "duration": 30,
      "restBetweenSets": 15
    }
  ]
}
```

`mode: "reps"` advances on tap; `mode: "time"` advances by itself. Full schema
in [docs/SPEC.md](docs/SPEC.md).

### Generate a workout or physio plan with any LLM

Paste the prompt below into any LLM (ChatGPT, Claude, Gemini…), describe your
workout or physiotherapy protocol, and it returns JSON ready to paste into the
app's Import screen.

````text
You will generate a workout in the Tap Next app's JSON format. Reply with ONLY
the JSON — no surrounding text, no comments, no code fences.

Schema (v1):
- Root object: { "version": 1, "name": <string>, "exercises": [ ... ] }
  - `version`: always the integer 1.
  - `name`: workout name, non-empty string.
  - `exercises`: non-empty array of exercises.
- Each exercise:
  - `name`: non-empty string.
  - `mode`: "reps" (rep-based, advances on tap) or "time" (isometric/timed,
    advances on its own). Physiotherapy and isometrics use "time".
  - `sets`: integer > 0 (number of sets).
  - `reps`: integer > 0. Required when mode = "reps". Omit when "time".
  - `duration`: integer > 0, in SECONDS. Required when mode = "time".
    Omit when "reps".
  - `weight` (optional): load in kg, number ≥ 0 (decimals allowed).
  - `restBetweenSets` (optional): rest between sets, integer ≥ 0, in seconds.
  - `restAfterExercise` (optional): rest after the exercise, integer ≥ 0, seconds.
  - `notes` (optional): string.

Rules:
- Do not invent fields outside this list.
- All times and rests are in seconds.
- Never put both "reps" and "duration" on the same exercise.

Valid example:
{"version":1,"name":"Legs A","exercises":[{"name":"Squat","mode":"reps","sets":3,"reps":10,"weight":60,"restBetweenSets":90},{"name":"Plank","mode":"time","sets":3,"duration":30,"restBetweenSets":15}]}

My workout/physio: <describe here — exercises, sets, reps or time, loads, rests>
````

## Architecture

| Component | Technology |
|---|---|
| iPhone app | React Native (Expo, prebuild) |
| Watch app | Native SwiftUI (watchOS target in the same Xcode project) |
| Session engine | Implemented twice — TypeScript and Swift — kept identical by shared JSON test fixtures |
| Sync | WatchConnectivity; workouts flow iPhone → Watch, finished sessions flow Watch → iPhone (append-only, conflict-free) |
| Storage | SQLite on iPhone, JSON files + outbox on the Watch |

React Native does not run on watchOS, so the Watch app is native by design —
see [ADR 0001](docs/adr/0001-react-native-iphone-swiftui-watch.md) and the
other [architecture decision records](docs/adr/).

## Project layout

```
tap-next/
├── src/                  # React Native app
│   ├── engine/           # session engine (pure TS, no RN imports)
│   ├── domain/           # types + workout JSON schema validation
│   ├── data/             # SQLite, repositories, sync (iPhone side)
│   ├── screens/
│   └── i18n/             # en + pt-BR
├── ios/                  # generated by expo prebuild, committed
│   └── TapNextWatch/     # watchOS app (SwiftUI + Swift engine)
├── fixtures/engine/      # shared TS ↔ Swift engine fixtures
├── e2e/flows/            # Maestro flows (BDD-style YAML)
└── docs/                 # PRD, SPEC, ADRs
```

## Testing strategy

| Layer | Tool |
|---|---|
| TS engine, schema validation, repositories | Jest |
| Swift engine, sync, HealthKit (mocked) | XCTest |
| Engine parity (TS ↔ Swift) | Shared fixtures in `fixtures/engine/` |
| End-to-end (iOS simulator) | Maestro |

## Getting started

```bash
npm install

npm run typecheck                              # TypeScript
npm test                                       # Jest — engine, domain, data
swift test --package-path watch/TapNextEngine  # Swift engine, same fixtures

npx expo run:ios                               # iPhone app (macOS + Xcode)
npm run e2e                                    # Maestro flows (see e2e/README.md)
```

The watch app needs a one-time Xcode target setup:
[docs/WATCH_SETUP.md](docs/WATCH_SETUP.md).

## Documentation

- [PRD — product requirements](docs/PRD.md) (pt-BR)
- [SPEC — technical specification](docs/SPEC.md) (pt-BR)
- [ADRs — architecture decision records](docs/adr/) (pt-BR)
- [Contributing guide](CONTRIBUTING.md)

## License

[MIT](LICENSE)
