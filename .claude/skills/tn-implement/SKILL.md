---
name: "tn-implement"
description: "Implementa a feature ativa do tap-next usando TDD estrito (red → green → refactor) para a lógica pura (motor, domínio, dados), respeitando a regra de ouro do motor (fixtures + TS + Swift em lockstep) e cobrindo a UI via Maestro. Use sempre que o usuário quiser implementar uma feature, executar as tasks, fazer TDD ou desenvolver com testes guiando a implementação."
argument-hint: "Filtro opcional de tasks (ex: 'só fase 2', 'a partir de T005')"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

Se fornecido, use como filtro de quais tasks executar.

---

## Filosofia (leia antes de começar)

**Princípio central**: testes verificam comportamento através de interfaces públicas, não detalhes de implementação. O código pode mudar; os testes não.

**Bons testes** exercitam caminhos reais pela API pública. Descrevem _o que_ o sistema faz. Um bom teste do motor lê como uma spec — "descanso zerado segura em overtime até um toque". Sobrevivem a refactors.

**Maus testes** acoplam à implementação: verificam estado interno, mockam colaboradores do mesmo módulo. Sinal de alerta: quebram no refactor sem o comportamento mudar.

**Anti-padrão — slices horizontais**: NÃO escreva todos os testes e depois toda a implementação.

```
ERRADO (horizontal):  RED: t1..t5   → GREEN: i1..i5
CERTO  (vertical):    RED→GREEN: t1→i1, t2→i2, ...
```

**Motor = lockstep (ADR 0002)**: o motor tem duas implementações gêmeas. A **fixture** é a spec executável, consumida por Jest **e** por `swift test`. Ordem inegociável: escreve/altera a **fixture** → faz o **TS** passar (`npm test`) → faz o **Swift** passar (`swift test --package-path watch/TapNextEngine`). Uma sem as outras é um bug.

---

## Etapa 0 — Sincronizar com main

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Se listar commits, **pare e avise** para rodar `git rebase origin/main`.

---

## Etapa 1 — Carregar contexto

1. Leia `.current-plan.md` → `feature_directory`, `plan`, `tasks`.
2. Leia `plan.md` (decisões, impacto no motor, cenários BDD), `tasks.md` (tarefas), `spec.md` (comportamentos, critérios).
3. Consulte `docs/SPEC.md` (contrato do motor/UX) e os **ADRs** relevantes em `docs/adr/` — não contrarie decisão aceita.

Se `tasks:` estiver vazio, pare e oriente a rodar `/tn-tasks` primeiro.

---

## Etapa 2 — Planejar com o usuário (OBRIGATÓRIO antes de escrever código)

Ancore-se na linguagem do domínio (fase work/rest, isometria, overtime, registro prospectivo, adjusted) e nos ADRs da área. Depois confirme:

1. **Quais comportamentos testar**: liste os que viram teste, com base nos cenários BDD do `plan.md` e critérios do `spec.md`. Você não testa tudo — concentre em caminhos críticos e lógica não-trivial (motor, validação, mappers), não em todo edge imaginável. Pergunte se a lista está certa.

2. **Interfaces públicas**: para cada função de motor/domínio/dados que receberá teste, mostre a assinatura que imagina e pergunte se está alinhada. Prefira **módulos profundos** — interface pequena escondendo implementação rica (o motor é o exemplo: funções puras `(state, at) => state`).

3. **Fronteiras de mock**: mocke só o que cruza fronteira real (SQLite, WatchConnectivity, relógio via `at`). Nunca mocke colaborador interno. O motor é puro — não precisa de mock; passe `at` (epoch seconds).

Só avance quando o usuário confirmar.

---

## Etapa 3 — Classificar as tasks

**Categoria A — ciclo TDD** (🔴🟢🔵):
- Motor de sessão (`src/engine/`) — dirigido pelas **fixtures**
- Validação de domínio (`src/domain/workout.ts` `parseWorkout`)
- Lógica de dados não-trivial (`mappers.ts`, cálculos em repositórios, `src/ui/format.ts`)

**Categoria B — implementação direta** (sem TDD unitário):
- Tipos/interfaces declarativos (`src/domain/*.ts`)
- Schema/migração SQLite (`database.ts`), wiring de repositório
- Chaves i18n, tokens de tema, primitivos e telas de UI
- Watch UI (SwiftUI) — verificada por revisão + Maestro/manual

**Categoria C — E2E Maestro**: fluxos de tela em `e2e/flows/` (cobrem a UI, não TDD unitário).

Anote a categoria de cada task antes de executar.

---

## Etapa 4 — Executar tasks por fase

### Categoria B — implementação direta

1. Implemente conforme o `plan.md`.
2. Marque `[x]` no `tasks.md`.
3. Reporte: `✓ T<NNN> — <descrição>`.

### Categoria A — motor (tríade fixture → TS → Swift)

Para cada comportamento de motor:

