# Tap Next — PRD (Product Requirements Document)

| | |
|---|---|
| Produto | Tap Next |
| Versão do documento | 1.1 — 2026-07-05 |
| Status | Aprovado (decisões fechadas em entrevista de descoberta) |
| Documentos irmãos | [SPEC.md](SPEC.md) (técnico) · [ADRs](adr/) |

## 1. Visão

Quem treina musculação ou faz fisioterapia passa a sessão inteira fazendo
microgerência: lembrar qual exercício vem agora, cronometrar descanso no
relógio da parede, contar séries de cabeça, anotar carga num caderno. O Tap
Next assume essa gerência: ele **conduz** a sessão fase a fase — execução,
descanso, execução — cronometra o que tem tempo, avisa com som e vibração, e
pede do usuário **um toque** para avançar cada fase: um para encerrar a série
e começar o descanso, outro para encerrar o descanso e iniciar o próximo
exercício. O app nunca começa um exercício sozinho — é o usuário que decide
quando está pronto para o próximo.

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
2. Custo de interação mínimo: o caminho feliz de uma sessão é apenas tocar
   "Próximo" ao fim de cada série por repetições.
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

### Sessão (iPhone e Watch)

- **RF-00** — Antes de iniciar, mostrar a **lista de exercícios do treino**
  (nome, séries × reps/tempo, carga) para o usuário saber o que vai enfrentar;
  **Iniciar** parte dessa tela.
- **RF-01** — Exibir fase atual: nome do exercício, série X de Y, prescrição
  (reps · kg) e cronômetro da fase; e **sempre deixar claro o que vem a
  seguir** — o próximo exercício/série, para o usuário antecipar o que fará
  depois.
- **RF-02** — Isometria (`mode: time`): contagem regressiva com avanço
  automático ao zerar + som (iPhone) / háptico e som (Watch); ao zerar entra
  no descanso.
- **RF-02b** — **Descanso**: contagem regressiva; ao zerar **não avança
  sozinho** — sinaliza (som/iPhone, háptico+som/Watch) e **continua contando
  em overtime** (tempo além do prescrito). O app segue no descanso até o
  usuário tocar **Iniciar próximo**; a contagem do próximo exercício só começa
  nesse toque.
- **RF-03** — Fase por repetições (`mode: reps`): avanço manual pelo botão
  **Próximo**, grande e com alvo de toque generoso.
- **RF-04** — **Iniciar próximo** durante o descanso (antes ou depois do zero)
  inicia o próximo exercício imediatamente, encurtando o descanso; **Próximo**
  durante uma isometria a encerra antes.
- **RF-05** — Pausar, retomar e encerrar disponíveis a qualquer momento.
- **RF-06** — Registro **prospectivo** durante o descanso: a série recém-feita
  é gravada automaticamente com o prescrito; o descanso exibe o **próximo**
  set pré-preenchido com o prescrito (reps · kg), editável ali mesmo (steppers
  no iPhone, Digital Crown no Watch). O ajuste vale para o set que está por
  vir — o usuário decide a carga/reps antes de executá-lo, não depois. Sem
  ajuste, o prescrito é o que vale. A primeira série de cada exercício, por não
  ter descanso antes, usa sempre o prescrito.
- **RF-07** — Encerrar no meio oferece *Salvar e sair* (histórico com status
  `parcial`) ou *Descartar*.
- **RF-08** — Estado da sessão persistido a cada transição de fase; após
  crash/morte do processo, oferecer retomada de onde parou.
- **RF-17** — Antes de **cada** série de tempo (`mode: time`), uma **contagem
  de entrada de 3 segundos** (3 → 2 → 1 → vai) evita o início brusco. A
  contagem sinaliza a cada segundo e um sinal distinto marca o "vai"; esse
  tempo de preparação **não conta** na duração da sessão.
- **RF-18** — **Sons diferenciados por evento**: cada momento da sessão tem
  seu próprio som — contagem de entrada, início do exercício, fim de
  isometria, início do descanso, fim do descanso e sessão concluída — para o
  usuário reconhecer o que aconteceu sem olhar a tela.

