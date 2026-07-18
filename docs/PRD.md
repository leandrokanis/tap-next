# Tap Next — PRD (Product Requirements Document)

| | |
|---|---|
| Produto | Tap Next |
| Versão do documento | 3.0 — 2026-07-18 |
| Status | Aprovado (pivô web — ADR 0007; protótipo v2.1) |
| Documentos irmãos | [SPEC.md](SPEC.md) (técnico) · [ADRs](adr/) · [Protótipo v2.1](design/tap-next-prototipo-v2.1.dc.html) |

## 1. Visão

Quem treina musculação ou faz fisioterapia passa a sessão inteira fazendo
microgerência: lembrar qual exercício vem agora, cronometrar descanso no
relógio da parede, contar séries de cabeça, anotar carga num caderno. O Tap
Next assume essa gerência: ele **conduz** a sessão em três momentos —
preparação, execução, descanso — cronometra o que tem tempo, avisa com som e
vibração, e pede do usuário **um toque** para avançar: **Iniciar** quando está
pronto para a série, **Próximo** quando a termina. O app nunca começa um
exercício sozinho — é o usuário que decide quando está pronto.

É um **app web instalável (PWA)**: abre por URL em qualquer aparelho com
browser, adiciona-se à tela de início e funciona **offline** na academia.
Open source e sem conta: os treinos entram como JSON, o histórico sai como
JSON, e nada depende de servidor (ADR 0007 — o app nativo iOS/Watch foi
descontinuado pela inviabilidade de distribuição).

## 2. Público-alvo

- **Praticante de musculação** — segue planilha com séries, repetições e
  carga; quer descansos cronometrados e registro do que realmente levantou.
- **Paciente de fisioterapia** — protocolos com isometrias e tempos rígidos
  (ex.: 3×30 s de prancha com 15 s de pausa); aderência parcial importa e
  precisa ficar registrada.
- Ambos usam **o celular que já têm** — sem loja de aplicativos, sem
  instalação além de "Adicionar à tela de início".

## 3. Objetivos

1. Conduzir uma sessão do primeiro exercício ao último sem que o usuário
   precise pensar "o que vem agora?".
2. Custo de interação mínimo: o caminho feliz de uma sessão é tocar
   **Iniciar** em cada preparação e **Próximo** ao fim de cada série por
   repetições.
3. Distribuição sem atrito: usar = abrir uma URL; instalar = adicionar à
   tela de início; treinar = funciona sem sinal.
4. Nenhum dado de treino perdido: crash, bateria ou desistência no meio geram
   registro parcial recuperável.
5. Código exemplar como projeto open source: motor puro e testado, decisões
   documentadas, contribuição fácil.

### Não-objetivos (v3)

- Criar/editar treinos por interface gráfica (entrada é JSON).
- Circuitos, supersets, pirâmides (schema v2).
- Planos de progressão, sugestões de carga, IA.
- Apps nativos (iOS, Android, Watch, Wear) e lojas de aplicativo.
- Notificações (locais ou push).
- Contas, nuvem, social.

## 4. Requisitos funcionais

### Anatomia da sessão

A sessão tem **três momentos** — **Preparação → Execução → Descanso** — que se
repetem até a última série, seguidos do **Resumo**. Todas as telas de sessão
compartilham a mesma estrutura fixa, de cima para baixo: cabeçalho da sessão
(cronômetro total, pausar, encerrar), barra de progresso segmentada (um
segmento por exercício), rótulo do momento, nome do exercício, indicador
gráfico de séries, **palco central** (única zona que muda entre momentos),
barra "A SEGUIR" e botão principal. Objetivo: reconhecimento imediato — o
layout não muda entre fases, só o palco.

### Sessão

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
  automático ao zerar + som e vibração; ao zerar entra no descanso. Um botão
  secundário **Encerrar antes** encerra a isometria antes do tempo e leva ao
  descanso.
