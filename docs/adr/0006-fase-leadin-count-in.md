# ADR 0006 — Count-in como fase `leadin` explícita no motor

**Data**: 2026-07-06
**Status**: Aceito
**Decisor**: Leandro Alves

## Contexto

O uso real em fisioterapia mostrou que séries de tempo (`mode: time`) começam
bruscamente: o cronômetro dispara no toque, sem tempo de posicionar o corpo.
A solução de produto é um count-in de 3 s (3 → 2 → 1 → vai) antes de **cada**
série de tempo, que não conta na duração registrada da sessão. A questão
arquitetural: onde vive essa contagem — no motor (que é duplicado TS/Swift,
ADR 0002) ou na UI de cada plataforma?

## Decisão

O count-in é uma **fase `leadin` explícita** na sequência produzida por
`expandPhases`, inserida antes de cada `work` com `mode: time`, com duração
fixa de 3 s, auto-avanço ao zerar e nenhum registro de série. O tempo ativo
gasto em `leadin` é acumulado em `leadinSeconds` no `EngineState` e excluído
de `sessionElapsed`, análogo a `pausedSeconds`.

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **Fase `leadin` no motor** *(escolhida)* | Paridade iPhone↔Watch de graça (uma implementação por motor, coberta por fixtures); snapshot de crash captura o count-in; exclusão do tempo fica ao lado do cálculo que ela afeta | Toca os dois motores + fixtures (custo de lockstep); snapshots antigos não têm a fase |
| Count-in na UI (timer local antes de chamar `start`/`next`) | Motor intocado; entrega mais rápida | Duplicado em RN e SwiftUI com risco de divergir; invisível ao snapshot (crash durante count-in perde o estado); exclusão do tempo de sessão vira gambiarra na borda |
| Deslocar `phaseStartedAt` 3 s para o futuro | Sem fase nova | Estado implícito: `remaining > duration` durante a preparação, fixtures e UI precisariam interpretar; overtime/pausa ambíguos |

## Consequências

**Positivas**: comportamento idêntico nas duas plataformas garantido por
fixtures; count-in pausável, pulável (`next`) e persistido como qualquer fase;
`durationSeconds` do histórico exclui a preparação sem código especial.

**Negativas / trade-offs**: `Phase` ganha um terceiro tipo que toda UI
precisa tratar (exaustividade de switch); snapshots gravados antes desta
versão retomam sem fases `leadin` e sem o campo `leadinSeconds` (backfill 0
na decodificação); fixtures existentes com exercícios de tempo precisaram ser
reescritas.
