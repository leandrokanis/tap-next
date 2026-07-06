---
name: "tn-debug"
description: "Debuga um bug do tap-next de forma colaborativa: investiga hipóteses com o desenvolvedor, instrumenta o código (RN/Metro, motor, Swift), confirma a causa raiz com evidência de runtime, planeia e aplica o fix mínimo com teste de regressão (respeitando a paridade do motor TS↔Swift via fixtures). Quatro checkpoints obrigatórios bloqueiam aguardando o desenvolvedor — NÃO aplicar SIM PARA TUDO. Use sempre que o usuário quiser debugar um bug, investigar um comportamento inesperado ou corrigir uma regressão."
argument-hint: "Número da issue (ex.: 76), URL da issue, ou vazio para inferir da branch"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

Opcional: número da issue (`76`/`#76`), URL da issue, ou vazio (inferir da branch).

---

## Filosofia (ler antes de começar)

Debug é feito **junto** do desenvolvedor. Esta skill é colaborativa: hipóteses, causa raiz e plano passam por ele antes de qualquer ação. **NÃO aplicar "SIM PARA TUDO"** — os checkpoints são o design. Quatro obrigatórios:

1. **Hipóteses** — validadas antes de instrumentar.
2. **Causa raiz** — confirmada com evidência antes de planejar o fix.
3. **Plano de correção** — aprovado antes de implementar.
4. **Verificação do fix** — o desenvolvedor reproduz com o fix aplicado; só a confirmação dele encerra.

**Reprodução é manual** — quem reproduz é o desenvolvedor, no app real (simulador/device/web), com o código instrumentado.

**Evidência antes de fix.** Nunca corrigir por especulação.

**Fix mínimo.** Modificação precisa, não reescrita.

**Instrumentação temporária, marcador `[TN-DEBUG]`.** Vive até o "corrigiu", depois removida integralmente.

**Teste de regressão obrigatório.** Todo bug corrigido deixa um teste que falharia sem o fix. Se o bug é do motor, o teste de regressão é uma **fixture** (roda em Jest **e** Swift) — e o fix vai nas duas implementações (ADR 0002).

---

## Passo 1 — Resolver o número da issue

`ISSUE_ID` na ordem: argumento numérico → URL (número final) → branch atual (`git branch --show-current`, número inicial). Sem fonte:

> Não foi possível resolver o número da issue. Passe o número (`/tn-debug 76`), a URL, ou rode a partir da branch da issue.

---

## Passo 2 — Ler o bug no GitHub

```bash
gh issue view <ISSUE_ID>
```

Extraia: título, comportamento atual/esperado, passos, plataforma/origem, comentários (stack traces, prints). Sem passos claros → pergunte ao desenvolvedor antes de prosseguir.

---

## Passo 3 — Localizar o diretório da feature

Prioridade: branch atual → slug → pasta em `specs/` com número/slug; senão `.current-plan.md` `feature_directory` (se existir no filesystem); senão crie `specs/<número>-<slug>/`. Registre `debug.md` nesse diretório.

---

## Passo 4 — Investigação estática + hipóteses

- Explore o código relevante: telas/serviços citados, o motor (`src/engine/`, `watch/TapNextEngine/`) e as fixtures se o sintoma for de sessão, o sync (`watchSync.ts`, `Sync/`), mudanças recentes (`git log -- <paths>`).
- Leia `docs/SPEC.md` (contrato do motor/UX) e os ADRs em `docs/adr/` relevantes.
- Formule **3 a 5 hipóteses** ranqueadas. Inclua ao menos uma não óbvia (relógio/`at`, ordem de eventos, snapshot/round-trip, paridade TS↔Swift, módulo nativo faltando, permissão iOS).

### ✋ CHECKPOINT 1 — Apresentar hipóteses

