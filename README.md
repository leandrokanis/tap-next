# Tap Next

**Read this in: [Português (Brasil)](README.pt-BR.md)**

An open source workout companion for strength training and physiotherapy
sessions. Tap Next guides you through a workout exercise by exercise, timing
every phase, sounding a signal when it's time to move on — and asking for just
one tap when it isn't.

It's an **installable, offline-first web app (PWA)**: open the URL, add it to
your home screen, and train without signal at the gym. No app store, no
account — workouts come in as JSON, history goes out as JSON, and nothing
depends on a server.

> **Status:** 🛠 v3 — web pivot done ([ADR 0007](docs/adr/0007-pivo-para-pwa-web.md)).
> The native iOS/Watch apps were discontinued; everything runs in the browser.

## What it does

- **Guided sessions in three moments** — Preparation → Execution → Rest, on a
  single fixed screen anatomy; only the central stage changes.
- **Preparation before every set** — adjust reps/weight/time on scroll wheels
  before you lift; confirm with one tap on **Start**. Nothing ever starts by
  itself.
- **Auto-advance (only where it makes sense)** — isometric holds move on at
  zero; a rest that hits zero signals and **opens the next Preparation**
  automatically, with your idle time shown in amber (`+0:23`).
- **One big button per screen** — Start, Next, Start next. Rep-based sets
  advance with a single, hard-to-miss tap.
- **Per-set logging without friction (prospective)** — every finished set is
  logged with the values you confirmed in Preparation. Don't touch the wheels
  and the prescription stands.
- **A distinct sound for every event** — entry countdown, go, isometry end,
  rest start, rest end, session done — plus vibration where the device
  supports it. The screen stays awake during a session (wake lock).
- **Workout management & history** — import workouts as JSON (inline
  validation with line/column), browse and edit history, export everything.
  Your data is yours.

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
| App | React Native Web via Expo (TypeScript) |
| Distribution | PWA — static hosting + manifest + service worker |
| Session engine | Pure TypeScript, specified by executable JSON fixtures |
| Storage | Browser local storage (JSON), versioned crash-recovery snapshot |

See the [architecture decision records](docs/adr/) — the web pivot is
[ADR 0007](docs/adr/0007-pivo-para-pwa-web.md).

## Project layout

```
tap-next/
├── src/
│   ├── engine/           # session engine (pure TS)
│   ├── domain/           # types + workout JSON schema validation
│   ├── data/             # repositories over localStorage, export
│   ├── screens/          # RN-Web screens
│   ├── services/         # alerts (sound/vibration), wake lock, PWA
│   ├── session/          # SessionProvider
│   ├── ui/               # design system
│   └── i18n/             # en + pt-BR
├── public/               # PWA manifest, service worker, icons
├── fixtures/engine/      # executable spec of the session engine
└── docs/                 # PRD, SPEC, ADRs, prototype
```

## Testing strategy

| Layer | Tool |
|---|---|
| Engine, schema validation, data, services | Jest |
| Engine behavior | Shared fixtures in `fixtures/engine/` (executable spec) |
| End-to-end (web) | Backlog (Playwright) |

## Getting started

```bash
npm install

npm run typecheck   # TypeScript
npm test            # Jest — engine, domain, data, services

npm run web         # dev server in the browser
```

### Deploy

```bash
npm run build                    # static site in dist/
```

Host `dist/` on any static host (GitHub Pages, Vercel, Netlify…). The
service worker and manifest ship from `public/` — after the first visit the
app works fully offline and can be added to the home screen.

## Documentation

- [PRD — product requirements](docs/PRD.md) (pt-BR)
- [SPEC — technical specification](docs/SPEC.md) (pt-BR)
- [ADRs — architecture decision records](docs/adr/) (pt-BR)
- [Contributing guide](CONTRIBUTING.md)

## License

[MIT](LICENSE)
