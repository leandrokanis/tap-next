# Spec: Fluxo de sessão v2 — Preparação-first

## Contexto

O protótipo v2.1 redesenha a condução da sessão em **três momentos com
anatomia de tela única**: Preparação → Execução → Descanso, repetidos até a
última série, seguidos do Resumo. O praticante ganha: reconhecimento imediato
(layout nunca muda, só o palco central), ajuste de carga/reps **antes** de
executar cada série (inclusive a primeira), descanso sem distração (só o
cronômetro) e overtime visível sem tela extra. O progresso vira 100% gráfico
— o usuário lê a posição no treino de relance, a um braço de distância.

Fonte da verdade: `docs/design/tap-next-prototipo-v2.1.dc.html` + PRD v2.0
(RF-01, RF-02b, RF-04, RF-06, RF-13, RF-17, RF-18, RF-19, RF-20, RF-21,
RNF-02, RNF-07).

## Plataformas

iPhone **e** Apple Watch, com paridade total de fluxo (RF-21). Diferenças:
ajuste por picker de rolagem no iPhone vs Digital Crown no Watch; histórico e
importação só no iPhone; Resumo no Watch é a confirmação nativa da
HKWorkoutSession (sem tela própria nesta entrega).

## Requisitos funcionais

### P1 — Essencial

- RF01: Antes de **cada série** (inclusive a 1ª de cada exercício) o app
  exibe a **Preparação**: nome do exercício, pontos de série, valores da
  série por vir (reps · carga, ou tempo) pré-preenchidos com o prescrito e
  editáveis por rolagem; **Iniciar** é o único gatilho de início de série.
- RF02: Ajuste feito na Preparação vale para a série que vem; sem ajuste,
  vale o prescrito. Ao concluir a série, ela é gravada automaticamente com os
  valores vigentes (registro prospectivo).
- RF03: **Descanso** exibe contagem regressiva em anel, sem edição de
  valores, com a confirmação "Série N gravada — reps · carga" e a barra
  "DEPOIS" antecipando o próximo exercício. Ao zerar: sinal sonoro/háptico e
  **abertura automática da Preparação** da próxima série.
- RF04: **Iniciar próximo** durante o descanso corta o descanso e abre a
  Preparação imediatamente.
- RF05: **Overtime**: tempo entre o fim do descanso e o toque em Iniciar
  aparece na Preparação como "+m:ss" âmbar, subindo. Nenhum exercício começa
  sozinho.
- RF06: Séries de tempo: Iniciar dispara contagem de entrada **3 → 2 → 1 →
  vai** no palco, com sinal a cada segundo e sinal distinto no "vai"; a
  isometria conta regressivamente e ao zerar entra no descanso sozinha;
  **Encerrar antes** (botão secundário) encerra a isometria e vai ao
  descanso. Séries por repetições não têm contagem de entrada.
- RF07: Progresso **gráfico, sem texto**: barra segmentada no topo (um
  segmento por exercício; preenchido = concluído ou em andamento) e pontos de
  série (cheio azul = feita, cheio branco = atual, vazado = por vir), com a
  prescrição vigente ao lado dos pontos. Barra "A SEGUIR" presente em todos
  os momentos.
- RF08: Duração da sessão = relógio de parede (início → fim, menos pausas):
  preparação, overtime e contagem de entrada contam. Tempo da série
  (`mode: time`) exclui contagem de entrada.
- RF09: Paridade Watch: Preparação (inclusive em overtime), Execução por
  reps, Execução por tempo e Descanso espelham o iPhone com a mesma anatomia
  compacta; ajuste pela Digital Crown na Preparação.

### P2 — Importante

- RF10: **Resumo** ao fim da última série (iPhone): confirmação, métricas
  (duração, séries, carga total), lista por exercício com séries reais e
  valores ajustados destacados; **Concluir** salva no histórico.
- RF11: **Importação paste-only**: um único botão "Colar da área de
  transferência"; pré-visualização somente leitura do JSON com erro destacado
  inline (campo, linha e coluna); importação desabilitada enquanto houver
  erro.
- RF12: Sons por evento (RF-18 do PRD): contagem de entrada, início de
  exercício, fim de isometria, início de descanso, fim de descanso (abertura
  da Preparação), sessão concluída — cada um reconhecível sem olhar a tela.

### P3 — Desejável

- RF13: Lista de treinos sem o botão "+" (importação acessível pela rota
  atual); abas Treinos/Histórico conforme protótipo.

## Cenários de uso

### Cenário 1: Sessão completa por repetições

