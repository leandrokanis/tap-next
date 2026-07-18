# Plano de atualização — PRD v1.1 → v2.0 (Protótipo v2.1)

> Fonte da verdade: [`docs/design/tap-next-prototipo-v2.1.dc.html`](design/tap-next-prototipo-v2.1.dc.html).
> Divergência entre protótipo, PRD e app ⇒ PRD e app se ajustam ao protótipo.
> Decisões abaixo fechadas em entrevista de 2026-07-17.

## 1. Modelo novo da sessão — 3 momentos

A sessão passa a ter **anatomia de tela única** com 3 momentos:
**Preparação → Execução → Descanso** (repete até a última série; depois Resumo).

Estrutura fixa de cima para baixo, em toda fase (iPhone e Watch):

1. Cabeçalho da sessão (cronômetro total, pausar ❚❚, encerrar ✕)
2. Barra de progresso segmentada (1 segmento por exercício)
3. Rótulo do momento (`PREPARAÇÃO` / `EXECUÇÃO` / `DESCANSO`) + info contextual à direita
4. Nome do exercício
5. Pontos de série (● azul = feita · ● branco = atual · ○ vazado = por vir)
6. **Palco central** — única zona que muda por momento
7. Barra "A SEGUIR" (no descanso: "DEPOIS")
8. Botão principal (88 px)

### Máquina de estados (motor)

```
Pré-sessão ─Iniciar→ PREPARAÇÃO(ex1,s1)
PREPARAÇÃO ─Iniciar→ [3-2-1 se mode:time] → EXECUÇÃO
EXECUÇÃO(reps) ─Próximo→ DESCANSO        EXECUÇÃO(time) ─zerou/Encerrar antes→ DESCANSO
DESCANSO ─zerou (auto) OU Iniciar próximo (corta)→ PREPARAÇÃO(próxima série/exercício)
última série do último exercício → RESUMO → fim
```

- **Preparação existe antes de TODA série** (inclusive a 1ª de cada exercício).
- **Descanso zerou ⇒ abre a Preparação sozinho** (com som/vibração). O que nunca
  acontece sozinho é **iniciar exercício** — isso continua exigindo toque (INICIAR).
