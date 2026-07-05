# Configurando o target do Apple Watch (macOS + Xcode)

O código do app watchOS vive em `watch/TapNextWatch/` (SwiftUI) e o motor em
`watch/TapNextEngine/` (Swift Package puro, testável com `swift test` em
qualquer plataforma). O que o Xcode precisa saber é montado uma única vez,
seguindo estes passos — o resultado (diretório `ios/` com o target) fica
versionado no git (ADR 0001).

## Pré-requisitos

- macOS com Xcode 16+
- Node.js LTS e CocoaPods

## Passos

1. **Gerar o projeto iOS** (uma vez):

   ```bash
   npm install
   npx expo prebuild --platform ios
   ```

2. **Abrir** `ios/TapNext.xcworkspace` no Xcode.

3. **Adicionar o target watchOS**: File → New → Target… → watchOS → App.
   - Product Name: `TapNextWatch`
   - Bundle Identifier: `com.leandrokanis.tapnext.watchkitapp`
   - Interface SwiftUI, marque "Watch App for Existing iOS App" apontando
     para o app `TapNext`.
   - Delete os arquivos Swift de exemplo que o Xcode criar.

4. **Trazer os fontes**: arraste as pastas `watch/TapNextWatch/`
   (Views, Session, Stores, Sync, Resources e `TapNextWatchApp.swift`) para o
   target `TapNextWatch` **sem** "Copy items if needed" (referência direta —
   o git continua sendo a fonte da verdade).

5. **Adicionar o pacote do motor**: File → Add Package Dependencies… →
   "Add Local…" → selecione `watch/TapNextEngine`. Vincule o produto
   `TapNextEngine` ao target `TapNextWatch`.

6. **Capacidades do target `TapNextWatch`**:
   - HealthKit (Signing & Capabilities → + Capability).
   - Background Modes → marque **Workout processing**.
   - Em Info.plist do watch app, adicione
     `NSHealthShareUsageDescription` e `NSHealthUpdateUsageDescription`
     (textos exibidos ao pedir permissão).

7. **Rodar**: selecione o scheme `TapNextWatch` → simulador de Apple Watch
   (pareado com um simulador de iPhone rodando o app RN via
   `npx expo run:ios`).

8. **Testes do motor Swift** (não precisam do Xcode):

   ```bash
   swift test --package-path watch/TapNextEngine
   ```

## Atenção com `expo prebuild`

Rodar `npx expo prebuild --clean` **destrói** o target do Watch. Só rode
prebuild conscientemente (upgrade de Expo) e revise o diff de `ios/` antes de
commitar (ver CONTRIBUTING).