```
## Hipóteses — #XXX

| # | Hipótese | Plausibilidade | Onde olhar | Como a evidência decide |
|---|----------|----------------|------------|-------------------------|
| H1 | [causa] | alta | `src/.../arquivo.ts:NN` | [qual log confirma/refuta] |
| H2 | ... | média | ... | ... |

Pode validar, reordenar, descartar ou adicionar. Sigo para a instrumentação com as aprovadas.
```

Só avance com o conjunto acordado.

---

## Passo 5 — Instrumentar + reprodução manual

**Log server (útil no web preview e p/ clients que fazem POST):**
```bash
node .claude/skills/tn-debug/scripts/debug-server.mjs &
```
Logs acumulam em `/tmp/tn-debug.log` (NDJSON).

**Inserir logs cirúrgicos** nos pontos que decidem cada hipótese, sempre com `[TN-DEBUG]`:

- **RN / TS (motor, provider, telas, dados):**
  ```ts
  console.log('[TN-DEBUG] H1', JSON.stringify({ phase, remaining, at }));
  ```
  Ler em: console do **Metro** (terminal onde roda `npm start`/`npm run ios`) ou `npx react-native log-ios`. No **simulador**: `xcrun simctl spawn booted log stream --predicate 'eventMessage CONTAINS "[TN-DEBUG]"'`.

- **Client web (`npm run web`, componente de UI):**
  ```ts
  fetch('http://localhost:7331/log', { method: 'POST', body: JSON.stringify({ tag: '[TN-DEBUG] H1', phase }) });
  ```
  Ler em: `/tmp/tn-debug.log`.

- **Swift (motor / watch VM):**
  ```swift
  print("[TN-DEBUG] H1 \(String(describing: phase)) remaining=\(remaining)")
  ```
  Ler em: console do Xcode (watch não é buildável localmente — instrumente o motor via `swift test` com um caso que reproduza, ou peça reprodução no device pareado).

- **Motor (sem device):** muitas vezes a evidência mais rápida é uma **fixture ou teste Jest** que reproduz a sequência de eventos suspeita — o motor é puro, então o bug de estado costuma reproduzir em `npx jest`.

**Entregue o roteiro de reprodução** ao desenvolvedor (passos da issue + o que observar) e aguarde. **Leia a evidência** e mapeie cada linha à hipótese. Se tudo for refutado, volte ao Passo 4 (novo CHECKPOINT 1, reinstrumentar).

---

## Passo 6 — Confirmar causa raiz

### ✋ CHECKPOINT 2 — Apresentar a causa raiz

Apresente e aguarde confirmação:
- Qual hipótese se confirmou e qual evidência a sustenta (linhas concretas).
- Por que o código se comporta assim (mecanismo, não sintoma).
- Por que os testes/fixtures existentes não pegaram.

Se o desenvolvedor discordar ou trouxer contexto novo: volte ao Passo 4/5.

---

## Passo 7 — Gerar `FEATURE_DIR/debug.md` e aprovar o plano

