# Spec: Experiência de Sessão v2 — count-in, localização, overtime calmo e som por evento

## Contexto

Uso real do app em fisioterapia revelou fricções na experiência de sessão:

- Exercícios de tempo começam **bruscamente** — o cronômetro dispara no toque, sem tempo de posicionar o corpo.
- O praticante não sabe **onde está** dentro do exercício: a barra do topo indica exercícios do treino, não as séries do exercício atual.
- Nas telas de descanso e overtime o **nome do exercício some**, quebrando o contexto.
- O overtime exibe um contador âmbar gigante que transmite **urgência/ansiedade** — o oposto do descanso.
- Um único som (`beep.wav`) toca igual para todos os eventos; o praticante não distingue "fim de isometria" de "fim de descanso" sem olhar a tela.

Este redesenho (v2) ataca essas fricções no iPhone e no Watch. O norte do produto — *sempre saber o que vem a seguir* — vira o herói das telas de descanso/overtime.

## Plataformas

**iPhone e Apple Watch.**

- Comum (via motor compartilhado): count-in, overtime sem contador, exclusão do count-in do tempo de sessão.
- iPhone: paleta de sons sintetizada (um som por evento) + redesenho das telas de sessão.
- Watch: hápticos distintos por evento (no lugar da paleta de sons) + mesmos ajustes de tela (nome do exercício, overtime sem contador).

## Requisitos funcionais

### P1 — Essencial

- RF01 — **Count-in de 3 s** antes de **toda** série de tempo (`mode: time`), inclusive após descanso e na primeira série da sessão: contagem 3 → 2 → 1 → vai, e só então o cronômetro da série começa.
- RF02 — Cada segundo do count-in emite um sinal sonoro (tick); o "vai" tem som **distinto** do tick. No Watch, hápticos equivalentes.
- RF03 — O tempo do count-in **não conta** na duração da sessão (nem na exibida, nem na registrada no histórico) — é tempo de preparação, análogo a pausa.
- RF04 — Tocar o avanço manual durante o count-in encerra a preparação e inicia a série imediatamente. Pausar durante o count-in congela a contagem.
- RF05 — A barra de progresso do topo representa as **séries do exercício atual** (um segmento por série, a atual em destaque). A posição no treino aparece só como rótulo `EXERCÍCIO X DE Y`.
- RF06 — O **nome do exercício** permanece visível nas telas de descanso e de overtime.
- RF07 — **Overtime sem contador visível**: ao zerar o descanso, a tela não exibe tempo extra. O card **A SEGUIR** (exercício · série · reps · kg) é o elemento de maior destaque, com o CTA de iniciar logo abaixo. O motor continua contando o overtime internamente e sinaliza ao zerar (som/háptico), como hoje.
- RF08 — **Paleta de sons por evento** (iPhone): count-in tick, "vai", fim de isometria, início de descanso, fim de descanso, sessão concluída — seis sons próprios e reconhecíveis; nenhum par de eventos compartilha o mesmo som. No Watch, hápticos distintos por evento.

### P2 — Importante

- RF09 — O cronômetro de descanso usa **verde de descanso** — cor dedicada, distinta do verde de "série completa".
- RF10 — Remoção dos textos de instrução redundantes: "Toque quando estiver pronto", "Tempo extra além dos X s prescritos", "Avança sozinha ao zerar — som + vibração". Rótulos curtos úteis (ex.: `SEGURE`) permanecem.

## Cenários de uso

### Cenário 1: Série de tempo com count-in

**Fluxo principal**:
1. Praticante está no descanso antes de uma série de prancha (30 s).
2. Toca **Iniciar próximo** → tela entra no count-in: 3 → 2 → 1, um tick por segundo.
3. No "vai", som distinto; o cronômetro regressivo de 30 s começa.
4. Ao zerar, som de fim de isometria; entra no descanso.
5. No histórico, a duração da sessão não inclui os 3 s de preparação de cada série.

**Fluxo alternativo / erro**:
- Praticante já posicionado toca o avanço durante o count-in → série começa na hora.
- Pausa durante o count-in → contagem congela; retomar continua de onde parou.

### Cenário 2: Descanso zera e vira overtime

