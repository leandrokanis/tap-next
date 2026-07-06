---
name: "tn-specify"
description: "Cria ou atualiza a especificação de uma feature do tap-next a partir de uma descrição em linguagem natural, com foco no domínio de sessões de treino/fisioterapia (iPhone + Apple Watch). Use sempre que o usuário quiser especificar uma nova feature, descrever um requisito, iniciar um novo desenvolvimento ou atualizar um spec existente."
argument-hint: "Descreva a feature que quer especificar"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

O texto após `/tn-specify` é o ponto de partida. Nunca peça para o usuário repetir.

---

## Contexto do projeto

**tap-next** — companion open source para sessões de musculação e fisioterapia:

- **Ator**: o usuário praticante (app pessoal, sem papéis)
- **Plataformas**: iPhone (React Native / Expo, TS) + Apple Watch (SwiftUI + motor Swift)
- **Motor de sessão duplicado** TS (`src/engine/`) ↔ Swift (`watch/TapNextEngine/`) via **fixtures compartilhadas** `fixtures/engine/` (ADR 0002)
- **Persistência**: SQLite local (iPhone), JSON + outbox (Watch); sem backend
- **Docs**: `docs/PRD.md` (RF-XX), `docs/SPEC.md` (spec técnica), `docs/adr/`
- **i18n**: pt-BR + en obrigatórios

---

## Etapa 0 — Sincronizar com main

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Se listar commits (main avançou), **pare e avise**:

> ⚠️ A branch `main` tem N commit(s) que você ainda não tem. Rode `git rebase origin/main` antes de continuar para evitar conflitos no PR.

Se vazio, prossiga.

---

## Etapa 1 — Nomear e numerar a feature

1. **Número da issue a partir da branch atual**: `git branch --show-current`, extraia o primeiro grupo de dígitos após ignorar prefixos (`feat/`, `fix/`, `chore/`, `feature/`). Ex.: `42-carga-sugerida` → `42`, `feat/42-carga` → `42`.
   - Sem número na branch → pare: "Não encontrei número de issue na branch `<nome>`. Confirme a branch ou informe o número."
2. **`short-name`** de 2–4 palavras em kebab-case, derivado da descrição (não do sufixo da branch).
3. Diretório: `specs/<ISSUE>-<short-name>/`.
4. `mkdir -p specs/<ISSUE>-<short-name> && touch specs/<ISSUE>-<short-name>/spec.md`.

---

## Etapa 2 — Entrevista de requisitos (OBRIGATÓRIA — não pule)

Antes de escrever, **entreviste** o usuário para entender o comportamento.

**Regras:**
- Nunca suponha comportamento sem perguntar; nunca invente regras.
- Se a descrição for vaga, pergunte até ficar específica.
- No máximo 5–7 perguntas por rodada; faça novas rodadas enquanto houver ambiguidade.
- Só avance para a Etapa 3 quando o usuário confirmar.

Categorias a cobrir (formule perguntas sobre o que não estiver explícito):

**Contexto e motivação**
- Que problema do praticante resolve? Vale no iPhone, no Watch, ou nos dois?
- Já existe algo parecido (algum RF-XX)? Como se diferencia?

**Comportamento principal**
- Fluxo passo a passo do caminho feliz.
- O que acontece ao concluir com sucesso? Há estados intermediários (fase work/rest, overtime, pausado)?
- Muda a máquina de estados do motor (SPEC §3)? Se sim, o comportamento tem que valer igual em TS e Swift (fixtures).

**Regras de negócio**
- Validações e limites (reps, kg, duração, descanso).
- O que acontece quando uma regra é violada — erro silencioso, mensagem, bloqueio?

**Fluxos alternativos e erros**
- Recurso inexistente, dados inválidos (import JSON), crash no meio da sessão.
- Alguma ação é irreversível? Há confirmação (modal) ou soft delete?