##### 🔴 RED — fixture + teste TS
1. Escreva/altere a **fixture** em `fixtures/engine/<nn>-<nome>.json` (eventos: `start`/`next`/`tick`/`pause`/`resume`/`finish`/`setOverride`; expectativas: `status`/`phase`/`remaining`/`overtime`/`completedSets`/`lastSet`/...).
2. Rode o harness Jest — deve **falhar pelo motivo certo**:
   ```bash
   npx jest src/engine/__tests__/fixtures.test.ts 2>&1 | tail -30
   ```
   Falha de assertion → correto. Passa de cara → a fixture não prova nada; reescreva.

##### 🟢 GREEN — TS
3. Ajuste `src/engine/engine.ts` / `phases.ts` com o mínimo para a fixture passar.
   ```bash
   npm test 2>&1 | tail -30
   ```
   Regressão em fixture existente → corrija antes de avançar.

##### 🟢 GREEN — Swift (mesmo comportamento)
4. Espelhe em `watch/TapNextEngine/Sources/TapNextEngine/SessionEngine.swift` (e `Models.swift`). A mesma fixture roda no harness Swift:
   ```bash
   swift test --package-path watch/TapNextEngine 2>&1 | tail -20
   ```
   Se o harness precisar de um novo evento/expectativa, atualize **os dois** harnesses (`fixtures.test.ts` e `FixtureTests.swift`).

##### 🔵 REFACTOR
5. Só depois de GREEN nas duas: elimine duplicação, aprofunde o módulo, nomeie pela linguagem do domínio. Rode ambas as suites após cada mudança.

Conclua a task: marque `[x]` e reporte:
```
✓ T<NNN> 🔴→🟢→🔵 <comportamento>
   Fixture: fixtures/engine/<nn>-<nome>.json
   TS: npm test ✅ | Swift: swift test ✅
```

### Categoria A — domínio / dados (TDD só TS)

Ciclo 🔴🟢🔵 padrão com Jest:
```bash
npx jest <arquivo.test.ts> 2>&1 | tail -30
```
- **Domínio**: `src/domain/__tests__/workout.test.ts`
- **Dados**: `src/data/__tests__/mappers.test.ts`

Mesmas regras: RED que falha pelo motivo certo → GREEN mínimo → REFACTOR.

### Categoria C — E2E Maestro

Ao final da fatia de UT, crie/atualize o flow em `e2e/flows/`:
- Preserve os testIDs existentes; adicione os novos.
- Textos de Alert/modal nativos são localizados → os flows assumem simulador em inglês (locale do CI).
- Rode quando houver simulador e app instalado (o `/tn-implement` pode deixar a execução do e2e para o `/tn-pr` ou para verificação manual).

---

## Etapa 5 — Checkpoint de fase

Ao concluir cada fase do `tasks.md`:

1. Rode as suites afetadas:
   ```bash
   npm test 2>&1 | tail -50
   swift test --package-path watch/TapNextEngine 2>&1 | tail -20   # se tocou o motor
   ```
2. Falhas → causa raiz, corrija (voltando ao RED se preciso). Não avance com teste quebrado.
3. Reporte: `✓ Fase N completa — <X testes Jest, motor Swift ✅>`.

---

## Etapa 6 — Regras de parada

Pare e reporte se:
- Um teste falha após 2 tentativas de correção — cole a saída.
- Uma migração SQLite falha ao aplicar.
- TS e Swift divergem numa fixture e a paridade não fecha em 2 tentativas.
- Um módulo nativo novo exige rebuild que não está disponível (`ExpoClipboard`-style) — reporte e peça o rebuild.
- O `plan.md` está ambíguo demais para guiar uma task.

---

## Etapa 7 — Verificação final

Após todas as tasks:

1. Suites completas:
   ```bash
   npm run typecheck
   npm test
   swift test --package-path watch/TapNextEngine
   ```
2. E2E (se houver simulador + app):
   ```bash
   npm run e2e
   ```
3. Se a feature mudou o **contrato de comportamento**, atualize `docs/SPEC.md` (e o PRD se um `RF-XX` foi cumprido/alterado).
4. Sem `console.log`/código de debug residual.

---

## Etapa 8 — Conclusão

Reporte:
- Total de tasks implementadas
- Testes Jest escritos/passando; motor Swift verde; fixtures novas
- E2E: flows atualizados/status
- SPEC/PRD atualizados (se aplicável)
- Qualquer desvio do `plan.md` e o motivo
- Próximo passo: `/tn-pr`

---

## Referência — teste do motor (Jest, função pura)

```ts
import { Workout } from '../../domain/workout';
import * as engine from '../engine';

const workout: Workout = {
  version: 1,
  name: 'Pernas A',
  exercises: [{ name: 'Agachamento', mode: 'reps', sets: 2, reps: 10, weight: 60, restBetweenSets: 90 }],
};

it('segura o descanso em overtime até um toque (RF-02b)', () => {
  let s = engine.start(workout, 0);
  s = engine.next(s, 30);          // loga set 1, inicia descanso de 90s
  s = engine.tick(s, 200);         // 80s além do boundary
  expect(engine.currentPhase(s)?.type).toBe('rest');
  expect(engine.phaseRemaining(s, 200)).toBe(0);
  expect(engine.phaseOvertime(s, 200)).toBe(80);
});
```