**Fluxo principal**:
1. Descanso de 90 s corre com cronômetro verde (verde de descanso), nome do exercício visível no topo.
2. Zera → som de fim de descanso (iPhone) / háptico (Watch).
3. Tela muda para overtime: **sem número de tempo extra**; o card A SEGUIR (exercício · série · reps · kg) domina a tela, CTA de iniciar embaixo. Nome do exercício segue visível.
4. Praticante toca o CTA quando pronto → próxima série começa (com count-in, se for de tempo).

**Fluxo alternativo / erro**:
- Praticante ajusta reps/kg do próximo set durante descanso ou overtime → comportamento atual (registro prospectivo) inalterado.

### Cenário 3: Orientação dentro do exercício

**Fluxo principal**:
1. Treino tem 5 exercícios; praticante está no 2º, que tem 4 séries.
2. Topo mostra rótulo `EXERCÍCIO 2 DE 5` e barra com 4 segmentos, o da série atual em destaque.
3. Ao concluir cada série, o segmento correspondente muda para o estado de concluído.

### Cenário 4: Sons distintos por evento (iPhone)

**Fluxo principal**:
1. Durante a sessão, cada evento dispara seu som: tick do count-in, "vai", fim de isometria, início de descanso, fim de descanso, sessão concluída.
2. Praticante distingue os eventos **sem olhar a tela**.

## Impacto no motor de sessão

**Sim — nova fase `leadin`** na máquina de estados (SPEC §3):

- Inserida antes de cada `work` com `mode: time` (duração 3 s, sem registro de série).
- **Auto-avança** para o `work` ao zerar.
- Avanço manual durante o `leadin` pula direto para o `work`.
- Pausa sobrepõe o `leadin` como qualquer fase.
- A duração do `leadin` é **excluída** do tempo de sessão (`sessionElapsed` e duração registrada), análogo ao tempo pausado.

Exige, em lockstep (ADR 0002):
- Novas fixtures em `fixtures/engine/` — auto-avanço do `leadin`, pulo manual, pausa durante `leadin`, exclusão do tempo de sessão — e ajuste das fixtures existentes que envolvem exercícios de tempo.
- Motores TS e Swift refletindo a expansão de fases, o tick e o cálculo do tempo de sessão.
- Ambas as suítes verdes com as mesmas fixtures.

O overtime **não muda no motor** (continua contando e sinalizando ao zerar); muda só a apresentação.

## Critérios de aceite

- [ ] CA01: Toda série de tempo começa com contagem 3 → 2 → 1 → vai; a série só cronometra após o "vai".
- [ ] CA02: A preparação (count-in) não entra na duração da sessão exibida nem na registrada no histórico.
- [ ] CA03: Cada segundo do count-in emite um tick; o "vai" tem som distinto do tick.
- [ ] CA04: Avanço manual durante o count-in inicia a série imediatamente; pausa congela a contagem.
- [ ] CA05: A barra de segmentos do topo reflete as séries do exercício atual (não os exercícios do treino); `EXERCÍCIO X DE Y` indica a posição no treino.
- [ ] CA06: O nome do exercício aparece nas telas de descanso e de overtime.
- [ ] CA07: O cronômetro de descanso é verde, em tom distinto do verde de "série completa".
- [ ] CA08: No overtime não há contador de tempo visível; o próximo exercício/série é o elemento de maior destaque, com o CTA de iniciar.
- [ ] CA09: Cada um dos seis eventos (count-in tick, vai, fim de isometria, início de descanso, fim de descanso, sessão concluída) tem som próprio; nenhum par compartilha o mesmo som.
- [ ] CA10: Os textos de instrução listados foram removidos das telas.
- [ ] CA11: Watch com comportamento equivalente: count-in via motor, overtime sem contador, nome do exercício visível, hápticos distintos por evento.
- [ ] CA12: Suítes TS e Swift verdes com as mesmas fixtures do motor.

## Fora de escopo

- Sons customizáveis pelo usuário (paleta fixa nesta entrega).
- Qualquer mudança em treinos, histórico, import/export.
- Mudança no alerta de segundo plano do iPhone (notificação local continua com som do sistema).

## Dependências

- PRD: RF-17 (count-in) e RF-18 (sons por evento) — a registrar; ajusta a apresentação de RF-01 (localização na série) e RF-02b (overtime sem contador visível).
- ADR 0002 — motor duplicado com fixtures compartilhadas (count-in exige paridade TS/Swift).
- SPEC §3 (máquina de estados — nova fase `leadin`) e §8 (som e alertas) precisarão de atualização na implementação.
