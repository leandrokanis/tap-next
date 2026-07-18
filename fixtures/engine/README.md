# Fixtures compartilhadas do motor de sessão

Estas fixtures são a **especificação executável** do motor de sessão
(`src/engine/`), carregadas pelo Jest ([ADR 0007](../../docs/adr/0007-pivo-para-pwa-web.md),
herdeira da regra da 0002).

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
  `setOverride` (payload: `reps?`, `weight?`, `duration?` — ajuste
  prospectivo do PRÓXIMO set, RF-06; aplicado e limpo quando esse set é
  registrado, que sai com `adjusted: true`).

Regras de avanço (ADR 0006): toda série é precedida por uma fase
`prepare`; `next` na preparação entra no `work` (séries `time` ganham
contagem de entrada de 3 s — o work começa 3 s no futuro). `tick`
auto-avança works cronometrados **e** rests zerados (rest → `prepare`
seguinte); `prepare` nunca avança sozinho — nenhum exercício começa sem
`next` explícito. O `overtime` é medido na preparação: segundos desde o
prazo original do descanso anterior (mesmo que tenha sido cortado).

### Asserções

`{ "expect": { ... } }` verifica o estado após o último evento, avaliando
tempos no `at` desse evento. Campos omitidos não são verificados:

| Campo | Significado |
|---|---|
| `status` | `running` · `paused` · `finished` |
| `phase` | `prepare` · `work` · `rest` · `done` (sessão encerrada) |
| `exercise` | nome do exercício da fase atual |
| `setNumber` | série atual (work) ou recém-concluída (rest) |
| `remaining` | segundos restantes da fase cronometrada (`null` p/ reps) |
| `overtime` | segundos além do prazo do descanso anterior, medidos na `prepare` (`null` sem descanso anterior/fora de prepare-rest) |
| `countdown` | segundos restantes da contagem de entrada 3-2-1 (`work` de tempo) |
| `elapsed` | segundos ativos decorridos na fase |
| `sessionElapsed` | segundos ativos da sessão (pausas excluídas) |
| `completedSets` | quantidade de séries registradas |
| `completedAll` | todas as fases foram percorridas |
| `lastSet` | subconjunto do último registro (`exercise`, `setIndex`, `reps`, `weight`, `durationSeconds`, `adjusted`) |

Runner: `src/engine/__tests__/fixtures.test.ts` (Jest).

## Regra de ouro

Mudou o comportamento do motor ⇒ mudou a fixture, no mesmo PR.
