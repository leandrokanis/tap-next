# Fixtures compartilhadas do motor de sessão

Estas fixtures são a **especificação executável** do motor de sessão. As duas
implementações — TypeScript (`src/engine/`, via Jest) e Swift
(`ios/TapNextWatch/`, via XCTest) — carregam os mesmos arquivos e precisam
produzir exatamente os mesmos resultados ([ADR 0002](../../docs/adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)).

## Formato

Um arquivo `.json` por cenário. `steps` intercala eventos e asserções:

```json
{
  "name": "série por reps avança com next e inicia descanso",
  "workout": { "version": 1, "name": "Pernas A", "exercises": [] },
  "steps": [
    { "at": 0, "event": "start" },
    { "expect": { "status": "running", "phase": "work", "setNumber": 1 } },
    { "at": 45, "event": "next" },
    { "expect": { "phase": "rest", "remaining": 90, "completedSets": 1 } }
  ]
}
```

### Eventos

`{ "at": <segundos>, "event": <nome>, ...payload }`

- `at` — relógio absoluto simulado, em segundos desde o início.
- `event` — `start` · `next` · `tick` · `pause` · `resume` · `finish` ·
  `setOverride` (payload: `reps?`, `weight?` — ajuste prospectivo do
  PRÓXIMO set, RF-06; aplicado e limpo quando esse set é registrado, que
  sai com `adjusted: true`).

Regras de avanço: `tick` só auto-avança fases `work` cronometradas
(isometrias). Descanso zerado **nunca** avança sozinho (RF-02b) — segue em
`rest` acumulando `overtime` até um `next` explícito.

### Asserções

`{ "expect": { ... } }` verifica o estado após o último evento, avaliando
tempos no `at` desse evento. Campos omitidos não são verificados:

| Campo | Significado |
|---|---|
| `status` | `running` · `paused` · `finished` |
| `phase` | `work` · `rest` · `done` (sessão encerrada) |
| `exercise` | nome do exercício da fase atual |
| `setNumber` | série atual (work) ou recém-concluída (rest) |
| `remaining` | segundos restantes da fase cronometrada (`null` p/ reps) |
| `overtime` | segundos além do prescrito no descanso (`null` fora de rest) |
| `elapsed` | segundos ativos decorridos na fase |
| `sessionElapsed` | segundos ativos da sessão (pausas excluídas) |
| `completedSets` | quantidade de séries registradas |
| `completedAll` | todas as fases foram percorridas |
| `lastSet` | subconjunto do último registro (`exercise`, `setIndex`, `reps`, `weight`, `durationSeconds`, `adjusted`) |

Runners: `src/engine/__tests__/fixtures.test.ts` (Jest) e
`watch/TapNextEngine/Tests/.../FixtureTests.swift` (XCTest).

## Regra de ouro

Mudou o comportamento do motor ⇒ mudou a fixture ⇒ mudou **as duas**
implementações, no mesmo PR.
