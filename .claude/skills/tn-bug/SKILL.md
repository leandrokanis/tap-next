---
name: "tn-bug"
description: "Registra um bug do tap-next: interroga comportamento atual e esperado, passos para reproduzir e impacto, depois abre a issue no GitHub com label bug. Use sempre que o usuário quiser reportar um bug, comportamento inesperado ou regressão."
argument-hint: "Descreva brevemente o bug"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

Se `$ARGUMENTS` estiver vazio, responda:
> Descreva o bug brevemente. Exemplo: `/tn-bug o teclado esconde o botão de importar e não fecha`

---

## Etapa 1 — Identificar domínio

Leia o suficiente para saber **onde** o bug ocorre — plataforma (iPhone / Apple Watch), tela (`src/screens/`), motor de sessão (`src/engine/`), sync (`src/data/watchSync.ts`, `watch/.../Sync/`), import/export. **Não investigue a causa raiz** — isso é papel do `/tn-debug`. O objetivo é registrar o comportamento observado com fidelidade.

---

## Etapa 2 — Interrogatório

Interrogue **uma pergunta por vez** até ter um relatório que qualquer dev consiga reproduzir e corrigir sem ajuda extra.

Dimensões (priorize as ausentes em `$ARGUMENTS`):

| Dimensão | O que extrair |
|----------|---------------|
| **Comportamento atual** | O que acontece de errado — erro, estado visual, crash (`Cannot find native module`, etc.) |
| **Comportamento esperado** | O que deveria acontecer |
| **Passos para reproduzir** | Sequência mínima e determinística |
| **Contexto** | Plataforma (iPhone/Watch), tela/rota, fase da sessão (work/rest/overtime), dados de entrada (treino, JSON) |
| **Origem** | Simulador, device físico, web preview (`npm run web`) |
| **Frequência** | Sempre, às vezes, só em condição específica |
| **Impacto** | Bloqueante, degradante, cosmético |

Regras:
- **Uma pergunta por vez.**
- **Dê sua recomendação** quando houver resposta mais provável.
- **Não investigue a causa** — não leia código para diagnosticar. Registre o que o usuário observa.
- Encerre quando as dimensões estiverem cobertas ou o usuário disser "pronto".

Formato:

```
**Pergunta N**: <pergunta>

**Recomendação**: <resposta mais provável> — <razão em 1 frase>

Responda com "sim" para confirmar ou corrija em poucas palavras.
```

Antes de sair, resuma em 3–5 linhas e peça confirmação ("Fechado assim?").

---

## Etapa 3 — Criar a issue no GitHub

Salve o corpo em arquivo temporário para preservar formatação:

```markdown
## Comportamento atual
<o que acontece>

## Comportamento esperado
<o que deveria acontecer>

## Passos para reproduzir
1. <passo 1>
2. <passo 2>

## Contexto
- **Plataforma**: <iPhone | Apple Watch>
- **Tela / Rota**: <ex: Import, Session (rest/overtime), History>
- **Origem**: <simulador | device físico | web preview>
- **Frequência**: <sempre | às vezes | condição específica>
- **Impacto**: <bloqueante | degradante | cosmético>

## Suspeita técnica
<módulo/arquivo suspeito — se ficou óbvio na Etapa 1; omita se não houver. Se toca o motor, note que o fix precisará de fixture + TS + Swift.>
```

Título: `fix(<escopo>): <descrição imperativa em inglês, ≤72 chars>` (escopo: `engine`, `session`, `import`, `history`, `sync`, `watch`, `ui`…).

```bash
gh issue create --title "<título>" --label "bug" --body-file <arquivo-temporário>
```

Se `bug` não existir, refaça sem `--label`. Capture a URL.

---

## Etapa 4 — Reportar

```
## Bug registrado

**Issue**: #<nº> — <título>  (<URL>)
**Área suspeita**: <módulo/tela ou "não identificado">
**Toca o motor?**: <sim → fix precisa de fixture + TS + Swift | não | a confirmar no debug>
**Impacto**: <bloqueante | degradante | cosmético>

### Próximos passos
1. git checkout -b <nº>-fix-<short-name>
2. /tn-debug <nº>   (investigar causa raiz com evidência)
```
