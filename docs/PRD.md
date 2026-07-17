# Tap Next — PRD (Product Requirements Document)

| | |
|---|---|
| Produto | Tap Next |
| Versão do documento | 2.0 — 2026-07-17 |
| Status | Aprovado (protótipo v2.1 + entrevista de 2026-07-17) |
| Documentos irmãos | [SPEC.md](SPEC.md) (técnico) · [ADRs](adr/) · [Protótipo v2.1](design/tap-next-prototipo-v2.1.dc.html) · [Plano da v2.0](prd-v2-plan.md) |

## 1. Visão

Quem treina musculação ou faz fisioterapia passa a sessão inteira fazendo
microgerência: lembrar qual exercício vem agora, cronometrar descanso no
relógio da parede, contar séries de cabeça, anotar carga num caderno. O Tap
Next assume essa gerência: ele **conduz** a sessão em três momentos —
preparação, execução, descanso — cronometra o que tem tempo, avisa com som e
vibração, e pede do usuário **um toque** para avançar: **Iniciar** quando está
pronto para a série, **Próximo** quando a termina. O app nunca começa um
exercício sozinho — é o usuário que decide quando está pronto.

É open source, offline-first e sem conta: os treinos entram como JSON, o
histórico sai como JSON, e nada depende de servidor.

## 2. Público-alvo

- **Praticante de musculação** — segue planilha com séries, repetições e
  carga; quer descansos cronometrados e registro do que realmente levantou.
- **Paciente de fisioterapia** — protocolos com isometrias e tempos rígidos
  (ex.: 3×30 s de prancha com 15 s de pausa); aderência parcial importa e
  precisa ficar registrada.
- **Usuário de Apple Watch** — quer deixar o iPhone no armário e fazer a
  sessão inteira pelo relógio.

## 3. Objetivos

1. Conduzir uma sessão do primeiro exercício ao último sem que o usuário
   precise pensar "o que vem agora?".
2. Custo de interação mínimo: o caminho feliz de uma sessão é tocar
   **Iniciar** em cada preparação e **Próximo** ao fim de cada série por
   repetições.
3. Sessão 100% funcional no Apple Watch sem iPhone por perto.
4. Nenhum dado de treino perdido: crash, bateria ou desistência no meio geram
   registro parcial recuperável.
5. Código exemplar como projeto open source: motor puro e testado, decisões
   documentadas, contribuição fácil.

### Não-objetivos (v1)

- Criar/editar treinos por interface gráfica (entrada é JSON).
- Circuitos, supersets, pirâmides (schema v2).
- Planos de progressão, sugestões de carga, IA.
- Android / Wear OS.
- Contas, nuvem, social.

## 4. Requisitos funcionais

### Anatomia da sessão (iPhone e Watch)

A sessão tem **três momentos** — **Preparação → Execução → Descanso** — que se
repetem até a última série, seguidos do **Resumo**. Todas as telas de sessão
compartilham a mesma estrutura fixa, de cima para baixo: cabeçalho da sessão
(cronômetro total, pausar, encerrar), barra de progresso segmentada (um
segmento por exercício), rótulo do momento, nome do exercício, indicador
gráfico de séries, **palco central** (única zona que muda entre momentos),
barra "A SEGUIR" e botão principal. Objetivo: reconhecimento imediato — o
layout não muda entre fases, só o palco.

### Sessão (iPhone e Watch)

- **RF-00** — Antes de iniciar, mostrar a **lista de exercícios do treino**
  (nome, séries × reps/tempo, carga) para o usuário saber o que vai enfrentar;
  **Iniciar** parte dessa tela.
- **RF-01** — O progresso é **gráfico, sem texto**: a posição no treino
  aparece na barra segmentada do topo (preenchido = exercício concluído ou em
  andamento) e a posição nas séries nos **pontos** (cheio azul = feita, cheio
  branco = atual, vazado = por vir) — sem "exercício X de Y" nem "série X de
  Y" por extenso. A prescrição vigente (reps · carga ou tempo) fica visível ao
  lado dos pontos, e **o que vem a seguir** é sempre explícito na barra
  "A SEGUIR" (no descanso, "DEPOIS" antecipa dois passos).
