# E2E — Maestro

Flows YAML em estilo BDD (cenários descritos em comentários Dado/Quando/Então)
dirigindo o app iOS real no simulador (ADR 0003).

## Rodar localmente (macOS)

```bash
# 1. build e instalação no simulador
npx expo run:ios

# 2. suíte completa
npm run e2e            # = maestro test e2e/flows
```

Os flows usam `testID`s estáveis; os únicos seletores por texto são botões de
Alert nativos (sem testID em RN), então rode com o simulador em **inglês** —
mesma configuração do CI (`.github/workflows/e2e-ios.yml`, disparo manual).
