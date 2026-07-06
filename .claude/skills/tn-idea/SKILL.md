---
name: "tn-idea"
description: "Faz triagem de uma ideia, funcionalidade, tarefa ou bug do tap-next, interroga o usuário estilo grill-me até entendimento completo, registra no lugar certo do PRD (quando aplicável) e abre a issue no GitHub com todo o contexto. Não depende de plano ativo. Precede o /tn-specify."
argument-hint: "Descreva a ideia, funcionalidade, tarefa ou bug que quer explorar"
user-invocable: true
disable-model-invocation: false
---

## Entrada do usuário

```text
$ARGUMENTS
```

Se `$ARGUMENTS` estiver vazio, responda:
> Descreva a ideia, funcionalidade, tarefa ou bug. Exemplo: `/tn-idea sugerir carga da próxima sessão a partir do histórico`

Nunca peça para o usuário repetir a descrição.

---

## Contexto do projeto

**tap-next** é um companion open source para sessões de **musculação e fisioterapia**:

- **Plataformas**: app iPhone (React Native / Expo, TypeScript) + app Apple Watch (SwiftUI nativo + motor Swift)
- **Ator**: o próprio usuário (praticante). App pessoal — **não há papéis/roles**.
- **Motor de sessão duplicado**: TypeScript em `src/engine/` e Swift em `watch/TapNextEngine/`, mantidos idênticos por **fixtures compartilhadas** em `fixtures/engine/` ([ADR 0002](../../docs/adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)).
- **Persistência**: SQLite local no iPhone (`src/data/`), JSON + outbox no Watch. **Sem backend, sem API.**
- **Docs**: `docs/PRD.md` (requisitos `RF-XX`), `docs/SPEC.md` (spec técnica), `docs/adr/` (ADRs).
- **Princípios**: offline-first; os dados são do usuário (import/export JSON); paridade iPhone↔Watch via fixtures; um CTA por tela; **sempre deixar claro o que vem a seguir**; i18n pt-BR + en obrigatórios.

---

## Etapa 0 — Triagem

Antes de tudo, leia `docs/PRD.md` e classifique a entrada em **exatamente uma** categoria. Explore o código (`src/`, `watch/`) e o PRD antes de decidir — não pergunte o que dá para descobrir sozinho.

| Categoria | Sinais | Destino |
|-----------|--------|---------|
| **Funcionalidade** | Capacidade nova visível ao usuário (nova tela, novo comportamento de sessão, novo dado) | Novo(s) `RF-XX` na seção 4 do PRD → issue |
| **Tarefa / Chore** | Trabalho técnico sem valor direto de usuário (refactor, CI, deps, docs, tooling) | **Não vai ao PRD** → issue direto |
| **Bug** | Comportamento existente quebrado ou divergente do esperado/SPEC | **Não vai ao PRD** → issue direto |
| **Duplicata** | Já coberto por um `RF-XX` ou issue existente | Não prossegue sem decisão |

Anuncie a classificação em uma linha antes de continuar, por exemplo:

> **Triagem**: isto é uma **Funcionalidade** — encaixa na seção *4. Requisitos funcionais → Treinos e histórico*. Vou aprofundar antes de registrar.

**Se for Duplicata**: cite o `RF-XX` ou a issue conflitante e pergunte se quer **evoluir o existente**, **criar algo complementar** ou **cancelar**.

**Se for Tarefa ou Bug**: pule a escrita no PRD (Etapa 3). Ainda assim interrogue (Etapa 2) o suficiente para uma issue acionável e crie a issue (Etapa 4).

---

## Etapa 1 — Mapa de cobertura

Produza internamente (não exiba) um mapa da ideia nas dimensões abaixo, classificando cada uma como **Claro** / **Parcial** / **Ausente**:

- **Motivação & valor** — que problema resolve para o praticante
- **Comportamento central** — ação do sistema, resultado, estados/transições (fase work/rest, overtime, registro prospectivo)
- **Escopo & limites** — o que entra, o que fica de fora, v1 vs backlog
- **Impacto no motor** — mexe no motor de sessão? Então exige fixture + TS + Swift (regra de ouro, ADR 0002)
- **Paridade iPhone/Watch** — vale nos dois? Só iPhone? Só Watch?
- **Persistência & sync** — muda `SessionRecord`/schema SQLite? Cruza o sync append-only (ADR 0005)?
- **Restrições** — offline-first, i18n pt-BR+en, um CTA por tela, sem backend
- **Critérios de aceite** — já dá para definir algo testável?
- **Edge cases críticos** — cenário de falha que muda o design (crash mid-sessão, overtime, sem descanso)

Priorize no interrogatório as dimensões **Parcial** e **Ausente** de maior impacto.

---

## Etapa 2 — Interrogatório (estilo grill-me)

Interrogue o usuário **implacavelmente** até um entendimento compartilhado e completo. Percorra cada ramo da árvore de decisão, resolvendo dependências uma a uma.

