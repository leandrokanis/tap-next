---
name: "tn-plan"
description: "Gera o plano de implementação técnico para a feature ativa do tap-next, com foco na stack React Native + Expo + TypeScript no iPhone e no motor Swift do Apple Watch, mantidos em paridade por fixtures compartilhadas. Use sempre que o usuário quiser planejar a implementação, decidir arquitetura, definir o modelo de dados/persistência ou os contratos internos."
argument-hint: "Orientações opcionais para o planejamento"
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

Se listar commits, **pare e avise** para rodar `git rebase origin/main`. Se vazio, prossiga.

---

## Contexto do projeto

**Estrutura de arquivos** (siga sempre estes padrões):

```
src/
  engine/        motor de sessão (TS puro, sem imports de RN) — engine.ts, phases.ts
    __tests__/   testes Jest do motor
  domain/        tipos + validação de schema (workout.ts, session.ts)
  data/          SQLite, repositórios, sync (database.ts, *Repository.ts, mappers.ts, watchSync.ts, export.ts)
  screens/       telas (RN, um arquivo por tela)
  ui/            design system (theme.ts, components.tsx, ProgressRing.tsx, format.ts)
  session/       SessionProvider.tsx (estado de sessão + clock)
  navigation/    types.ts
  i18n/          index.ts, pt-BR.json, en.json
  services/      alerts.ts (som/háptico/notificações)

watch/
  TapNextEngine/ pacote Swift do motor (espelho de src/engine)
    Sources/TapNextEngine/*.swift
    Tests/TapNextEngineTests/*.swift
  TapNextWatch/  app SwiftUI (Views/, Session/, Sync/, Stores/, Resources/)

fixtures/engine/ fixtures compartilhadas TS ↔ Swift (a spec executável do motor)
e2e/flows/       flows Maestro (YAML estilo BDD)
docs/            PRD.md, SPEC.md, adr/
```

**Stack**:
- React Native 0.86 + Expo 57 (prebuild, `ios/` versionado), TypeScript
- Navegação: `@react-navigation/native-stack`
- Estado de sessão: Context (`SessionProvider`) sobre motor puro
- Persistência iPhone: `expo-sqlite` (schema em `database.ts` com migrações idempotentes via `ALTER TABLE` em try/catch — **não há framework de migração**)
- Watch: SwiftUI + `HKWorkoutSession` (ADR 0004) + WatchConnectivity append-only (ADR 0005)
- i18n: `i18next` + `react-i18next` (pt-BR + en)
- Testes: Jest (motor/domínio/dados), XCTest (motor Swift), Maestro (E2E)

## Regra de ouro do motor (ADR 0002)

Mudou o comportamento do motor de sessão ⇒ mudou a **fixture** em `fixtures/engine/` ⇒ mudou **as duas** implementações (TS `src/engine/` + Swift `watch/TapNextEngine/`), no mesmo PR. Ambas as suites verdes: `npm test` e `swift test --package-path watch/TapNextEngine`. Todo plano que toca o motor **tem de** incluir tasks para fixtures + TS + Swift.

---

## Etapa 1 — Carregar contexto

1. Leia `.current-plan.md` para `feature_directory` e `spec`.
2. Leia o `spec.md` da feature.
3. Incorpore `$ARGUMENTS` se houver.

Se `.current-plan.md` não existir ou `feature_directory` vazio, pare e oriente a rodar `/tn-specify` primeiro.

---

## Etapa 2 — Interrogatório técnico (OBRIGATÓRIA — não pule)

Antes de escrever qualquer arquivo, **interrogue** o usuário sobre cada decisão técnica aberta, estilo grill-me.

**Regras:**
- **Quem decide é o usuário.** Você levanta opções, recomenda uma, a escolha é dele.
- **Uma pergunta por vez.** Espere a resposta antes da próxima.
- **Toda pergunta oferece opções com uma recomendação** (prós/contras). Sem opções discretas → dê a recomendação e peça resposta curta.
- **Respeite dependências.** Resolva a decisão-pai antes do ramo.
- **Se o spec ou o código respondem, não pergunte** — explore `src/`, `watch/`, `docs/`.
- **Sem teto fixo.** Continue enquanto houver incerteza técnica relevante.
- Só avance quando o usuário confirmar.

