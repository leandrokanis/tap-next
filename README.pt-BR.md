# Tap Next

**Leia em: [English](README.md)**

Um companion open source para sessões de musculação e fisioterapia. O Tap Next
conduz o treino exercício a exercício, cronometrando cada fase, tocando um
sinal quando é hora de seguir — e pedindo um único toque quando não é.

É um **app web instalável, offline-first (PWA)**: abra a URL, adicione à tela
de início e treine sem sinal na academia. Sem loja, sem conta — treinos entram
como JSON, o histórico sai como JSON, e nada depende de servidor.

> **Status:** 🛠 v3 — pivô web concluído ([ADR 0007](docs/adr/0007-pivo-para-pwa-web.md)).
> Os apps nativos iOS/Watch foram descontinuados; tudo roda no browser.

## O que ele faz

- **Sessão em três momentos** — Preparação → Execução → Descanso, numa
  anatomia de tela única; só o palco central muda.
- **Preparação antes de cada série** — ajuste reps/carga/tempo nas rodas de
  rolagem antes de executar; confirme com um toque em **Iniciar**. Nada
  começa sozinho.
- **Avanço automático (só onde faz sentido)** — isometrias avançam sozinhas
  ao zerar; descanso zerado sinaliza e **abre a Preparação seguinte**
  automaticamente, com o tempo parado em âmbar (`+0:23`).
- **Um botão grande por tela** — Iniciar, Próximo, Iniciar próximo. Séries
  por repetições avançam com um toque único e fácil de acertar.
- **Registro por série sem fricção (prospectivo)** — cada série concluída é
  gravada com os valores confirmados na Preparação. Não mexeu, o prescrito
  vale.
- **Um som para cada evento** — contagem de entrada, vai, fim de isometria,
  início e fim de descanso, sessão concluída — e vibração onde o aparelho
  suportar. A tela fica acesa durante a sessão (wake lock).
- **Gestão de treinos e histórico** — importe treinos em JSON (validação
  inline com linha/coluna), consulte e edite o histórico, exporte tudo. Seus
  dados são seus.

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

### Gerar treino ou fisio com qualquer LLM

Cole o prompt abaixo em qualquer LLM (ChatGPT, Claude, Gemini…), descreva seu
treino ou protocolo de fisioterapia, e ele devolve o JSON pronto para colar na
tela de Importar do app.

````text
Você vai gerar um treino no formato JSON do app Tap Next. Responda APENAS com o
JSON, sem texto ao redor, sem comentários e sem cercas de código.

Schema (v1):
- Objeto raiz: { "version": 1, "name": <string>, "exercises": [ ... ] }
  - `version`: sempre o inteiro 1.
  - `name`: nome do treino, string não vazia.
  - `exercises`: array não vazio de exercícios.
- Cada exercício:
  - `name`: string não vazia.
  - `mode`: "reps" (repetições, avança por toque) ou "time" (isometria/tempo,
    avança sozinho). Fisioterapia e isometrias usam "time".
  - `sets`: inteiro > 0 (número de séries).
  - `reps`: inteiro > 0. Obrigatório quando mode = "reps". Omita se "time".
  - `duration`: inteiro > 0, em SEGUNDOS. Obrigatório quando mode = "time".
    Omita se "reps".
  - `weight` (opcional): carga em kg, número ≥ 0 (aceita decimais).
  - `restBetweenSets` (opcional): descanso entre séries, inteiro ≥ 0, em segundos.
  - `restAfterExercise` (opcional): descanso após o exercício, inteiro ≥ 0, segundos.
  - `notes` (opcional): string.

Regras:
- Não invente campos fora dessa lista.
- Todos os tempos e descansos são em segundos.
- Nunca use "reps" e "duration" no mesmo exercício.

Exemplo válido:
{"version":1,"name":"Pernas A","exercises":[{"name":"Agachamento","mode":"reps","sets":3,"reps":10,"weight":60,"restBetweenSets":90},{"name":"Prancha","mode":"time","sets":3,"duration":30,"restBetweenSets":15}]}

Meu treino/fisio: <descreva aqui — exercícios, séries, reps ou tempo, cargas,
descansos>
````

## Arquitetura

| Componente | Tecnologia |
|---|---|
| App | React Native Web via Expo (TypeScript) |
| Distribuição | PWA — hospedagem estática + manifest + service worker |
| Motor de sessão | TypeScript puro, especificado por fixtures JSON executáveis |
| Persistência | Armazenamento local do browser (JSON), snapshot versionado de retomada |

Veja os [registros de decisão de arquitetura](docs/adr/) — o pivô web é o
[ADR 0007](docs/adr/0007-pivo-para-pwa-web.md).

## Layout do repositório

```
tap-next/
├── src/
│   ├── engine/           # motor de sessão (TS puro)
│   ├── domain/           # tipos + validação do schema de treino
│   ├── data/             # repositórios sobre localStorage, export
│   ├── screens/          # telas RN-Web
│   ├── services/         # alerts (som/vibração), wake lock, PWA
│   ├── session/          # SessionProvider
│   ├── ui/               # design system
│   └── i18n/             # en + pt-BR
├── public/               # manifest, service worker, ícones PWA
├── fixtures/engine/      # espec executável do motor
└── docs/                 # PRD, SPEC, ADRs, protótipo
```

## Estratégia de testes

| Camada | Ferramenta |
|---|---|
| Motor, validação de schema, dados, serviços | Jest |
| Comportamento do motor | Fixtures em `fixtures/engine/` (espec executável) |
| End-to-end (web) | Backlog (Playwright) |

## Como rodar

```bash
npm install

npm run typecheck   # TypeScript
npm test            # Jest — motor, domínio, dados, serviços

npm run web         # dev server no browser
```

### Deploy

```bash
npm run build                    # site estático em dist/
```

Hospede `dist/` em qualquer host estático (GitHub Pages, Vercel, Netlify…).
O service worker e o manifest saem de `public/` — depois da primeira visita o
app funciona 100% offline e pode ser adicionado à tela de início.

## Documentação

- [PRD — requisitos de produto](docs/PRD.md)
- [SPEC — especificação técnica](docs/SPEC.md)
- [ADRs — registros de decisão de arquitetura](docs/adr/)
- [Guia de contribuição](CONTRIBUTING.md)

## Licença

[MIT](LICENSE)
