---
name: "tn-pr"
description: "Cria o pull request da feature ativa do tap-next com título em conventional commits, template padronizado e fechamento automático da issue. Use sempre que o usuário quiser abrir um PR, publicar uma feature, criar pull request ou mandar para revisão."
argument-hint: "Tipo do commit opcional (feat, fix, chore…) e escopo"
user-invocable: true
---

## Entrada do usuário

```text
$ARGUMENTS
```

Se fornecido, use como dica do tipo/escopo do conventional commit (ex: `feat(engine)`, `fix(import)`).

---

## Etapa 1 — Coletar contexto

```bash
git branch --show-current          # branch atual
git log main..HEAD --oneline       # commits desta branch vs main
git diff main...HEAD --stat        # arquivos alterados
```

Leia `.current-plan.md` para `feature_directory`, `spec`, `plan`. Se `plan.md` existir, extraia: área(s) tocada(s) (motor / domínio / dados / UI iPhone / Watch), se mexeu no motor (fixtures + TS + Swift), telas/fluxos afetados.

---

## Etapa 2 — Extrair o número da issue

Do nome da branch, primeiro grupo de dígitos após ignorar prefixos (`feat/`, `fix/`, `chore/`, `feature/`). Ex.: `feat/42-carga-sugerida` → `42`.

Sem número → pare: "Não encontrei número de issue na branch. Confirme a branch ou informe o número."

---

## Etapa 3 — Montar o título (conventional commits)

Formato: `<type>(<scope>): <descrição imperativa em inglês>`

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade para o usuário |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem novo comportamento |
| `perf` | Melhoria de performance |
| `test` | Testes / fixtures |
| `chore` | Manutenção, deps, config, tooling |
| `docs` | Documentação (PRD, SPEC, ADR) |

**Escopo** (opcional): área principal tocada — `engine`, `session`, `import`, `history`, `watch`, `sync`, `ui`, `i18n`. Omita se transversal.

**Regras**: imperativo, sem ponto final, ≤72 chars, minúsculas.

**Exemplos**:
- `feat(engine): hold rest in overtime until tap`
- `fix(import): dismiss keyboard blocking the import button`
- `refactor(ui): extract timer text into a primitive`

Se `$ARGUMENTS` informar tipo/escopo, priorize. Senão, derive dos commits e arquivos.

---

## Etapa 4 — Verificar antes de abrir

1. Não commitados:
   ```bash
   git status --short
   ```
   Se houver, pare e oriente: "Há alterações não commitadas. Faça commit antes de abrir o PR." *(Commits são decisão do usuário — não commite por conta própria salvo pedido explícito.)*
2. Suites verdes antes do PR (rode se ainda não rodou nesta sessão):
   ```bash
   npm run typecheck && npm test
   swift test --package-path watch/TapNextEngine   # se o PR toca o motor
   ```
   Se algo falha, pare e reporte.
3. Upstream:
   ```bash
   git status -sb | head -1
   ```
   Sem upstream → `git push -u origin <branch>`.

---

## Etapa 5 — Criar o PR

Substitua todos os placeholders por informação real — nunca deixe placeholder literal.

```bash
gh pr create \
  --title "<título conventional commit>" \
  --body "$(cat <<'EOF'
## O que muda

<1–3 frases sobre o que foi implementado e por quê. Foco no valor para o praticante.>

## Detalhes técnicos

- <área / arquivo principal alterado e o que faz>
- <se tocou o motor: fixtures alteradas + paridade TS/Swift mantida (ADR 0002)>
- <mudança de domínio/persistência: campo, coluna, migração>
- <UI: telas/primitivos; Watch, se aplicável>
- <ADR criado, se houver: docs/adr/000N-*.md>

## Como testar

- [ ] <passo 1 do comportamento principal>
- [ ] <passo 2 — edge / erro esperado>
- [ ] `npm run typecheck && npm test`
- [ ] `swift test --package-path watch/TapNextEngine`   <!-- se tocou o motor -->
- [ ] `npm run e2e`                                     <!-- se tocou a UI de fluxos cobertos -->

## Checklist

- [ ] Testes/fixtures escritos e passando
- [ ] Motor em paridade (TS + Swift) se aplicável
- [ ] Chaves i18n em pt-BR e en
- [ ] testIDs preservados nos flows Maestro
- [ ] SPEC/PRD atualizados se o contrato mudou
- [ ] Sem console.log ou código de debug

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Closes #<ISSUE_NUMBER>
EOF
)"
```

---

## Etapa 6 — Reportar

- URL do PR
- Título usado
- Issue fechada: `Closes #<N>`
- Suites verdes confirmadas (typecheck, Jest, Swift se aplicável)
