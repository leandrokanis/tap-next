# ADR 0003 — Maestro em vez de Playwright para E2E

**Status:** aceito · 2026-07-05

## Contexto

O requisito original pedia testes end-to-end com Playwright em estilo BDD.
Playwright automatiza browsers; não dirige um app React Native rodando no
simulador iOS. As alternativas eram testar um build web (react-native-web) com
Playwright ou testar o app iOS real com uma ferramenta de mobile.

## Decisão

Usar **Maestro** contra o simulador iOS. Os flows YAML (`e2e/flows/`) são
legíveis como cenários BDD (lançar app → tocar → afirmar) e testam o binário
real, incluindo navegação nativa.

## Alternativas rejeitadas

- **Expo Web + Playwright** — manteria a ferramenta pedida, mas testaria um
  build web que nenhum usuário usa, sem som/background/WatchConnectivity.
- **Detox** — mais acoplado ao RN e mais frágil de manter que Maestro.

## Consequências

- E2E exige macOS no CI (job dedicado).
- O requisito "Playwright" foi formalmente substituído com aprovação do dono
  do produto.
