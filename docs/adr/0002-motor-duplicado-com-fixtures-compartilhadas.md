# ADR 0002 — Motor de sessão duplicado (TS + Swift) com fixtures compartilhadas

**Status:** aceito · 2026-07-05

## Contexto

Consequência do ADR 0001: iPhone roda TypeScript, Watch roda Swift, e os dois
precisam conduzir sessões com comportamento idêntico (mesma expansão de fases,
mesmas regras de avanço, pausa e pulo). Não há como compartilhar código
executável entre RN e watchOS sem heroísmo (JS embarcado, KMP), que não se
justifica para um motor pequeno.

## Decisão

Implementar o motor duas vezes — `src/engine/` (TS puro, sem imports de RN) e
no target do Watch (Swift puro, sem UIKit/SwiftUI) — e garantir paridade por
**fixtures de teste compartilhadas** em `fixtures/engine/`: arquivos JSON com
treino de entrada, sequência de eventos e estados esperados. Jest e XCTest
carregam as mesmas fixtures.

Regra de contribuição: **mudou o comportamento do motor ⇒ mudou a fixture ⇒
mudou o outro motor no mesmo PR.** CI roda as duas suítes.

## Consequências

- Custo permanente de manutenção dupla, limitado a um módulo pequeno e puro.
- As fixtures viram a especificação executável do motor — a fonte da verdade
  do comportamento não é nenhuma das duas implementações.