- **RF-02** — Isometria (`mode: time`): contagem regressiva com avanço
  automático ao zerar + som (iPhone) / háptico e som (Watch); ao zerar entra
  no descanso. Um botão secundário **Encerrar antes** encerra a isometria
  antes do tempo e leva ao descanso.
- **RF-02b** — **Descanso**: contagem regressiva em destaque, **sem edição de
  valores**; ao zerar sinaliza (som/iPhone, háptico+som/Watch) e **abre a
  Preparação da próxima série automaticamente** (RF-19). O que nunca acontece
  sozinho é **iniciar exercício** — isso continua exigindo o toque em
  **Iniciar**. O tempo excedido após o zero é medido e exibido na Preparação
  como **overtime**.
- **RF-03** — Fase por repetições (`mode: reps`): avanço manual pelo botão
  **Próximo**, grande e com alvo de toque generoso; ao tocar, entra no
  descanso.
- **RF-04** — **Iniciar próximo** durante o descanso (antes de zerar)
  **corta o descanso e abre a Preparação** da próxima série imediatamente.
- **RF-05** — Pausar, retomar e encerrar disponíveis a qualquer momento no
  cabeçalho da sessão.
- **RF-06** — Registro **prospectivo** na **Preparação** (RF-19): a série
  recém-feita é gravada automaticamente com os valores vigentes; a Preparação
  exibe a série que vem pré-preenchida com o prescrito (reps · carga ou
  tempo), editável por **rolagem** (picker no iPhone, Digital Crown no
  Watch). O ajuste vale para a série que está por vir — **toda série é
  ajustável, inclusive a primeira** de cada exercício. Sem ajuste, o prescrito
  é o que vale. O descanso mostra a confirmação do registro ("Série N gravada
  — reps · carga").
- **RF-07** — Encerrar no meio oferece *Salvar e sair* (histórico com status
  `parcial`) ou *Descartar*.
- **RF-08** — Estado da sessão persistido a cada transição de fase; após
  crash/morte do processo, oferecer retomada de onde parou.
- **RF-17** — Ao tocar **Iniciar** numa série de tempo (`mode: time`), uma
  **contagem de entrada de 3 segundos** (3 → 2 → 1 → vai) no palco evita o
  início brusco. A contagem sinaliza a cada segundo e um sinal distinto marca
  o "vai". Os 3 s contam na duração da sessão, mas **não contam no tempo da
  série**. Séries por repetições não têm contagem de entrada.
- **RF-18** — **Sons diferenciados por evento**: cada momento da sessão tem
  seu próprio som — contagem de entrada, início do exercício, fim de
  isometria, início do descanso, fim do descanso (abertura da Preparação) e
  sessão concluída — para o usuário reconhecer o que aconteceu sem olhar a
  tela.
- **RF-19** — **Preparação**: antes de **cada série** (inclusive a primeira
  de cada exercício), o app exibe a tela de Preparação com o nome do
  exercício, a posição nas séries e os valores da série por vir, editáveis
  por rolagem (RF-06). O usuário confirma com **Iniciar** — nada avança sem
  esse toque. Estado normal: rótulo "Preparação" com "quando estiver pronto".
  Vindo de descanso zerado: o canto do rótulo mostra o **overtime** subindo
  ("+m:ss") em âmbar, mantido até o toque em Iniciar.
- **RF-20** — **Resumo** ao fim da última série: confirmação visual, métricas
  da sessão (duração, séries feitas, carga total), lista por exercício com as
  séries reais (reps · carga), destacando os valores ajustados em relação ao
  prescrito; **Concluir** salva no histórico.

### Apple Watch

- **RF-09** — Sessão roda de forma independente do iPhone, dentro de uma
  `HKWorkoutSession` (app ativo com pulso abaixado, hápticos garantidos).
- **RF-10** — Treino gravado no Apple Health/Fitness (FC, calorias, anéis).
- **RF-11** — Sessões feitas no Watch entram numa fila de envio (outbox) e
  chegam ao histórico do iPhone quando os aparelhos se conectarem.
- **RF-21** — **Paridade total de fluxo**: o Watch espelha os momentos do
  iPhone (Preparação — inclusive em overtime —, Execução por reps, Execução
  por tempo, Descanso) com a mesma anatomia compacta; ajuste de valores pela
  Digital Crown na Preparação.

### Treinos e histórico (iPhone)

- **RF-12** — Listar treinos e escolher qual iniciar (no iPhone e no Watch,
  que recebe a lista por sync).
- **RF-13** — Importar treino **sem campo de edição**: um único botão
  "Colar da área de transferência", pré-visualização somente leitura do JSON
  com **erro destacado inline** (campo, linha e coluna) e importação
  desabilitada enquanto houver erro.
- **RF-14** — Exportar treinos e histórico completos em JSON.
- **RF-15** — Histórico por sessão: treino, data, duração, status
  (completa/parcial), origem (iphone/watch) e séries feitas (reps · kg reais).
- **RF-16** — Consultar e editar histórico no iPhone (o Watch não tem tela de
  histórico).

## 5. Requisitos não-funcionais

- **RNF-01 Offline-first** — nenhuma função depende de rede.
- **RNF-02 Precisão** — cronômetros baseados em relógio absoluto (timestamps),
  não em ticks acumulados; pausas não distorcem a duração registrada. A
  **duração da sessão é relógio de parede** (início → fim, menos pausas):
  tempo em Preparação, overtime e contagem de entrada contam; o **tempo da
  série** (`mode: time`) exclui contagem de entrada e preparação.
- **RNF-03 Usabilidade em treino** — alvos de toque grandes, alto contraste,
  legível a um braço de distância com as mãos suadas.
- **RNF-04 i18n** — pt-BR e en desde a v1, seguindo o idioma do sistema.
- **RNF-05 Qualidade OSS** — licença MIT; motor de sessão puro (sem
  dependência de UI) com testes unitários; paridade TS ↔ Swift garantida por
  fixtures compartilhadas; E2E Maestro; ADRs para decisões estruturais.
- **RNF-06 Privacidade** — dados só no aparelho; HealthKit usado apenas para
  gravar o treino; nada de telemetria.
- **RNF-07 Direção visual** — dark permanente, alto contraste, números
  tabulares gigantes. Azul `#4DA3FF` = acento/ação; âmbar `#FFB020`
  **exclusivo** de overtime/parcial; verde `#4ECB71` = completa; vermelho
  `#FF5A3C` = erro/descartar. Fundo `#0B0D11`, cartões `#141820`. Tipografia
  Archivo (display/UI) + IBM Plex Mono (rótulos e dados). Alvos de toque
  ≥ 44 px; botão principal com 88 px (iPhone) / 52 px (Watch). Ícone do app:
  conceito 2c — chevron duplo sobre `#0B0D11`.

## 6. Fluxo principal (caminho feliz)

1. Usuário escolhe "Pernas A" (no iPhone ou no Watch); a tela lista os
   exercícios do treino; ele toca **Iniciar**.
2. Abre a **Preparação** do Agachamento, série 1: rodas mostram "10 reps ·
   60 kg" (ajustáveis); a barra A SEGUIR mostra o que vem. Ele toca
   **Iniciar** → começa a **Execução** (cronômetro da série rodando).
3. Terminou a série → toca **Próximo**. A série 1 é gravada (10 · 60) e o
   **Descanso** de 90 s começa: anel regressivo grande, linha "✓ Série 1
   gravada · 10 · 60 kg" e barra DEPOIS antecipando o próximo exercício.
4. Descanso zera → som/vibração → abre sozinho a **Preparação** da série 2,
   pré-preenchida; se o usuário demora, o canto mostra "+0:23" em âmbar
   subindo. Quando está pronto, toca **Iniciar** → série 2. (Se quiser
   encurtar o descanso, **Iniciar próximo** durante o descanso abre a
   Preparação na hora.)
5. Série de tempo (Prancha): **Iniciar** dispara 3 → 2 → 1 → vai; a contagem
   da isometria roda e, ao zerar, entra no descanso sozinha.
6. Repete até a última série do último exercício → **Resumo** (duração,
   séries, kg total, ajustes em azul) → **Concluir** salva no histórico (e no
   Health, se feita no Watch).
7. Se feita no Watch: ao reconectar com o iPhone, a sessão aparece no
   histórico do telefone sem qualquer ação do usuário.

## 7. Métricas de sucesso

- Uma sessão completa exige **apenas os toques de avanço** — **Iniciar** em
  cada Preparação e **Próximo** ao fim de cada série por repetições — mais
  ajustes voluntários de carga. Nenhuma outra interação obrigatória.
- Sessão no Watch conclui e sincroniza **sem tocar no iPhone**.
- Zero sessões perdidas em interrupção (crash/bateria) — sempre há registro
  parcial ou oferta de retomada.
- Suítes Jest e XCTest passam com as **mesmas fixtures** de motor.

## 8. Escopo

### v1 (PRD 1.1 — entregue)

- [x] Motor de sessão TS + fixtures compartilhadas
- [x] Domínio: schema do treino + validação com erros posicionados
- [x] iPhone: lista de treinos, importar (colar JSON), exportar
- [x] iPhone: tela de sessão (fases, Próximo, pausa, registro no descanso)
- [x] iPhone: histórico (lista, detalhe, edição, status parcial)
- [x] Persistência SQLite + retomada pós-crash
- [x] Watch: app SwiftUI standalone + motor Swift + HKWorkoutSession
      (fontes prontas; montagem única do target no Xcode: [WATCH_SETUP.md](WATCH_SETUP.md))
- [x] Sync WatchConnectivity (treinos ida, sessões volta)
- [x] Alerta sonoro com iPhone em segundo plano (notificação local)
- [x] i18n pt-BR + en
- [x] E2E Maestro + CI (Linux: typecheck/Jest/swift test · macOS: Maestro
      via workflow manual)

### v2.0 (este PRD — protótipo v2.1)

- [ ] Motor: estado de Preparação antes de toda série, transição automática
      descanso→Preparação, overtime na Preparação, corte de descanso,
      contagem de entrada 3-2-1, duração relógio-de-parede
      (fixtures + TS + Swift em lockstep)
- [ ] iPhone: anatomia única de sessão (palco trocável), telas de Preparação
      e Descanso novas, progresso gráfico, Resumo (RF-20)
- [ ] iPhone: importação paste-only com erro inline (linha/coluna)
- [ ] Watch: paridade das telas de sessão (RF-21), coroa na Preparação
- [ ] Sons por evento atualizados (RF-18)
- [ ] i18n + E2E Maestro das telas novas

### Backlog (pós-v2)

- Circuitos e supersets (schema v2)
- Importar por arquivo, share sheet ("Abrir com Tap Next") e URL
- Edição de treinos por UI
- Histórico resumido no Watch
- Complicação/Smart Stack no watchOS
- Android / Wear OS

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Motores TS e Swift divergirem com o tempo | Fixtures compartilhadas em `fixtures/engine/` rodando nas duas suítes; regra de contribuição: mudou o motor, mudou a fixture, mudou o outro motor ([ADR 0002](adr/0002-motor-duplicado-com-fixtures-compartilhadas.md)) |
| `expo prebuild` sobrescrever o target do Watch | `ios/` versionado; prebuild rodado conscientemente e diff revisado ([ADR 0001](adr/0001-react-native-iphone-swiftui-watch.md)) |
| App do Watch suspenso com pulso abaixado | `HKWorkoutSession` mantém o app vivo ([ADR 0004](adr/0004-hkworkoutsession-no-watch.md)) |
| Conflito de dados iPhone ↔ Watch | Sync append-only com donos claros por tipo de dado ([ADR 0005](adr/0005-sync-append-only-watchconnectivity.md)) |
| Registro por série quebrar o fluxo | Série feita gravada automática com os valores vigentes; o ajuste na Preparação é opcional e pré-preenchido — caminho feliz permanece só nos toques de avanço |
| Usuário esquecer de tocar e a Preparação correr indefinidamente | Fim do descanso é sinalizado (som/háptico) e o overtime fica visível em âmbar na Preparação; sessão pausável a qualquer momento |
| Preparação antes de toda série virar atrito | Um toque único (Iniciar) com valores pré-preenchidos; ajuste é opcional — sem digitação obrigatória |
