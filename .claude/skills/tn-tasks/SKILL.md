---
name: "tn-tasks"
description: "Gera o tasks.md com tarefas concretas e ordenadas por dependência para a feature ativa do tap-next. As tarefas já incluem caminhos de arquivo exatos da estrutura RN/Expo + motor Swift, e respeitam a regra de ouro (motor = fixtures + TS + Swift). Use sempre que o usuário quiser gerar tarefas de implementação, quebrar um plano em steps executáveis ou saber o que implementar a seguir."
argument-hint: "Filtros ou orientações opcionais (ex: só motor, só UI, só Watch)"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

---

## Etapa 0 — Sincronizar com main

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Se listar commits, **pare e avise** para rodar `git rebase origin/main`.

---

## Etapa 1 — Carregar contexto

1. Leia `.current-plan.md`.
2. Obtenha `feature_directory`, `spec`, `plan`.
3. Leia `spec.md` (comportamentos, critérios) e `plan.md` (decisões, impacto no motor, cenários BDD).

Se `.current-plan.md` não existir ou `plan:` vazio, pare e oriente a rodar `/tn-plan` primeiro.

---

## Filosofia de quebra de tarefas

**Testes não são fase final.** Testes de comportamento ficam ao lado do código que os implementa. Deferi-los para o fim é o anti-padrão de slice horizontal.

**Fatiar verticalmente.** Cada fase entrega um comportamento completo e verificável.

**Tracer bullet primeiro.** A primeira fatia é a mais fina que prova o caminho de ponta a ponta.

**Motor = lockstep.** Toda mudança de motor gera três tarefas irmãs, nesta ordem: **fixture** → **TS** (`npm test`) → **Swift** (`swift test`). Nunca uma sem as outras (ADR 0002).

---

## Etapa 2 — Alinhar com o usuário (OBRIGATÓRIO antes de gerar tasks)

Confirme:

1. **Tracer bullet**: qual comportamento provar primeiro de ponta a ponta? Se toca o motor, o tracer bullet é a fixture + TS + Swift do caminho feliz.
2. **Granularidade**: nível de método/função ou de comportamento testável (🔴 teste → 🟢 impl)?
3. **Ordenação**: prioridade após o tracer bullet; dependências entre fatias.
4. **Escopo de testes**: quais comportamentos exigem ciclo TDD (Jest)? Quais só Maestro (UI)? Quais fixtures cobrem paridade?
5. **MVP**: se o tempo for curto, quais fases compõem o mínimo entregável.

Só avance quando o usuário confirmar.

---

## Padrões de arquivo deste projeto

| Artefato | Caminho |
|----------|---------|
| Fixture compartilhada | `fixtures/engine/<nn>-<nome>.json` |
| Motor TS | `src/engine/engine.ts`, `src/engine/phases.ts` |
| Teste do motor TS | `src/engine/__tests__/*.test.ts` |
| Motor Swift | `watch/TapNextEngine/Sources/TapNextEngine/*.swift` |
| Teste do motor Swift | `watch/TapNextEngine/Tests/TapNextEngineTests/*.swift` |
| Domínio | `src/domain/{workout,session}.ts` |
| Teste de domínio | `src/domain/__tests__/*.test.ts` |
| Schema/migração SQLite | `src/data/database.ts` |
| Mappers | `src/data/mappers.ts` |
| Repositório | `src/data/{workout,session}Repository.ts` |
| Export / Sync | `src/data/export.ts`, `src/data/watchSync.ts` |
| Teste de dados | `src/data/__tests__/*.test.ts` |
| Tela | `src/screens/<Nome>Screen.tsx` |
| Rota | `src/navigation/types.ts` |
| Primitivo UI | `src/ui/components.tsx` (ou arquivo próprio em `src/ui/`) |
| Tokens/design | `src/ui/theme.ts` |
| i18n | `src/i18n/pt-BR.json`, `src/i18n/en.json` |
| Watch UI | `watch/TapNextWatch/Views/*.swift`, `watch/TapNextWatch/Session/*.swift` |
| Flow E2E | `e2e/flows/<nn>-<nome>.yaml` |

---

## Etapa 3 — Gerar tasks.md

### Formato de cada tarefa

```
- [ ] T<NNN> [P] <Ação> em `<caminho/do/arquivo>`
```

- **Checkbox** `- [ ]` sempre.
- **ID** `T001`, `T002`, … em ordem de execução.
- **[P]** só se roda em paralelo sem dependência.
- Marcadores TDD: 🔴 (teste que falha) → 🟢 (código mínimo) → 🔵 (refactor).

### Estrutura de fases