### Fila de decisões (monte internamente, ordenada por dependência e impacto)

**Motor de sessão** *(se a feature toca a máquina de estados)*
- Que campos novos o `EngineState` precisa? Round-trip no snapshot JSON continua lossless?
- Muda `expandPhases` / a sequência de fases? Muda `tick` / auto-avanço / overtime?
- Quais **fixtures** novas ou alteradas cobrem o novo comportamento? (evento + expectativa)
- O que TS e Swift precisam refletir em lockstep?

**Domínio & validação**
- Muda `Workout`/`Exercise`/`SessionSetRecord` (`src/domain/`)? Novo campo é opcional (retrocompatível)?
- Novas regras de validação em `parseWorkout`? Novo `ValidationCode` + chaves i18n?

**Persistência & dados**
- Muda o schema SQLite (`database.ts`)? Precisa de coluna nova + migração idempotente + `mappers.ts`?
- Muda `export.ts` (bump de `exportVersion`?) ou o payload de sync (`watchSync.ts` / Swift `Models.swift`)?

**UI iPhone**
- Novas telas/rotas (`src/navigation/types.ts`)? Novos primitivos em `src/ui/components.tsx`?
- Segue o design system (tokens `theme.ts`, um CTA por tela, "A SEGUIR")? Precisa de módulo nativo novo (⇒ rebuild + ADR)?

**Watch**
- Vale no Watch? Muda `SessionView`/`SessionViewModel`? Digital Crown? Háptico?
- Lembrando: o target Xcode do Watch é setup manual (`docs/WATCH_SETUP.md`) — só o motor Swift é testável localmente.

**i18n & acessibilidade**
- Chaves novas em `pt-BR.json` **e** `en.json`? Rótulos legíveis a um braço de distância?

**Testes**
- Que comportamentos exigem TDD (motor/domínio/dados)? Quais só Maestro (UI)? Quais fixtures cobrem paridade?

### Formato de cada pergunta

```
**Pergunta N** — <categoria>: <pergunta>

**Recomendação**: Opção <X> — <razão em 1–2 frases>

| Opção | Abordagem | Prós | Contras |
|-------|-----------|------|---------|
| A     | ...       | ...  | ...     |
| B     | ...       | ...  | ...     |

Responda com a letra, "sim" para aceitar a recomendação, ou descreva sua própria abordagem.
```

Registre cada decisão (não escreva em disco ainda). Ao encerrar, resuma:

> "Entendido. Vou planejar com base em: [decisões]. Posso prosseguir?"

Só avance com confirmação.

---

## Etapa 3 — Escrever plan.md

Crie `<feature_directory>/plan.md`:

```markdown
# Plano: <Nome da Feature>

## Decisões técnicas
<Bibliotecas, padrões e abordagens. Justifique cada escolha pelas respostas da entrevista.>

## Impacto no motor de sessão
<Se toca o motor: mudanças em EngineState / phases / tick; fixtures novas/alteradas em fixtures/engine/ (nome + o que provam); o que muda em src/engine/*.ts E watch/TapNextEngine/Sources/TapNextEngine/*.swift em lockstep. Se não toca, escreva "nenhum".>

## Modelo de dados & persistência
- **Domínio** (`src/domain/`): tipos novos/alterados; campos opcionais retrocompatíveis
- **SQLite** (`src/data/database.ts`): colunas novas + migração idempotente (`ALTER TABLE ... ` em try/catch)
- **Mappers** (`src/data/mappers.ts`): leitura/escrita das colunas novas
- **Export/Sync**: mudanças em `export.ts` (exportVersion?), `watchSync.ts`, Swift `Models.swift`

## UI
- **iPhone**: telas/rotas novas (`src/navigation/types.ts`), primitivos (`src/ui/`), aderência ao design system e aos testIDs existentes
- **Watch**: views/estado afetados (`watch/TapNextWatch/`), Digital Crown/háptico — anote se é apenas revisável (target Xcode manual)

## i18n
- Chaves novas em `src/i18n/pt-BR.json` e `src/i18n/en.json`

## Cenários de teste (BDD)

Descreva cada comportamento em Gherkin. Guiam o passo RED do `/tn-implement`.

### Motor / domínio / dados — Jest
```
Scenario: <comportamento>
  Given <estado inicial>
  When  <ação>
  Then  <resultado esperado>
