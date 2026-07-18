# Tap Next — Especificação v3

Companion open source para sessões de musculação e fisioterapia: conduz o
treino exercício a exercício, com cronômetro, sinal sonoro e registro por
série. **App web instalável (PWA), offline-first** — ADR 0007.

Decisões: entrevista de 2026-07-05; fluxo de sessão v2 (Preparação-first)
em 2026-07-17 (PRD 2.0, ADR 0006); pivô web em 2026-07-18 (PRD 3.0,
ADR 0007).

## 1. Plataforma e arquitetura

| Componente | Tecnologia |
|---|---|
| App | React Native Web via Expo (TypeScript) |
| Distribuição | PWA: hospedagem estática + manifest + service worker |
| Persistência | Armazenamento local do browser (localStorage, JSON) |

- `npx expo export --platform web` gera o site estático (`dist/`); o
  diretório `public/` (manifest, service worker, ícones) é copiado à raiz.
- O service worker pré-cacheia o shell e faz cache-first em runtime — tudo
  offline após o primeiro load.
- **Não há backend, contas nem sync.** O app nativo iOS/Watch foi removido
  (histórico no git; ADRs 0001/0002/0004/0005 substituídos).

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
  (ex.: `exercises[2].sets: esperado número`) e localização linha/coluna no
  texto colado (`locateJsonPath`).

## 3. Motor de sessão (máquina de estados)

Fases (ADR 0006): `prepare(exercício, série)` → `work` → `rest` → … →
`done`, com pausa sobreposta a qualquer fase. **Toda série é precedida por
uma `prepare`** — o invariante do produto é "nenhum exercício começa sem um
toque explícito".

- **Preparação** (`prepare`): sem cronômetro próprio; exibe os valores da
  série por vir, editáveis (rodas de rolagem). **Nunca avança sozinha** —
  sai pelo **Iniciar**. Quando veio de um descanso zerado, mostra o
  **overtime** (`max(0, now − restDeadline)`) em âmbar; `restDeadline` é o
  prazo original do descanso anterior, mantido mesmo se o descanso foi
  cortado, e deslocado por pausas.
- **Contagem de entrada** (séries `time`, RF-17): **Iniciar** desloca o
  início do `work` em 3 s (`phaseStartedAt = at + 3`); a UI lê
  `countdownRemaining` (3 → 2 → 1 → vai). Os 3 s contam na duração da
  sessão, não no tempo da série.
- **Isometria** (`work` com `mode: time`): cronômetro regressivo, **avança
  sozinha** ao zerar (entrando no descanso). **Encerrar antes** a conclui
  com o tempo executado.
- **Descanso** (`rest`): cronômetro regressivo, **sem edição**; ao zerar
  **avança sozinho para a `prepare` seguinte** (com sinal). **Iniciar
  próximo** antes do zero corta o descanso e abre a `prepare` na hora.
- **Reps** (`work` com `mode: reps`): cronômetro progressivo informativo;
  avança só pelo **Próximo**.
- `tick` auto-avança works cronometrados **e** rests, cascateando por
  boundaries exatos; **para sempre em `prepare`**.
- Pausar / retomar / encerrar disponíveis o tempo todo. Antes de iniciar, a
  UI lista os exercícios do treino; durante a sessão, a barra "A SEGUIR"
  (e "DEPOIS" no descanso) sempre exibe o que vem.
- Progresso é **gráfico** (RF-01): barra segmentada por exercício + pontos
  de série; sem "exercício X de Y" / "série X de Y" em texto.

### Registro por série (prospectivo)

- Concluir uma série a **grava automaticamente com os valores vigentes**
  (prescrito ou ajustado).
- O ajuste acontece na **Preparação** da própria série (RF-06): reps/kg ou
  tempo, pré-preenchidos com o prescrito. **Toda série é ajustável,
  inclusive a primeira.** `upcomingOverride` é consumido quando o set é
  gravado, que sai com `adjusted: true`.
- Não ajustou ⇒ prescrito vale. O caminho feliz é Iniciar (cada preparação)
  + Próximo (cada série por reps).
- A duração da sessão é relógio de parede menos pausas: preparação,
  overtime e contagem de entrada contam; o tempo gravado de uma série
  `time` exclui a contagem.

### Fixtures — especificação executável