**Persistência e sync**
- Muda `SessionRecord` / schema SQLite? Precisa migração idempotente (`src/data/database.ts`)?
- Cruza o sync append-only Watch↔iPhone (ADR 0005)? Campo novo sobrevive ao encode/decode?

**Escopo desta entrega**
- O que fica explicitamente de fora? Depende de outra feature?

Apresente as perguntas agrupadas por categoria, priorizando impacto no escopo. Foque no comportamento do produto, sem jargão. Espere as respostas; faça rodadas até não restar ambiguidade. Resuma antes de escrever:

> "Entendido. Vou especificar com base em: [lista]. Posso prosseguir?"

Só avance com confirmação.

---

## Etapa 3 — Escrever spec.md

Foque no **O QUÊ** e **POR QUÊ**, nunca no como. Escreva `specs/<ISSUE>-<short-name>/spec.md`:

```markdown
# Spec: <Nome da Feature>

## Contexto
<Por que existe? Que problema resolve? Qual valor para o praticante?>

## Plataformas
<iPhone, Apple Watch, ou ambos — e o que difere entre elas>

## Requisitos funcionais

### P1 — Essencial
- RF01: <requisito testável>
- RF02: ...

### P2 — Importante
- RF03: ...

### P3 — Desejável
- RF04: ...

## Cenários de uso

### Cenário 1: <Nome>
**Fluxo principal**:
1. ...
**Fluxo alternativo / erro**:
- ...

## Impacto no motor de sessão
<Muda a máquina de estados / o cálculo de fases? Se sim: quais fixtures em fixtures/engine/ mudam e o que TS+Swift precisam refletir. Se não, escreva "nenhum".>

## Critérios de aceite
- [ ] CA01: <verificável sem detalhes de implementação>
- [ ] CA02: ...

## Fora de escopo
- <o que explicitamente NÃO faz parte desta entrega>

## Dependências
- <outras features, RFs, ADRs>
```

**Regras**:
- Tudo no spec foi confirmado na entrevista — sem invenção.
- Requisitos testáveis e unívocos; critérios verificáveis por QA sem conhecer a stack.
- Remova seções que não se aplicam (nada de "N/A").
- Sem detalhes de implementação (nomes de arquivo, componentes, tipos).

---

## Etapa 4 — Validar o spec com o usuário

> "Aqui está o spec gerado com base na nossa conversa. Algo está errado, faltando ou diferente do esperado?"

Atualize e revalide até o usuário confirmar.

---

## Etapa 5 — Atualizar documentação (condicional)

Após aprovado, verifique se o spec introduz algo **não presente** em `docs/SPEC.md` ou nos ADRs:

- **Novo comportamento do motor** → antecipe que `docs/SPEC.md §3` (máquina de estados) precisará de atualização na implementação, e que ADR pode ser necessário (`/tn-plan` decide).
- **Nova integração / decisão estrutural** (ex.: novo módulo nativo, mudança no sync, novo formato de dados) → sinalize como candidato a ADR em `docs/adr/`.

Se nada estrutural mudou, pule silenciosamente. **Não** reescreva o SPEC aqui — isso acontece na implementação.

---

## Etapa 6 — Atualizar a issue no GitHub

```bash
gh issue edit <ISSUE> --body "$(cat specs/<ISSUE>-<short-name>/spec.md)"
```

Se falhar (`gh` não autenticado, issue inexistente), avise mas **não interrompa**.

---

## Etapa 7 — Registrar o plano ativo

Escreva/atualize `.current-plan.md` na raiz:

```markdown
# Plano ativo

feature_directory: specs/<ISSUE>-<short-name>
spec: specs/<ISSUE>-<short-name>/spec.md
plan:
tasks:
```

`plan:` e `tasks:` vazios — preenchidos por `/tn-plan` e `/tn-tasks`.

---

## Etapa 8 — Reportar

- Caminho do spec
- Se toca o motor (⇒ fixtures + TS + Swift no plano)
- `.current-plan.md` atualizado
- Próximo passo: `/tn-plan`