- **RF-02b** — **Descanso**: contagem regressiva em destaque, **sem edição de
  valores**; ao zerar sinaliza (som/vibração) e **abre a Preparação da
  próxima série automaticamente** (RF-19). O que nunca acontece sozinho é
  **iniciar exercício** — isso continua exigindo o toque em **Iniciar**. O
  tempo excedido após o zero é medido e exibido na Preparação como
  **overtime**.
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
  tempo), editável por **rolagem**. O ajuste vale para a série que está por
  vir — **toda série é ajustável, inclusive a primeira** de cada exercício.
  Sem ajuste, o prescrito é o que vale. O descanso mostra a confirmação do
  registro ("Série N gravada — reps · carga").
- **RF-07** — Encerrar no meio oferece *Salvar e sair* (histórico com status
  `parcial`) ou *Descartar*.
- **RF-08** — Estado da sessão persistido a cada transição de fase; após
  crash/refresh/fechamento, oferecer retomada de onde parou.
- **RF-17** — Ao tocar **Iniciar** numa série de tempo (`mode: time`), uma
  **contagem de entrada de 3 segundos** (3 → 2 → 1 → vai) no palco evita o
  início brusco. A contagem sinaliza a cada segundo e um sinal distinto marca
  o "vai". Os 3 s contam na duração da sessão, mas **não contam no tempo da
  série**. Séries por repetições não têm contagem de entrada.
- **RF-18** — **Sons diferenciados por evento**: cada momento da sessão tem
  seu próprio som — contagem de entrada, início do exercício, fim de
  isometria, início do descanso, fim do descanso (abertura da Preparação) e
  sessão concluída — para o usuário reconhecer o que aconteceu sem olhar a
  tela. Vibração acompanha onde o aparelho suportar.
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

### App instalável e offline (PWA)

- **RF-22** — O app é **instalável** ("Adicionar à tela de início"): abre em
  janela própria, tela cheia, com o ícone e o tema do produto; depois do
  primeiro acesso, **funciona inteiro offline** — treinos, sessão, histórico
  e export.
- **RF-23** — Durante uma sessão ativa, a **tela não apaga** (bloqueio de
  descanso de tela); ao concluir, salvar parcial ou descartar, o bloqueio é
  liberado. Em aparelhos sem suporte, a sessão funciona normalmente sem o
  recurso.

### Treinos e histórico

- **RF-12** — Listar treinos e escolher qual iniciar.
- **RF-13** — Importar treino **sem campo de edição**: um único botão
  "Colar da área de transferência", pré-visualização somente leitura do JSON
  com **erro destacado inline** (campo, linha e coluna) e importação
  desabilitada enquanto houver erro.
- **RF-14** — Exportar treinos e histórico completos em JSON.
- **RF-15** — Histórico por sessão: treino, data, duração, status
  (completa/parcial) e séries feitas (reps · kg reais).
- **RF-16** — Consultar e editar histórico.

## 5. Requisitos não-funcionais

- **RNF-01 Offline-first** — nenhuma função depende de rede após o primeiro
  load; dados vivem no armazenamento local do browser.
- **RNF-02 Precisão** — cronômetros baseados em relógio absoluto (timestamps),
  não em ticks acumulados; pausas não distorcem a duração registrada; voltar
  de aba/tela suspensa recalcula tudo corretamente. A **duração da sessão é
  relógio de parede** (início → fim, menos pausas): tempo em Preparação,
  overtime e contagem de entrada contam; o **tempo da série** (`mode: time`)
  exclui contagem de entrada e preparação.
- **RNF-03 Usabilidade em treino** — alvos de toque grandes, alto contraste,
  legível a um braço de distância com as mãos suadas.
- **RNF-04 i18n** — pt-BR e en desde a v1, seguindo o idioma do sistema.
- **RNF-05 Qualidade OSS** — licença MIT; motor de sessão puro (sem
  dependência de UI) com testes unitários; fixtures em `fixtures/engine/`
  como especificação executável do motor; ADRs para decisões estruturais.