O comportamento do motor é definido pelas fixtures em `fixtures/engine/`
(eventos + expectativas), rodadas pelo Jest. **Regra de ouro: mudou o motor
⇒ mudou a fixture, no mesmo PR** (ADR 0007, herdeira da 0002).

### Sessão interrompida

- **Encerrar** no meio abre escolha: *Salvar e sair* (entra no histórico com
  status `parcial` e as séries feitas) ou *Descartar*.
- O estado da sessão é **persistido a cada transição de fase** (snapshot
  versionado); refresh/fechamento/crash ⇒ ao reabrir, oferece retomar de
  onde parou.

## 4. Histórico

Registro por sessão concluída ou parcial:

```json
{
  "id": "uuid",
  "workoutName": "Pernas A",
  "startedAt": "2026-07-05T14:02:11Z",
  "durationSeconds": 2880,
  "status": "completed",
  "source": "iphone",
  "sets": [
    { "exercise": "Agachamento", "setIndex": 1, "reps": 10, "weight": 60 }
  ]
}
```

- `status`: `completed` | `partial`. (`source` permanece no schema por
  compatibilidade de export; novas sessões usam o valor legado.)

## 5. Persistência

- **localStorage** (JSON) atrás da camada repository (`src/data/`):
  treinos (`tapnext.workouts`), sessões (`tapnext.sessions`) e snapshot da
  sessão ativa (`tapnext.activeSession`, envelope versionado).
- Dados pequenos por natureza (anos de histórico ≈ centenas de KB).
  IndexedDB fica no backlog se crescer.
- O export JSON (RF-14) é a garantia de posse do dado — sobrevive a
  qualquer limpeza de storage do browser.

## 6. Som, vibração e tela

- **Sons por evento (RF-18)**: contagem de entrada (tick por segundo),
  "vai"/início de exercício, fim de isometria, início de descanso, fim de
  descanso (abertura da Preparação) e sessão concluída — assets em
  `assets/sounds/`, tocados via `expo-audio` (Web Audio); vibração por
  padrão de evento via `navigator.vibrate` onde houver.
- **Wake lock (RF-23)**: `navigator.wakeLock` mantém a tela acesa durante a
  sessão; best-effort (sem suporte ⇒ no-op), re-adquirido ao voltar à aba.
- O primeiro toque em Iniciar é o gesto que desbloqueia o áudio (política de
  autoplay dos browsers).
- Sem notificações locais/push (fora de escopo — ADR 0007).

## 7. Importação e exportação

- Importar treino: **paste-only** — botão único "Colar da área de
  transferência", pré-visualização somente leitura com **erro inline**
  (linha destacada) e cartão apontando campo, linha e coluna; Importar
  desabilitado enquanto houver erro. (Arquivo/share/URL: backlog.)
- Exportar: treinos e histórico completos em JSON.

## 8. PWA

- `public/manifest.webmanifest`: nome, ícones 192/512 (conceito 2c),
  `display: standalone`, tema/fundo `#0B0D11`.
- `public/sw.js`: precache do shell no install; runtime cache-first para
  GETs same-origin; navegações offline caem para o shell. Bump da constante
  `CACHE` invalida tudo num deploy.
- Registro do SW e injeção do manifest em `src/services/pwa.ts`
  (só web + produção).

## 9. Testes

| Camada | Ferramenta |
|---|---|
| Motor TS, validação de schema, dados (localStorage), serviços | Jest |
| Comportamento do motor | Fixtures JSON (`fixtures/engine/`) como espec executável |
| E2E web | Backlog (Playwright) |

## 10. Projeto

- **Licença: MIT.**
- **i18n desde a v1**: strings centralizadas (i18next), pt-BR + en, seguindo
  o idioma do sistema.
- CI (GitHub Actions): job único Linux — typecheck + Jest.

## Layout do repositório

```
tap-next/
├── src/
│   ├── engine/           # motor de sessão (TS, puro)
│   ├── domain/           # tipos, validação do schema de treino
│   ├── data/             # repositórios sobre localStorage, export
│   ├── screens/          # telas RN-Web
│   ├── services/         # alerts (som/vibração), wakeLock, pwa
│   ├── session/          # SessionProvider
│   ├── ui/               # design system
│   └── i18n/
├── public/               # manifest, service worker, ícones PWA
├── fixtures/engine/      # espec executável do motor
├── assets/               # ícone, fontes, sons
└── docs/                 # PRD, SPEC, ADRs, protótipo
```