Regras:
- **Uma pergunta por vez.** Nunca despeje uma lista.
- **Sem teto fixo.** Continue enquanto restar ambiguidade que afete escopo, motor, UX ou persistência. Não force perguntas quando já estiver claro.
- **Se o código, o PRD ou o SPEC respondem, não pergunte** — explore `src/`, `watch/`, `docs/` e traga a resposta você mesmo.
- **Cada pergunta traz sua recomendação** e o porquê em 1–2 frases.
- **Respeite as dependências** — resolva a decisão-pai antes do ramo dependente.
- Cada resposta cabe em escolha múltipla (2–5 opções) **ou** resposta curta (≤5 palavras).

Formato:

```
**Pergunta N**: <pergunta>

**Recomendação**: <resposta recomendada> — <razão em 1–2 frases>

| Opção | Descrição |
|-------|-----------|
| A     | ...       |
| B     | ...       |

Responda com a letra, "sim" para aceitar a recomendação, ou uma resposta curta própria (≤5 palavras).
```

Após cada resposta: registre em memória de trabalho (não salve em disco ainda), reavalie o mapa, siga para a próxima ambiguidade.

**Encerre quando** todas as dimensões críticas estiverem **Claras** ou o usuário sinalizar "pronto". Antes de sair, faça um resumo de 3–5 linhas e peça confirmação ("Fechado assim?").

---

## Etapa 3 — Registrar no PRD *(só para Funcionalidade)*

Pule esta etapa se a triagem classificou como **Tarefa**, **Bug** ou **Duplicata sem evolução**.

1. Ache a subseção mais adequada em *4. Requisitos funcionais* (`Sessão`, `Apple Watch`, `Treinos e histórico`).
2. O número do RF é o próximo disponível (leia o PRD, ache o maior `RF-XX` e some 1; use sufixo `b` só para variação intimamente ligada a um RF existente, como `RF-02b`).
3. Insira no formato do PRD:

```markdown
- **RF-XX** — <descrição testável do comportamento, na voz do produto>.
```

**Regras de qualidade**:
- Verificável por QA sem conhecer a stack.
- Não menciona tecnologia (React Native, Swift, SQLite).
- Explicite paridade iPhone/Watch quando relevante.
- Se depender de outro RF, cite-o na descrição.

Preserve todo o conteúdo existente do PRD — apenas insira o novo bloco na posição correta. Decisões abertas de baixo impacto vão para a seção de *Riscos / Questões em aberto* do PRD, se existir.

---

## Etapa 4 — Criar a issue no GitHub

Sempre crie a issue ao fim, para **todas** as categorias (exceto Duplicata cancelada). A issue carrega **todo o contexto** do interrogatório.

Monte o corpo e passe via arquivo temporário (`--body-file`) para preservar formatação:

```markdown
## Contexto
<1–2 parágrafos com o problema/motivação e o entendimento fechado>

## Escopo
- <o que está dentro>
- <o que está explicitamente fora>

## Critérios de Aceitação   <!-- só para funcionalidade; omita em bug/chore -->
- <critério testável 1>
- <critério testável 2>

## Passos para reproduzir    <!-- só para bug -->
1. ...

## Impacto no motor / paridade
<mexe no motor de sessão? exige fixture + TS + Swift? vale iPhone, Watch ou ambos? — omita se não se aplica>

## Decisões tomadas
- <decisão> — <razão>

## Referências
- PRD: RF-XX   <!-- se aplicável -->
- ADR: 000N    <!-- se toca uma decisão registrada -->
- Depende de: #<nº> / RF-XX  <!-- se houver -->
```

Título e label por categoria:

| Categoria | Título | Label |
|-----------|--------|-------|
| Funcionalidade | `feat: <descrição imperativa em inglês, ≤72 chars>` | `enhancement` |
| Tarefa / Chore | `chore: <descrição>` | *(sem label — `chore` não existe no repo)* |
| Bug | `fix: <descrição>` | `bug` |

Comando:

```bash
gh issue create --title "<título>" --label "<label>" --body-file <arquivo-temporário>
```

Se o label não existir, refaça sem `--label`. Capture a URL/número.

---

## Etapa 5 — Reportar

```
## Resultado

**Categoria**: <Funcionalidade | Tarefa | Bug>
**Issue**: #<nº> — <título>  (<URL>)
**PRD**: RF-XX em docs/PRD.md   (ou "não aplicável")
**Toca o motor?**: <sim → exige fixture + TS + Swift | não>

### Cobertura de dimensões
| Dimensão | Status |
|---|---|
| Motivação & valor | Resolvido |
| Comportamento central | Resolvido |
| ... | ... |

### Questões em aberto
- <lista, se houver>

### Próximos passos
1. git checkout -b <nº>-<short-name>
2. /tn-specify <descrição da feature>
```

---

## Regras gerais

- Não crie `spec.md`, `plan.md` ou `tasks.md` — isso é papel do `/tn-specify` em diante.
- Não atualize nem dependa de `.current-plan.md`.
- Sempre leia o PRD/SPEC e explore o código antes de perguntar.
- Prefira descobrir no código a perguntar ao usuário.
- Nunca altere conteúdo existente do PRD além da inserção do novo RF.
- Título da issue em conventional commits (inglês, imperativo, ≤72 chars).