**Fluxo principal**:
1. Usuário toca Iniciar na pré-sessão → Preparação do exercício 1, série 1
   (rodas 10 · 60 kg).
2. Toca Iniciar → Execução (cronômetro da série sobe).
3. Toca Próximo → série gravada (10 · 60); Descanso 90 s em anel.
4. Descanso zera → som/vibração → Preparação da série 2 abre sozinha.
5. Usuário demora 23 s → rótulo mostra "+0:23" âmbar; ajusta kg na roda;
   toca Iniciar → série 2 com o novo valor.
6. Última série do último exercício → Resumo → Concluir → histórico.

**Fluxo alternativo / erro**:
- Usuário toca "Iniciar próximo" aos 60 s de descanso → Preparação abre na
  hora; descanso real registrado é o decorrido.
- Crash no meio → retomada de onde parou (RF-08 do PRD), inclusive se estava
  em Preparação.

### Cenário 2: Isometria (série de tempo)

**Fluxo principal**:
1. Preparação da Prancha (30 s, ajustável).
2. Iniciar → 3 → 2 → 1 (sinal por segundo) → "vai" (sinal distinto) →
   contagem regressiva 30 s.
3. Zera → som/háptico → Descanso (pausa 15 s) → zera → Preparação da
   próxima série.

**Fluxo alternativo**:
- Usuário toca "Encerrar antes" aos 18 s → isometria termina, série gravada
  com o tempo executado, entra no descanso.

### Cenário 3: Importação com erro

1. Usuário toca "Colar da área de transferência".
2. Preview mostra o JSON; `"sets": 0` destacado inline; cartão de erro:
   "exercises[1].sets — deve ser ≥ 1 · linha 8, coluna 21".
3. Botão Importar permanece desabilitado até colar um JSON válido.

## Impacto no motor de sessão

**Sim — muda a máquina de estados.** Novo estado de **preparação** (com
sub-estado/flag de overtime), transição automática descanso→preparação ao
zerar, corte de descanso, contagem de entrada 3-2-1 como sub-estado de
entrada de séries de tempo, gravação da série no fim da execução (não mais no
descanso), semântica de duração relógio-de-parede. Regra de ouro (ADR 0002):
**fixtures em `fixtures/engine/` + motor TS + motor Swift atualizados em
lockstep** — fixtures novas para: preparação→execução, descanso zerado
auto-abrindo preparação, overtime medido na preparação, corte de descanso,
3-2-1 (só `mode: time`), encerramento antecipado de isometria, duração com
preparação incluída, retomada em estado de preparação.

## Critérios de aceite

- [ ] CA01: Nenhuma série começa sem toque em Iniciar; nenhum descanso zerado
      deixa a tela parada no descanso (sempre abre a Preparação).
- [ ] CA02: Ajuste na Preparação altera exatamente a série seguinte gravada;
      sem ajuste, a série é gravada com o prescrito; a 1ª série é ajustável.
- [ ] CA03: Overtime "+m:ss" âmbar aparece só quando o descanso zerou antes
      do Iniciar, e é incluído na duração da sessão.
- [ ] CA04: Em séries de tempo, o 3-2-1 não desconta do tempo da série; o
      tempo da série gravado corresponde ao executado (30 s, ou menos se
      encerrada antes).
- [ ] CA05: Nenhuma tela de sessão exibe "exercício X de Y" ou "série X de Y"
      em texto; barra segmentada e pontos refletem o estado real.
- [ ] CA06: Importação: JSON inválido nunca habilita o Importar; o erro
      aponta campo, linha e coluna corretos.
- [ ] CA07: Resumo lista todas as séries reais e destaca as ajustadas;
      Concluir persiste a sessão no histórico.
- [ ] CA08: Fixtures novas passam idênticas em Jest (TS) e XCTest (Swift).
- [ ] CA09: Sessão no Watch percorre Preparação → Execução → Descanso →
      Preparação com hápticos e coroa, sem iPhone por perto.
- [ ] CA10: Strings novas em pt-BR e en.

## Fora de escopo

- Criar/editar treino por UI (o "+" some da lista).
- Tela de Resumo no Watch (fica a confirmação nativa da workout session).
- Circuitos/supersets, Android/Wear OS.
- Mudanças no formato de export/import de dados (schema do treino inalterado).

## Dependências

- PRD v2.0 (docs/PRD.md) e plano docs/prd-v2-plan.md — aprovados.
- Protótipo v2.1 (docs/design/tap-next-prototipo-v2.1.dc.html) — fonte da verdade visual.
- ADR 0002 (fixtures compartilhadas), ADR 0005 (sync append-only — não muda).
