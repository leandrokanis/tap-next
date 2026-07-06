# Tap Next — Especificação v1

Companion open source para sessões de musculação e fisioterapia: conduz o treino
exercício a exercício, com cronômetro, sinal sonoro e registro por série.

Decisões fechadas em entrevista em 2026-07-05.

## 1. Plataformas e arquitetura

| Componente | Tecnologia |
|---|---|
| iPhone | React Native via Expo (prebuild, `ios/` versionado) |
| Apple Watch | SwiftUI nativo, target dentro do projeto Xcode gerado |
| Comunicação | WatchConnectivity (WCSession) |

- O Watch funciona **standalone** durante o treino; sincroniza quando alcançável.
- O **motor de sessão existe duas vezes** (TypeScript e Swift), por decisão
  consciente: React Native não roda em watchOS. As duas implementações são
  mantidas idênticas por **fixtures de teste compartilhadas** (JSON com treino
  de entrada + sequência de fases esperada), consumidas pelo Jest e pelo XCTest.

## 2. Formato do treino (JSON, schema v1)

Hierárquico: treino → exercícios → séries. Circuitos/supersets ficam para uma
versão futura do schema (campo `version` já reservado).

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
      "restBetweenSets": 90,
      "restAfterExercise": 120,
      "notes": "barra livre"
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

- `mode: "reps"` → série avança por toque no botão **Próximo**.
- `mode: "time"` → série avança sozinha ao fim de `duration` (segundos).
- `weight` é numérico em kg; `weight` e `notes` são opcionais.
- `restBetweenSets` (s) entre séries do mesmo exercício; `restAfterExercise`
  (opcional, s) após a última série, antes do próximo exercício. Sem descanso
  automático após o último exercício do treino.
- Validação com mensagens de erro apontando campo/posição
  (ex.: `exercises[2].sets: esperado número`).

## 3. Motor de sessão (máquina de estados)

Fases: `work(exercício, série)` → `rest` → … → `done`, com estado de pausa
sobreposto a qualquer fase.

- **Isometria** (`work` com `mode: time`): cronômetro regressivo, **avança
  sozinha** ao zerar (entrando no descanso), com som (iPhone) e háptico + som
  (Watch).
- **Descanso** (`rest`): cronômetro regressivo; ao zerar **não avança
  sozinho**. Dispara som (iPhone) / háptico + som (Watch) e passa a contar em
  **overtime** (tempo além do prescrito). Permanece no descanso até um toque
  explícito iniciar o próximo `work`; a contagem do próximo exercício começa
  nesse toque, não antes. Isso significa que o motor tem um estado de descanso
  que persiste após `remaining === 0`, resolvido só por ação do usuário (ou
  finish).
- **Reps** (`work` com `mode: reps`): cronômetro progressivo informativo;
  avança só pelo **Próximo** (botão grande, alvo de toque generoso).
- Avanço manual: **Próximo** durante uma isometria a encerra antes; **Iniciar
  próximo** durante o descanso (running ou em overtime) inicia o próximo
  `work` de imediato — mesmo botão, encurta o descanso.
- Pausar / retomar / encerrar disponíveis o tempo todo. Antes de iniciar, a UI
  lista os exercícios do treino; durante a sessão, sempre exibe o que vem a
  seguir.

### Registro por série (prospectivo)

- Tocar **Próximo** ao fim de uma série a **grava automaticamente com o
  prescrito** (reps e kg) e inicia o descanso imediatamente.
- Durante o descanso, o que aparece editável é o **próximo** set —
  pré-preenchido com o prescrito, ajustável ali mesmo (steppers no iPhone,
  Digital Crown no Watch). O ajuste define o alvo/registro do set que está por
  vir: o usuário decide a carga/reps **antes** de executá-lo.
- A primeira série de cada exercício não tem descanso antes dela, então usa
  sempre o prescrito. Não ajustou ⇒ prescrito vale. O caminho feliz é apenas os
  toques de avanço (Próximo + Iniciar próximo).

### Sessão interrompida

- **Encerrar** no meio abre escolha: *Salvar e sair* (entra no histórico com
  status `parcial` e as séries feitas) ou *Descartar*.