```

### Fixtures compartilhadas (se toca o motor)
<Descreva cada fixture: sequência de eventos (start/next/tick/pause/setOverride/...) e expectativas (phase/remaining/overtime/lastSet.adjusted/...). Estas rodam em Jest E em swift test.>

### E2E — Maestro
<Fluxos de tela a cobrir/atualizar em e2e/flows/, com os testIDs envolvidos.>

Inclua cenários para: caminho feliz, dados inválidos, estados de erro/edge (overtime, sem descanso, crash mid-sessão, retomada).

## Fluxo de implementação

### Fase 1 — Motor + fixtures (se aplicável)
1. Escrever/alterar fixtures em `fixtures/engine/`
2. Refletir em `src/engine/` (Jest verde)
3. Refletir em `watch/TapNextEngine/` (`swift test` verde)

### Fase 2 — Domínio & persistência
1. Tipos em `src/domain/`
2. Schema + migração em `src/data/database.ts`, `mappers.ts`, repositórios
3. Export/sync se aplicável

### Fase 3 — UI + i18n
1. Chaves i18n (pt-BR + en)
2. Primitivos/telas iPhone
3. Watch (se aplicável)

### Fase 4 — E2E
1. Atualizar/criar flows Maestro

## Riscos e decisões pendentes
<Incertezas que podem impactar a implementação.>
```

---

## Etapa 4 — Registrar decisões arquiteturais (ADR)

Identifique se o plano contém decisão que merece ADR — **trade-off com consequências duradouras**:

| Qualifica ✓ | Não qualifica ✗ |
|---|---|
| Novo módulo nativo / dependência não usada antes | Nova tela seguindo o design system |
| Mudança na máquina de estados do motor | Ajuste de comportamento coberto por fixture existente |
| Mudança no modelo de sync ou no formato de dados | Coluna nova retrocompatível |
| Decisão que quebra a paridade iPhone↔Watch | Refactor interno sem mudança de contrato |
| Escolha entre abordagens incompatíveis | Chave i18n nova |

**Verifique duplicata**: leia `docs/adr/README.md`. Se já há ADR **Aceito** cobrindo a decisão, não duplique — só cite no `plan.md`.

**Para cada decisão nova**, crie `docs/adr/000N-titulo-kebab.md` (próximo número lendo o índice) no template dos ADRs existentes:

```markdown
# ADR 000N — <Título curto>

**Data**: <YYYY-MM-DD>
**Status**: Aceito
**Decisor**: Leandro Alves

## Contexto
<Por que a decisão foi necessária? Qual restrição motivou?>

## Decisão
<O que foi decidido, em uma frase.>

## Alternativas consideradas
| Opção | Prós | Contras |
|-------|------|---------|
| **<escolhida>** *(escolhida)* | ... | ... |
| <alternativa> | ... | ... |

## Consequências
**Positivas**: ...
**Negativas / trade-offs**: ...
```

Atualize o índice em `docs/adr/README.md` (linha na tabela com número, título e link).

Se nenhuma decisão nova, pule silenciosamente.

---

## Etapa 5 — Atualizar `.current-plan.md`

```markdown
# Plano ativo

feature_directory: specs/<ISSUE>-<short-name>
spec: specs/<ISSUE>-<short-name>/spec.md
plan: specs/<ISSUE>-<short-name>/plan.md
tasks:
```

---

## Etapa 6 — Reportar

- Caminho do plan
- **Toca o motor?** → fixtures + TS + Swift no fluxo
- Tabelas/schema afetados; telas/rotas planejadas
- ADRs criados (se houver): `docs/adr/000N-*.md`
- `.current-plan.md` atualizado
- Próximo passo: `/tn-tasks`
