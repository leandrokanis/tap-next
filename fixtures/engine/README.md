# Fixtures compartilhadas do motor de sessão

Estas fixtures são a **especificação executável** do motor de sessão. As duas
implementações — TypeScript (`src/engine/`, via Jest) e Swift
(`ios/TapNextWatch/`, via XCTest) — carregam os mesmos arquivos e precisam
produzir exatamente os mesmos resultados ([ADR 0002](../../docs/adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)).

## Formato

Um arquivo `.json` por cenário:

```json
{
  "name": "série por reps avança com next e inicia descanso",
  "workout": {
    "version": 1,
    "name": "Pernas A",
    "exercises": [
      { "name": "Agachamento", "mode": "reps", "sets": 2, "reps": 10, "restBetweenSets": 90 }
    ]
  },
  "steps": [
    { "at": 0,   "event": "start" },
    { "expect": { "phase": "work", "exercise": "Agachamento", "set": 1 } },
    { "at": 45,  "event": "next" },
    { "expect": { "phase": "rest", "remaining": 90, "nextSet": 2 } },
    { "at": 135, "event": "tick" },
    { "expect": { "phase": "work", "set": 2, "autoAdvanced": true } }
  ]
}
```

- `at` — segundos desde o início da sessão (relógio absoluto simulado).
- `event` — `start` · `next` · `pause` · `resume` · `finish` · `tick`.
- `expect` — asserção sobre o estado do motor após o evento anterior; campos
  omitidos não são verificados.

O formato exato dos campos de `expect` será consolidado junto com a primeira
implementação do motor TS — este arquivo é atualizado junto.

## Regra de ouro

Mudou o comportamento do motor ⇒ mudou a fixture ⇒ mudou **as duas**
implementações, no mesmo PR.