### Apple Watch

- **RF-09** — Sessão roda de forma independente do iPhone, dentro de uma
  `HKWorkoutSession` (app ativo com pulso abaixado, hápticos garantidos).
- **RF-10** — Treino gravado no Apple Health/Fitness (FC, calorias, anéis).
- **RF-11** — Sessões feitas no Watch entram numa fila de envio (outbox) e
  chegam ao histórico do iPhone quando os aparelhos se conectarem.

### Treinos e histórico (iPhone)

- **RF-12** — Listar treinos e escolher qual iniciar (no iPhone e no Watch,
  que recebe a lista por sync).
- **RF-13** — Importar treino colando JSON, com validação e erros apontando
  campo/posição.
- **RF-14** — Exportar treinos e histórico completos em JSON.
- **RF-15** — Histórico por sessão: treino, data, duração, status
  (completa/parcial), origem (iphone/watch) e séries feitas (reps · kg reais).
- **RF-16** — Consultar e editar histórico no iPhone (o Watch não tem tela de
  histórico).

## 5. Requisitos não-funcionais

- **RNF-01 Offline-first** — nenhuma função depende de rede.
- **RNF-02 Precisão** — cronômetros baseados em relógio absoluto (timestamps),
  não em ticks acumulados; pausas não distorcem a duração registrada.
- **RNF-03 Usabilidade em treino** — alvos de toque grandes, alto contraste,
  legível a um braço de distância com as mãos suadas.
- **RNF-04 i18n** — pt-BR e en desde a v1, seguindo o idioma do sistema.
- **RNF-05 Qualidade OSS** — licença MIT; motor de sessão puro (sem
  dependência de UI) com testes unitários; paridade TS ↔ Swift garantida por
  fixtures compartilhadas; E2E Maestro; ADRs para decisões estruturais.
- **RNF-06 Privacidade** — dados só no aparelho; HealthKit usado apenas para
  gravar o treino; nada de telemetria.

## 6. Fluxo principal (caminho feliz)

1. Usuário escolhe "Pernas A" (no iPhone ou no Watch); a tela lista os
   exercícios do treino; ele toca **Iniciar**.
2. Tela mostra "Agachamento — série 1/3 — 10 reps · 60 kg", cronômetro
   progressivo rodando, e indica o que vem a seguir.
3. Terminou a série → toca **Próximo**. Descanso de 90 s começa
   imediatamente; a série 1 é gravada (10 · 60) e a tela mostra o **próximo**
   set ("série 2/3", 10 · 60) pré-preenchido e editável.
4. Descanso zera → som/vibração; o cronômetro segue contando em overtime e a
   tela aguarda. Quando o usuário está pronto, toca **Iniciar próximo** →
   começa a série 2/3 e seu cronômetro.
5. Repete até a última série do último exercício → tela de resumo → sessão
   salva no histórico (e no Health, se feita no Watch).
6. Se feita no Watch: ao reconectar com o iPhone, a sessão aparece no
   histórico do telefone sem qualquer ação do usuário.

## 7. Métricas de sucesso

- Uma sessão completa exige **apenas os toques de avanço** — Próximo ao fim de
  cada série e Iniciar próximo ao fim de cada descanso — mais ajustes
  voluntários de carga. Nenhuma outra interação obrigatória.
- Sessão no Watch conclui e sincroniza **sem tocar no iPhone**.
- Zero sessões perdidas em interrupção (crash/bateria) — sempre há registro
  parcial ou oferta de retomada.
- Suítes Jest e XCTest passam com as **mesmas fixtures** de motor.

## 8. Escopo

### v1 (este PRD)

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

### Backlog (pós-v1)

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
| Registro por série quebrar o fluxo | Série feita gravada automática com o prescrito; o ajuste no descanso é do próximo set e é opcional — caminho feliz permanece só nos toques de avanço |
| Usuário esquecer de tocar e o descanso correr indefinidamente | Overtime é sinalizado (som/háptico ao zerar) e o tempo extra fica visível; sessão pausável a qualquer momento |
