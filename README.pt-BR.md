# Tap Next

**Leia em: [English](README.md)**

Um companion open source para sessões de musculação e fisioterapia. O Tap Next
conduz o treino exercício a exercício, cronometrando cada fase, tocando um
sinal quando é hora de seguir — e pedindo um único toque quando não é.

> **Status:** 🛠 v1 implementada — motores TS + Swift (fixtures compartilhadas),
> app iPhone, fontes do app watchOS, flows Maestro e CI. Passo manual restante:
> montar o target do Watch no Xcode ([docs/WATCH_SETUP.md](docs/WATCH_SETUP.md)).

## O que ele faz

- **Sessões guiadas** — mostra o exercício atual, separa fases de execução e
  descanso e cronometra cada uma.
- **Avanço automático** — fases com tempo definido (descansos, isometrias)
  avançam sozinhas, com som no iPhone e háptico + som no Apple Watch.
- **Um botão "Próximo" grande** — séries por repetições não têm fim natural,
  então avançam com um toque único e fácil de acertar. Tocar Próximo durante
  uma fase cronometrada pula a fase.
- **Registro por série sem fricção** — ao fim da série, o descanso começa na
  hora; a série recém-feita aparece pré-preenchida com o prescrito
  (reps · kg), editável durante o descanso. Não mexeu, o prescrito é gravado
  como realizado.
- **App de Watch independente** — roda a sessão inteira no relógio dentro de
  uma `HKWorkoutSession` (sem depender do iPhone durante o treino, gravando no
  app Saúde) e sincroniza os resultados depois.
- **Gestão de treinos** — mantenha vários treinos, importe novos em JSON,
  exporte tudo (treinos e histórico) em JSON. Seus dados são seus.
- **Histórico** — toda sessão concluída (ou parcial) fica salva: treino, data,
  duração e séries realmente feitas — consultável no iPhone, incluindo o que
  foi feito no Watch.

## Formato do treino

```json
{
  "version": 1,
  "name": "Pernas A",
  "exercises": [
    {
      "name": "Agachamento",
      "mode": "reps",
      "sets": 3,
      "reps": 10,
      "weight": 60,
      "restBetweenSets": 90
    },
    {
      "name": "Prancha",
      "mode": "time",
      "sets": 3,
      "duration": 30,
      "restBetweenSets": 15
    }
  ]
}
```

`mode: "reps"` avança por toque; `mode: "time"` avança sozinho. Schema completo
em [docs/SPEC.md](docs/SPEC.md).

## Arquitetura

| Componente | Tecnologia |
|---|---|
| App iPhone | React Native (Expo, prebuild) |
| App Watch | SwiftUI nativo (target watchOS no mesmo projeto Xcode) |
| Motor de sessão | Implementado duas vezes — TypeScript e Swift — mantidos idênticos por fixtures de teste compartilhadas |
| Sync | WatchConnectivity; treinos fluem iPhone → Watch, sessões feitas fluem Watch → iPhone (append-only, sem conflitos) |
| Persistência | SQLite no iPhone, arquivos JSON + outbox no Watch |

React Native não roda em watchOS, então o app do Watch é nativo por decisão de
projeto — veja o [ADR 0001](docs/adr/0001-react-native-iphone-swiftui-watch.md)
e os demais [registros de decisão de arquitetura](docs/adr/).

## Layout do repositório

```
tap-next/
├── src/                  # app React Native
│   ├── engine/           # motor de sessão (TS puro, sem imports de RN)
│   ├── domain/           # tipos + validação do schema de treino
│   ├── data/             # SQLite, repositórios, sync (lado iPhone)
│   ├── screens/
│   └── i18n/             # en + pt-BR
├── ios/                  # gerado por expo prebuild, versionado
│   └── TapNextWatch/     # app watchOS (SwiftUI + motor Swift)
├── fixtures/engine/      # fixtures compartilhadas TS ↔ Swift
├── e2e/flows/            # flows Maestro (YAML estilo BDD)
└── docs/                 # PRD, SPEC, ADRs
```

## Estratégia de testes

| Camada | Ferramenta |
|---|---|
| Motor TS, validação de schema, repositórios | Jest |
| Motor Swift, sync, HealthKit (mockado) | XCTest |
| Paridade dos motores (TS ↔ Swift) | Fixtures compartilhadas em `fixtures/engine/` |
| End-to-end (simulador iOS) | Maestro |

## Como rodar

```bash
npm install

npm run typecheck                              # TypeScript
npm test                                       # Jest — motor, domínio, dados
swift test --package-path watch/TapNextEngine  # motor Swift, mesmas fixtures

npx expo run:ios                               # app iPhone (macOS + Xcode)
npm run e2e                                    # flows Maestro (ver e2e/README.md)
```

O app do Watch exige uma configuração única de target no Xcode:
[docs/WATCH_SETUP.md](docs/WATCH_SETUP.md).

## Documentação

- [PRD — requisitos de produto](docs/PRD.md)
- [SPEC — especificação técnica](docs/SPEC.md)
- [ADRs — registros de decisão de arquitetura](docs/adr/)
- [Guia de contribuição](CONTRIBUTING.md)

## Licença

[MIT](LICENSE)
