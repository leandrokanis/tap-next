# Tap Next — PRD (Product Requirements Document)

| | |
|---|---|
| Produto | Tap Next |
| Versão do documento | 1.0 — 2026-07-05 |
| Status | Aprovado (decisões fechadas em entrevista de descoberta) |
| Documentos irmãos | [SPEC.md](SPEC.md) (técnico) · [ADRs](adr/) |

## 1. Visão

Quem treina musculação ou faz fisioterapia passa a sessão inteira fazendo
microgerência: lembrar qual exercício vem agora, cronometrar descanso no
relógio da parede, contar séries de cabeça, anotar carga num caderno. O Tap
Next assume essa gerência: ele **conduz** a sessão fase a fase — execução,
descanso, execução — cronometra o que tem tempo, avisa com som e vibração, e
pede do usuário exatamente **um toque** quando só o usuário sabe que a série
acabou.

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

- **RF-01** — Exibir fase atual: nome do exercício, série X de Y, prescrição
  (reps · kg) e cronômetro da fase.
- **RF-02** — Fase com tempo definido (descanso ou exercício `mode: time`):
  contagem regressiva com avanço automático ao zerar + som (iPhone) /
  háptico e som (Watch).
- **RF-03** — Fase por repetições (`mode: reps`): avanço manual pelo botão
  **Próximo**, grande e com alvo de toque generoso.
- **RF-04** — "Próximo" durante fase cronometrada pula a fase (encurta
  descanso, encerra isometria antes).
- **RF-05** — Pausar, retomar e encerrar disponíveis a qualquer momento.
- **RF-06** — Registro por série durante o descanso: valores pré-preenchidos
  com o prescrito, editáveis (steppers no iPhone, Digital Crown no Watch);
  sem edição, o prescrito é gravado como realizado.
- **RF-07** — Encerrar no meio oferece *Salvar e sair* (histórico com status
  `parcial`) ou *Descartar*.
- **RF-08** — Estado da sessão persistido a cada transição de fase; após
  crash/morte do processo, oferecer retomada de onde parou.

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

1. Usuário escolhe "Pernas A" (no iPhone ou no Watch) e toca **Iniciar**.
2. Tela mostra "Agachamento — série 1/3 — 10 reps · 60 kg", cronômetro
   progressivo rodando.
3. Terminou a série → toca **Próximo**. Descanso de 90 s começa
   imediatamente; a série 1 aparece pré-preenchida (10 · 60), editável.
4. Descanso zera → som/vibração → volta sozinho para "série 2/3".
5. Repete até a última série do último exercício → tela de resumo → sessão
   salva no histórico (e no Health, se feita no Watch).
6. Se feita no Watch: ao reconectar com o iPhone, a sessão aparece no
   histórico do telefone sem qualquer ação do usuário.

## 7. Métricas de sucesso

- Uma sessão completa exige **zero interações além do Próximo** (e de ajustes
  voluntários de carga).
- Sessão no Watch conclui e sincroniza **sem tocar no iPhone**.
- Zero sessões perdidas em interrupção (crash/bateria) — sempre há registro
  parcial ou oferta de retomada.
- Suítes Jest e XCTest passam com as **mesmas fixtures** de motor.

## 8. Escopo

### v1 (este PRD)

- [ ] Motor de sessão TS + fixtures compartilhadas
- [ ] Domínio: schema do treino + validação com erros posicionados
- [ ] iPhone: lista de treinos, importar (colar JSON), exportar
- [ ] iPhone: tela de sessão (fases, Próximo, pausa, registro no descanso)
- [ ] iPhone: histórico (lista, detalhe, edição, status parcial)
- [ ] Persistência SQLite + retomada pós-crash
- [ ] Watch: app SwiftUI standalone + motor Swift + HKWorkoutSession
- [ ] Sync WatchConnectivity (treinos ida, sessões volta)
- [ ] Alerta sonoro com iPhone em segundo plano (notificação local)
- [ ] i18n pt-BR + en
- [ ] E2E Maestro + CI (Linux: lint/Jest · macOS: XCTest/build/Maestro)

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
| Registro por série quebrar o fluxo de um toque | Registro acontece dentro do descanso, pré-preenchido; caminho feliz permanece um toque |