```markdown
# Tasks: <Nome da Feature>

## Fase 1 — Motor + fixtures   (só se a feature toca o motor)
> Objetivo: novo comportamento do motor provado nas duas implementações
> Regra de ouro (ADR 0002): fixture → TS → Swift, no mesmo PR

- [ ] T001 🔴 Escrever/alterar fixture `<nn>-<nome>.json` em `fixtures/engine/` (eventos + expectativas do novo comportamento)
- [ ] T002 🟢 Refletir no motor TS em `src/engine/engine.ts` (e `phases.ts` se aplicável) — `npm test` verde
- [ ] T003 🟢 Refletir no motor Swift em `watch/TapNextEngine/Sources/TapNextEngine/SessionEngine.swift` (e `Models.swift`) — `swift test --package-path watch/TapNextEngine` verde
- [ ] T004 🔴 Teste unitário adicional em `src/engine/__tests__/engine.test.ts` (caso de erro / edge)
- [ ] T005 🟢 Estender o motor para cobrir o edge (TS + Swift)

## Fase 2 — Domínio & persistência   (se aplicável)
> Objetivo: dados novos válidos e persistidos, retrocompatíveis

- [ ] T00N Atualizar tipos em `src/domain/session.ts` (campo opcional retrocompatível)
- [ ] T00N 🔴 Teste de validação em `src/domain/__tests__/workout.test.ts` (se muda `parseWorkout`)
- [ ] T00N 🟢 Ajustar `parseWorkout` em `src/domain/workout.ts` + chave i18n do novo `ValidationCode`
- [ ] T00N Migração idempotente `ALTER TABLE ...` em `src/data/database.ts`
- [ ] T00N Ler/escrever coluna nova em `src/data/mappers.ts`
- [ ] T00N 🔴 Teste de round-trip em `src/data/__tests__/mappers.test.ts`
- [ ] T00N Ajustar `src/data/export.ts` / `watchSync.ts` + Swift `Models.swift` (se cruza export/sync)

## Fase 3 — Tracer bullet: <comportamento mais simples de ponta a ponta>
> Critério de aceite: <CA correspondente do spec>

- [ ] T00N Chaves i18n em `src/i18n/pt-BR.json` e `src/i18n/en.json`
- [ ] T00N [P] Primitivo/ajuste em `src/ui/components.tsx` (se necessário)
- [ ] T00N Tela/rota em `src/screens/<Nome>Screen.tsx` (+ `src/navigation/types.ts`) preservando testIDs existentes
- [ ] T00N Flow E2E em `e2e/flows/<nn>-<nome>.yaml` cobrindo o caminho feliz

## Fase 4 — <próxima fatia de comportamento>
> Critério de aceite: <CA do spec>
...

## Fase N — Watch   (se aplicável)
> Nota: target Xcode do Watch é setup manual (docs/WATCH_SETUP.md) — só revisável/`swift test`, não buildável localmente

- [ ] T00N Ajustar `watch/TapNextWatch/Views/SessionView.swift` / `Session/SessionViewModel.swift`
- [ ] T00N Strings em `watch/TapNextWatch/Resources/{en,pt-BR}.lproj/Localizable.strings`

## Dependências entre fases

- Fase 2 depende da Fase 1 (motor) quando os dados novos vêm do motor
- Fase 3+ depende das Fases 1–2 completas
- Watch depende do motor (Fase 1) já em paridade

## MVP

Fase 1 + Fase 2 + Fase 3 (<comportamento mínimo acordado>)
```

### Regras ao gerar as tasks

- **Nunca coloque testes em "fase final"** — cada comportamento testável tem seu 🔴🟢🔵 inline.
- **Toda mudança de motor** vira a tríade fixture → TS → Swift, nessa ordem.
- Tarefas de infra (i18n, migração, mappers, primitivos, telas puramente declarativas) são implementação direta — sem 🔴🟢🔵.
- **UI não tem TDD unitário** — cobertura de UI é via Maestro (`e2e/flows/`).
- Cada task tem caminho de arquivo explícito e comando quando aplicável.

---

## Etapa 4 — Validar tasks.md

- [ ] Nenhum teste isolado em "fase final"
- [ ] Toda mudança de motor tem fixture + TS + Swift juntas
- [ ] A Fase 3 é um tracer bullet real (não setup)
- [ ] Todo T\<NNN\> de lógica tem a task de teste (🔴) imediatamente antes
- [ ] Todo T\<NNN\> tem caminho de arquivo explícito
- [ ] Ordem respeita dependências (fixture antes de TS/Swift; schema antes de mappers; 🔴 antes de 🟢)
- [ ] Chaves i18n sempre em pt-BR **e** en
- [ ] testIDs existentes preservados nas telas tocadas

---

## Etapa 5 — Atualizar `.current-plan.md`

```markdown
# Plano ativo

feature_directory: specs/<ISSUE>-<short-name>
spec: specs/<ISSUE>-<short-name>/spec.md
plan: specs/<ISSUE>-<short-name>/plan.md
tasks: specs/<ISSUE>-<short-name>/tasks.md
```

---

## Etapa 6 — Reportar

- Caminho do tasks
- Total de tarefas e distribuição por fase
- Qual fase é o tracer bullet e por quê
- Se toca o motor (tríade fixture/TS/Swift presente)
- MVP acordado
- Próximo passo: `/tn-implement`