- **Overtime virou estado da Preparação**: o tempo entre o fim do descanso e o
  INICIAR aparece no canto do rótulo como `+0:23` em âmbar (#FFB020), subindo.
  Não há mais tela/estado de overtime no Descanso.

## 2. Mudanças por requisito

| RF | Mudança |
|---|---|
| RF-01 | Reescrever: progresso **gráfico, sem texto** — some "exercício X de Y" (vira barra segmentada) e "série X de Y" (vira pontos). Prescrição atual segue visível (`12 · 120 kg`) ao lado dos pontos. |
| RF-02 | Mantém (isometria avança sozinha ao zerar → Descanso). Botão na execução por tempo: **ENCERRAR ANTES** (estilo secundário). |
| RF-02b | **Reescrever**: descanso = contagem regressiva em anel, **sem edição**; ao zerar soa/vibra e **abre a Preparação automaticamente**; overtime é medido e exibido **na Preparação** (âmbar). "Nunca inicia exercício sozinho" permanece. |
| RF-03 | Mantém (PRÓXIMO grande na execução por reps). |
| RF-04 | Reescrever: **INICIAR PRÓXIMO durante o descanso corta o descanso e abre a Preparação** (não a execução). Encerrar isometria antes → ENCERRAR ANTES (vai ao Descanso). |
| RF-05 | Mantém (pausar/retomar/encerrar sempre no cabeçalho). |
| RF-06 | **Reescrever**: registro prospectivo migra do Descanso para a **Preparação**. Rodas de rolagem (picker iOS; Digital Crown no Watch) pré-preenchidas com o prescrito; ajuste vale para a série que vem. **Toda série é ajustável, inclusive a 1ª** (cai a exceção "primeira série usa sempre o prescrito"). Sem ajuste ⇒ prescrito. Confirmação "✓ Série N gravada — reps · kg" aparece no Descanso. |
| RF-07/08 | Mantêm. Tela de retomada = modal 2.4 (Retomar / Salvar parcial / Descartar). |
| RF-12 | Mantém. **Botão "+" da lista some na v1** (protótipo será corrigido); importação acessível por outro caminho (rota atual do app). Tab bar Treinos/Histórico conforme 2.1/2.2. |
| RF-13 | Reescrever: importação **sem campo de edição** — botão único "Colar da área de transferência", pré-visualização somente leitura com **erro destacado inline** (campo + linha/coluna) e botão IMPORTAR desabilitado enquanto houver erro. |
| RF-17 | Ajustar: 3-2-1 **só para `mode: time`**, disparado pelo INICIAR da Preparação, mostrado no palco. Os 3 s **contam na duração da sessão** (não contam no tempo da série). |
| RF-18 | Mantém; lista de eventos atualizada: contagem 3-2-1 · início de exercício · fim de isometria · início de descanso · **fim de descanso (= abertura da Preparação)** · sessão concluída. |
| novo RF-19 | **Preparação**: antes de cada série, tela com valores editáveis e INICIAR; overtime âmbar quando veio de descanso zerado; "QUANDO ESTIVER PRONTO" no estado normal. |
| novo RF-20 | **Resumo** (1.6): ✓ + stats (duração · séries · kg total), lista por exercício com séries reais, ajustes destacados em azul, CONCLUIR salva no histórico. (Hoje o fluxo cita resumo mas não há RF.) |

## 3. Tempo e duração (RNF-02)

- Duração da sessão = **relógio de parede** (início→fim, menos pausas), timestamps absolutos.
- Tempo em Preparação (incluindo overtime) e os 3 s do 3-2-1 **contam** na duração.
- Tempo da série (`mode: time`) segue estrito: 3-2-1 e preparação ficam de fora dele.

## 4. Direção visual (nova subseção no PRD)

- Dark permanente, alto contraste, números tabulares gigantes.
- Azul `#4DA3FF` = acento/ação; âmbar `#FFB020` = **exclusivo de overtime/parcial**;
  verde `#4ECB71` = completa; vermelho `#FF5A3C` = erro/descartar.
- Fundo `#0B0D11`, cartões `#141820`, chips `#171B22`.
- Tipografia: **Archivo** (display/UI) + **IBM Plex Mono** (rótulos e dados).
- Alvos de toque ≥ 44 px; botão principal 88 px (iPhone) / 52 px (Watch).
- Ícone do app: conceito **2c** — chevron duplo (branco 30% + azul) sobre `#0B0D11`.

## 5. Apple Watch — paridade total

5 telas espelhando o iPhone: Preparação (coroa ajusta reps/kg), Execução reps,
Execução tempo (anel), Descanso (anel, sem edição, auto-abre Preparação) e
Preparação em overtime (rótulo azul + `+0:17` âmbar). Mesma anatomia compacta:
barra de progresso, rótulo, nome, pontos, palco, linha "A SEGUIR", botão.

## 6. Outras seções do PRD a tocar

- **§6 Fluxo principal**: reescrever caminho feliz com Preparação em todo ciclo
  (Iniciar → Preparação s1 → Execução → Próximo → Descanso → zera/corta →
  Preparação s2 → …).
- **§7 Métricas**: toques do caminho feliz agora são INICIAR (cada Preparação) +
  PRÓXIMO (cada série por reps). Ajustes seguem voluntários.
- **§9 Riscos**: linha do overtime reescrita (overtime visível na Preparação);
  linha "registro por série quebrar o fluxo" atualizada (ajuste na Preparação).
- **Cabeçalho**: versão 2.0 — 2026-07-17, status "Aprovado (protótipo v2.1)".

## 7. Impacto na aplicação (ordem sugerida)

1. **Motor TS + fixtures + motor Swift** (regra de ouro, lockstep):
   novo estado `preparing` (com flag overtime), transição automática
   `resting→preparing` no zero, `skipRest`, 3-2-1 como sub-estado de entrada de
   séries `time`, duração wall-clock.
2. **iPhone**: refatorar tela de sessão para anatomia única (palco trocável);
   telas Preparação/Descanso novas; progresso gráfico; remover overtime da UI de
   descanso; importar paste-only (já feito) + erro inline linha/coluna; resumo.
3. **Watch**: espelhar as 5 telas; coroa na Preparação; remover edição do descanso.
4. **Sons (RF-18)**: mapa evento→som; adicionar evento "abre preparação".
5. **Maestro E2E + i18n** das strings novas (`PREPARAÇÃO`, `A SEGUIR`, `DEPOIS`, …).

## Decisões fechadas (registro)

- Preparação antes de **cada série** (não só por exercício).
- Descanso sem edição; ajustes e overtime moram na Preparação.
- INICIAR PRÓXIMO no descanso → Preparação (corta o descanso).
- Toda série ajustável, inclusive a 1ª.
- "+" some na v1; criar treino por UI segue não-objetivo.
- Duração = relógio de parede; tudo conta (menos pausas).
- iPhone e Watch com paridade total, inclusive Preparação em overtime.
- RF-17 mantido só para séries de tempo.
