# ADR 0005 — Sync append-only via WatchConnectivity, com dono por tipo de dado

**Status:** aceito · 2026-07-05

## Contexto

iPhone e Watch operam desconectados durante o treino e precisam convergir
depois, sem servidor. Sincronização bidirecional genérica traz conflitos
(edições concorrentes, relógios distintos) que não valem o custo aqui.

## Decisão

Cada tipo de dado tem **um único dono que escreve**; o outro lado só lê:

| Dado | Dono | Transporte | Semântica |
|---|---|---|---|
| Treinos (definições) | iPhone | `updateApplicationContext` | último estado vence; Watch mantém cache somente-leitura |
| Sessões concluídas/parciais | quem executou | `transferUserInfo` (fila com entrega garantida) | **append-only**: iPhone insere por `id` (UUID), reenvios são idempotentes |

Edição de histórico só existe no iPhone, sobre registros já importados —
nunca há duas escritas no mesmo registro em aparelhos diferentes, logo não há
conflito por construção. No Watch, sessões pendentes ficam num **outbox** em
disco até a entrega ser confirmada.

## Consequências

- Sem resolução de conflitos, sem merge, sem relógio vetorial — a classe de
  bug mais cara do domínio é eliminada pelo desenho.
- Criar/editar treinos no Watch fica fora de cogitação na v1 (aceito).
