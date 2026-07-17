# ADR 0006 — Preparação como fase do motor; descanso auto-avança para ela

**Data**: 2026-07-17
**Status**: Aceito
**Decisor**: Leandro Alves

## Contexto

O protótipo v2.1 (PRD v2.0) introduz a Preparação antes de **toda** série:
tela onde o usuário ajusta os valores da série por vir e confirma com
Iniciar. O descanso perde a edição e, ao zerar, deve abrir a Preparação
automaticamente; o overtime passa a ser exibido na Preparação. O
comportamento precisa ser idêntico no iPhone (motor TS) e no Watch (motor
Swift) e verificável por fixtures (ADR 0002).

## Decisão

`prepare` vira **fase da máquina de estados do motor**, inserida por
`expandPhases` antes de cada `work`; o `rest` passa a **auto-avançar no
boundary para o `prepare` seguinte**, e o invariante do produto se torna
"nenhum `work` inicia sem evento explícito". A contagem de entrada 3-2-1 de
séries de tempo é modelada deslocando o início do `work` em 3 s
(`phaseStartedAt = at + 3`), e o overtime é `max(0, now − restDeadline)`
carregado no estado ao sair de um descanso.

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **Fase `prepare` no motor** *(escolhida)* | Paridade TS↔Swift por fixtures; retomada pós-crash cai na tela certa; overtime e 3-2-1 testáveis sem UI | Reescreve fixtures existentes; snapshot de sessão ativa muda de formato |
| Estado só de UI (SessionProvider/SwiftUI) | Motor intocado | Duplicaria lógica em duas UIs sem fixture; retomada e duração inconsistentes; overtime calculado em dois lugares |
| `rest` continua esperando e a UI "pinta" a preparação | Menos mudança no tick | Mentira semântica (tela diz preparação, motor diz rest); ajuste prospectivo na 1ª série não teria fase para viver |

## Consequências

**Positivas**: fixtures cobrem todo o fluxo novo (auto-abertura, overtime,
corte de descanso, 3-2-1, ajuste na 1ª série); UIs viram render puro da fase
atual; duração relógio-de-parede sai de graça do `sessionElapsed` existente.

**Negativas / trade-offs**: todas as fixtures existentes são reescritas;
snapshot de sessão ativa anterior é descartado no upgrade (janela minúscula,
app pré-release); `phases` fica ~2× maior por sessão (irrelevante em
memória).
