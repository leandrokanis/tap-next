---
name: "tn-autopilot"
description: "Executa o fluxo completo do tap-next de ponta a ponta de forma totalmente autônoma, sem interação: aceita automaticamente a recomendação em todo interrogatório, entrevista e gate de validação das sub-skills tn-*. Vai de idea/specify até o PR sem parar, exceto em erro irrecuperável. Quando não recebe descrição, lê a issue a partir da branch atual. Use quando o usuário quiser rodar tudo em piloto automático, sem responder perguntas."
argument-hint: "Descreva a ideia/feature — ou deixe vazio para partir da issue da branch atual"
user-invocable: true
disable-model-invocation: false
---

## Entrada do usuário

```text
$ARGUMENTS
```

O ponto de partida vem de `$ARGUMENTS` **ou**, quando vazio, da issue apontada pela branch atual. Nunca peça para o usuário repetir.

- `$ARGUMENTS` com texto → ideia crua; siga pela Fase A (cria issue).
- `$ARGUMENTS` vazio → **leia a issue da branch atual** e use o corpo como descrição.
- Só pare pedindo descrição se `$ARGUMENTS` vazio **e** a branch não apontar para issue.

---

## Regra soberana — modo autônomo (vale para TODAS as etapas)

Neste modo **você assume o papel do usuário**. O pipeline roda de ponta a ponta sem interação humana.

- **Em toda pergunta, entrevista, interrogatório ou gate de validação de qualquer sub-skill (`tn-idea`, `tn-specify`, `tn-plan`, `tn-tasks`, `tn-implement`, `tn-pr`), escolha a opção Recomendada e prossiga.** Onde a sub-skill diz "só avance quando o usuário confirmar", trate como **já confirmado**.
- **Nunca use `AskUserQuestion` nem faça perguntas.** Decida internamente e siga.
- Pergunta sem recomendação explícita → escolha o padrão mais seguro e alinhado aos **princípios do tap-next** (offline-first; os dados são do usuário; paridade iPhone↔Watch via fixtures; um CTA por tela; sempre mostrar o que vem a seguir; i18n pt-BR+en; sem backend) e **registre como premissa** no log de decisões.
- Encerre os interrogatórios quando as dimensões críticas estiverem cobertas — não pergunte a si mesmo indefinidamente.

### Log de decisões automáticas

Mantenha um registro de cada recomendação aceita e cada premissa assumida. É apresentado no relatório final para o usuário revisar.

---

## Etapa 0 — Sincronizar com main

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Se listar commits (main avançou), **pare e avise** — erro irrecuperável em modo autônomo (arriscaria conflitos no PR):

> ⚠️ A branch `main` tem N commit(s) que você ainda não tem. Rode `git rebase origin/main` antes de rodar o autopilot novamente.

Se vazio, prossiga.

---

## Etapa 0.1 — Resolver a fonte de verdade (issue da branch)

1. `git branch --show-current`.
2. Extraia o **número da issue** (primeiro grupo de dígitos após ignorar `feat/`, `fix/`, `chore/`, `feature/`). Ex.: `42-carga-sugerida` → `42`.
3. **Se `$ARGUMENTS` vazio:**
   - Achou número → `gh issue view <n> --json number,title,body`. Use `title`+`body` como **DESCRIÇÃO** de referência. Registre no log: "Partindo da issue #<n>: <título>".
   - Sem número → pare: não há de onde partir.
4. **Se `$ARGUMENTS` tem texto:** use-o como DESCRIÇÃO. A issue será criada na Fase A.

Chame a descrição resolvida de **`DESCRIÇÃO`** — substitui `$ARGUMENTS` nas sub-skills daqui em diante.

---

## Fase A — Ideia e branch (condicional)

1. **Já numa branch de issue existente** (`$ARGUMENTS` vazio, issue lida) → pule a Fase A, vá para a Fase B. O contexto está em `DESCRIÇÃO`.
2. **Ideia crua em `$ARGUMENTS`**:
   1. Invoque `/tn-idea $ARGUMENTS`, aceitando todas as recomendações da triagem/interrogatório. Registra RF no PRD (se funcionalidade) e cria a issue.
   2. Capture o número e crie/entre na branch: `git checkout -b <numero>-<short-name>`.
   3. Prossiga para a Fase B.

Imprima: `✓ [A] Ideia triada e branch pronta` (ou `✓ [A] Issue #<n> lida da branch — pulando triagem`).

---

## Fase B — Pipeline até o PR

Rode cada sub-skill em sequência, avançando automaticamente e aceitando recomendações. Após cada etapa: `✓ [N/5] <etapa> concluída`.

### 1/5 — Specify
`/tn-specify` com a `DESCRIÇÃO`. Aceite todas as recomendações. Aguarde `spec.md` e `.current-plan.md` escritos.

### 2/5 — Plan
`/tn-plan`. Aceite a opção recomendada em cada pergunta técnica. Aguarde `plan.md` e `plan:` preenchido. Se toca o motor, confirme que o plano inclui a tríade **fixtures + TS + Swift**. Se ADRs foram criados, confirme os arquivos em `docs/adr/`.

### 3/5 — Tasks
`/tn-tasks`. Aguarde `tasks.md` e `tasks:` preenchido.

### 4/5 — Implement
`/tn-implement`. Aceite o plano de testes recomendado. Aguarde todas as tasks `[x]`, `npm run typecheck` e `npm test` verdes, e — se tocou o motor — `swift test --package-path watch/TapNextEngine` verde. Atualize `docs/SPEC.md`/PRD se o contrato mudou.

### 5/5 — PR
`/tn-pr`. Aguarde a URL do PR.

---

## Condições de parada (erro irrecuperável)

Só interrompa se:
- `main` avançou (Etapa 0) e exige rebase.
- `$ARGUMENTS` vazio e nenhuma issue na branch (Etapa 0.1).
- `spec.md` acabaria com ambiguidade estrutural que nenhuma recomendação resolve.
- Testes falham após 2 tentativas de correção no `tn-implement` — cole a saída.
- Motor: TS e Swift não fecham paridade numa fixture após 2 tentativas.
- Migração SQLite falha ao aplicar.
- Módulo nativo novo exige rebuild indisponível.
- `gh` não autenticado / `gh pr create` falha.

Ao parar, informe: a etapa, o erro exato, o log de decisões já tomadas, e como retomar manualmente (a sub-skill individual a rodar).

---

## Relatório final

Ao concluir o PR:

- **PR**: URL retornada pelo `/tn-pr`
- **Issue**: número e título
- **Artefatos**: caminhos de `spec.md`, `plan.md`, `tasks.md`; ADRs criados; fixtures novas
- **Testes**: Jest (total escrito/passando), motor Swift (verde/N-A), E2E (status)
- **Log de decisões automáticas**: cada recomendação aceita e cada premissa assumida — para o usuário revisar e ajustar depois.