```markdown
# Debug: [TÍTULO DA ISSUE]

**GitHub**: #[ISSUE_ID]
**Feature**: [FEATURE_DIR]
**Data**: [DATA]

## Bug
- **Comportamento atual**: [da issue + observado]
- **Comportamento esperado**: [da issue]
- **Reprodução**: [roteiro manual executado]

## Hipóteses investigadas
| # | Hipótese | Veredito | Evidência |
|---|----------|----------|-----------|
| H1 | [causa] | ✅ confirmada / ❌ refutada | [log/observação concreta] |

## Causa raiz
[Mecanismo, com paths reais e evidência. Confirmada no CHECKPOINT 2.
Por que testes/fixtures existentes não pegaram.]

## Plano de correção
- [ ] **Regressão** — [se toca o motor: fixture nova/alterada em `fixtures/engine/` que falha sem o fix; senão teste em `src/**/__tests__/*.test.ts`]
- [ ] **Fix mínimo** — [arquivo(s): `src/...` e, se motor, também `watch/TapNextEngine/...`] — [o que muda]
- [ ] **Paridade** — [se motor: refletir em TS + Swift; ambas as suites verdes]
- [ ] **Testes afetados** — [atualizar existentes, se houver]

## Verificação
- [ ] Regressão passa com o fix (e falhava sem)
- [ ] `npm test` verde  | `swift test --package-path watch/TapNextEngine` verde (se motor)
- [ ] **Desenvolvedor reproduziu e confirmou** (CHECKPOINT 4)
- [ ] Instrumentação `[TN-DEBUG]` removida — `grep -rn "TN-DEBUG" src watch` vazio
```

### ✋ CHECKPOINT 3 — Aprovação do plano

Apresente e aguarde aprovação explícita. Ele pode editar o `debug.md`; só então prossiga.

---

## Passo 8 — Executar a correção (só após CHECKPOINT 3)

1. **Regressão (RED)** — escreva/atualize o teste (ou fixture) e confirme que falha pelo motivo da causa raiz.
   ```bash
   npx jest <arquivo.test.ts>              # ou fixtures.test.ts
   ```
2. **Fix mínimo (GREEN)** — menor mudança que corrige a causa. Se toca o motor, **TS + Swift**:
   ```bash
   npm test
   swift test --package-path watch/TapNextEngine   # se motor
   ```
3. **Testes existentes** — rode as suites afetadas. Quebra não relacionada → reporte antes de continuar.

**NÃO limpe a instrumentação ainda.**

---

## Passo 9 — ✋ CHECKPOINT 4 — Verificação pelo desenvolvedor (loop)

Com o fix e a instrumentação no lugar, peça reprodução dos passos da issue.

- **"Corrigiu"** → Passo 10.
- **"Não corrigiu" / "parcialmente"** → leia a nova evidência, volte ao Passo 4 (hipóteses revisadas, novo CHECKPOINT 1).

A skill não conclui sem o "corrigiu" explícito.

---

## Passo 10 — Concluir (só após o "corrigiu")

1. **Limpar instrumentação** — remover todas as linhas `[TN-DEBUG]`, derrubar o log server, apagar `/tmp/tn-debug.log`.
   ```bash
   grep -rn "TN-DEBUG" src watch   # deve retornar vazio
   ```
2. **Suites completas:**
   ```bash
   npm run typecheck && npm test
   swift test --package-path watch/TapNextEngine   # se tocou o motor
   ```
3. Marque os checkboxes de Verificação no `debug.md`.

---

## Passo 11 — Reportar

```
✅ Debug concluído: #XXX

Causa raiz: [1 frase — confirmada pelo desenvolvedor]
Evidência: [log/observação da reprodução]
Hipóteses: N (M refutadas) | Ciclos: K | Tocou o motor: <sim (TS+Swift) | não>

Fix:
- [path] — [o que mudou]

Testes:
- [regressão: fixture ou *.test.ts] — [atualizado/criado]
- Suites verdes: ✅ | Instrumentação removida: ✅ | Verificação manual: ✅

Diagnóstico: FEATURE_DIR/debug.md
Próximo passo: /tn-pr
```

---

## Regras

- **Colaborativa** — NÃO "SIM PARA TUDO". Quatro checkpoints obrigatórios; nunca pulá-los.
- **Nunca implementar antes do CHECKPOINT 3.**
- **A implementação não encerra a skill** — só o "corrigiu" (CHECKPOINT 4).
- **Limpeza só após confirmação.**
- **Motor = paridade**: fix e regressão do motor vão em fixture + TS + Swift.
- **Reprodução é manual pelo desenvolvedor.**
- **Fix mínimo.** Escopo maior → reportar e parar.
- **Toda instrumentação leva `[TN-DEBUG]`** e é removida integralmente no fim.
- **Sem commit** — o desenvolvedor decide quando.
- **Parar em falha não relacionada** — teste de outra área quebrando → reportar antes de continuar.
