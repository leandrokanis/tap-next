# ADR 0001 — React Native no iPhone, SwiftUI nativo no Watch

**Status:** aceito · 2026-07-05

## Contexto

O produto exige um app de iPhone em React Native e um app de Apple Watch capaz
de rodar a sessão inteira sem o iPhone. React Native não tem suporte a
watchOS: um app de Watch standalone precisa ser nativo. Os dois requisitos não
cabem no mesmo código.

## Decisão

- iPhone: React Native com Expo. O diretório `ios/` gerado pelo
  `expo prebuild` é **versionado no git**, porque o target do Watch vive
  dentro do projeto Xcode gerado e não pode ser recriado automaticamente.
- Watch: app SwiftUI nativo (`ios/TapNextWatch/`), target do mesmo projeto
  Xcode.
- `expo prebuild` só roda de forma consciente (upgrade de Expo), com diff
  revisado para não destruir o target do Watch.

## Alternativas rejeitadas

- **Tudo nativo Swift** — eliminaria a duplicação do motor (ADR 0002), mas
  abandonaria o requisito React Native.
- **Watch como fase 2** — adiaria a tensão sem resolvê-la.

## Consequências

- Dois idiomas no repositório; contribuidores de RN não precisam tocar em
  Swift e vice-versa, exceto no motor (ver ADR 0002).
- CI precisa de job macOS para build/testes do Watch e E2E.