- **RNF-06 Privacidade** — dados só no aparelho; nada de telemetria; o export
  JSON garante que o dado é do usuário mesmo se o browser limpar o storage.
- **RNF-07 Direção visual** — dark permanente, alto contraste, números
  tabulares gigantes. Azul `#4DA3FF` = acento/ação; âmbar `#FFB020`
  **exclusivo** de overtime/parcial; verde `#4ECB71` = completa; vermelho
  `#FF5A3C` = erro/descartar. Fundo `#0B0D11`, cartões `#141820`. Tipografia
  Archivo (display/UI) + IBM Plex Mono (rótulos e dados). Alvos de toque
  ≥ 44 px; botão principal com 88 px. Ícone: conceito 2c — chevron duplo
  sobre `#0B0D11`.

## 6. Fluxo principal (caminho feliz)

1. Usuário abre o Tap Next (instalado na tela de início), escolhe
   "Pernas A"; a tela lista os exercícios do treino; ele toca **Iniciar**.
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
   séries, kg total, ajustes em azul) → **Concluir** salva no histórico.
7. Tudo isso **sem sinal de rede** — a academia não precisa de Wi-Fi.

## 7. Métricas de sucesso

- Uma sessão completa exige **apenas os toques de avanço** — **Iniciar** em
  cada Preparação e **Próximo** ao fim de cada série por repetições — mais
  ajustes voluntários de carga. Nenhuma outra interação obrigatória.
- Sessão inteira funciona **offline** e com a tela sempre visível.
- Zero sessões perdidas em interrupção (crash/refresh/bateria) — sempre há
  registro parcial ou oferta de retomada.
- Suíte Jest passa com as fixtures do motor como espec executável.

## 8. Escopo

### v1–v2 (entregues como app nativo — descontinuado, ADR 0007)

Motor de sessão + fixtures, domínio/validação, telas (lista, importação,
sessão Preparação-first, histórico, resumo), persistência com retomada
pós-crash, i18n pt-BR/en — tudo isso **sobrevive no web**. App Watch, motor
Swift, sync e HealthKit foram removidos.

### v3.0 (este PRD — pivô web)

- [x] App 100% funcional no browser (RN-Web)
- [x] PWA instalável: manifest + service worker, offline após primeiro load
- [x] Tela acesa durante a sessão (wake lock, best-effort)
- [x] Sons por evento via Web Audio + vibração onde houver
- [x] Persistência no armazenamento local do browser
- [x] Remoção do nativo (iOS/Watch/Swift/HealthKit/sync)
- [x] CI só Linux (typecheck + Jest)

### Backlog (pós-v3)

- IndexedDB (se os dados crescerem além do armazenamento atual)
- E2E web (Playwright)
- Importar por arquivo, share/URL
- Edição de treinos por UI
- Circuitos e supersets (schema v2)
- Wrapper para lojas (Capacitor) — só se a distribuição por URL não bastar

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Browser limpar o armazenamento local em desuso prolongado (iOS Safari) | Export JSON a um toque (RF-14) — o dado é do usuário; aviso na doc; IndexedDB/persistent storage no backlog |
| Aba/tela suspensa distorcer cronômetros | Relógio absoluto por timestamps (RNF-02): qualquer retorno recalcula; wake lock (RF-23) evita a suspensão durante a sessão |
| Áudio bloqueado por política de autoplay | O primeiro toque em Iniciar é o gesto que desbloqueia o áudio |
| Wake lock indisponível (browsers antigos) | Sessão funciona sem ele; usuário pode desativar o auto-lock do aparelho |
| Registro por série quebrar o fluxo | Série gravada automática com os valores vigentes; ajuste na Preparação é opcional e pré-preenchido |
| Usuário esquecer de tocar e a Preparação correr indefinidamente | Fim do descanso é sinalizado (som/vibração) e o overtime fica visível em âmbar na Preparação; sessão pausável a qualquer momento |