- O estado da sessão é **persistido a cada transição de fase**; se o app morrer
  (crash, bateria, watchdog), ao reabrir oferece retomar de onde parou.

## 4. Apple Watch

- Sessão roda dentro de uma **`HKWorkoutSession`**
  (`.traditionalStrengthTraining`): app não suspende com o pulso abaixado,
  cronômetro preciso, hápticos sempre disparam.
- O treino é **gravado no app Saúde/Fitness** (FC, calorias, anéis). O
  histórico do Tap Next é independente do HealthKit.
- Permissão HealthKit pedida no primeiro uso.

## 5. Histórico

Registro por sessão concluída ou parcial:

```json
{
  "id": "uuid",
  "workoutName": "Pernas A",
  "startedAt": "2026-07-05T14:02:11Z",
  "durationSeconds": 2880,
  "status": "completed",
  "source": "watch",
  "sets": [
    { "exercise": "Agachamento", "setIndex": 1, "reps": 10, "weight": 60 }
  ]
}
```

- `status`: `completed` | `partial`. `source`: `iphone` | `watch`.
- Consulta e edição posterior **no iPhone**; o Watch não tem tela de histórico.

## 6. Sincronização (WatchConnectivity)

- **Treinos**: iPhone é a fonte da verdade → enviados ao Watch via
  `updateApplicationContext` (último estado vence; Watch só lê).
- **Sessões feitas no Watch**: fila de saída (outbox) → `transferUserInfo`
  (entrega garantida quando alcançável) → iPhone grava no histórico.
- Histórico é **append-only** na sincronização ⇒ sem conflitos por construção.
  Edições de histórico acontecem só no iPhone, depois de importado.

## 7. Persistência

- **iPhone**: SQLite (`expo-sqlite`) atrás de uma camada repository —
  tabelas `workouts`, `sessions`, `session_sets`.
- **Watch**: arquivos JSON no container do app — cache de treinos recebido do
  iPhone + outbox de sessões pendentes de envio.

## 8. Som e alertas no iPhone

- App em primeiro plano: som (expo-av) + háptico no fim de cada fase.
- App em segundo plano/tela bloqueada: **notificação local agendada** para o
  instante do fim da fase cronometrada (som do sistema), cancelada/reagendada
  a cada mudança de fase, pausa ou pulo.

## 9. Importação e exportação

- Importar treino (v1): **colar JSON** em campo de texto, com validação e
  erros claros. (Seletor de arquivos, share sheet e URL: backlog.)
- Exportar: treinos e histórico completos em JSON — dado do usuário é do
  usuário.

## 10. Testes

| Camada | Ferramenta |
|---|---|
| Motor TS, validação de schema, repositórios | Jest |
| Motor Swift, sync, HealthKit (mockado) | XCTest |
| Paridade dos dois motores | Fixtures JSON compartilhadas (`fixtures/engine/`) |
| E2E iPhone | **Maestro** no simulador iOS (flows YAML, estilo BDD) |

Decisão registrada: Playwright foi **substituído por Maestro** — Playwright só
automatiza browsers e não dirige app iOS nativo.

## 11. Projeto

- **Licença: MIT.**
- **i18n desde a v1**: strings centralizadas, pt-BR + en, seguindo o idioma do
  sistema (RN: i18next; Watch: `Localizable.strings`).
- CI (GitHub Actions): job Linux (lint + Jest); job macOS (XCTest + build
  Watch + Maestro).

## Layout do repositório (previsto)

```
tap-next/
├── src/                  # app React Native
│   ├── engine/           # motor de sessão (TS, puro, sem RN)
│   ├── domain/           # tipos, validação do schema de treino
│   ├── data/             # SQLite, repositórios, sync (lado iPhone)
│   ├── screens/
│   └── i18n/
├── ios/                  # gerado por expo prebuild, versionado
│   └── TapNextWatch/     # app watchOS (SwiftUI + motor Swift)
├── fixtures/engine/      # fixtures compartilhadas TS ↔ Swift
├── e2e/                  # flows Maestro
└── docs/SPEC.md
```
