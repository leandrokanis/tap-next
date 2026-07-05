# ADR 0004 — HKWorkoutSession para manter a sessão viva no Watch

**Status:** aceito · 2026-07-05

## Contexto

Apps de watchOS são suspensos quando o usuário abaixa o pulso: cronômetros
congelam e hápticos não disparam. Num app cujo núcleo é o cronômetro de fases,
isso é inaceitável. As formas de manter execução são sessão de treino
(HealthKit) ou notificações locais agendadas com o app suspenso.

## Decisão

Rodar toda sessão dentro de uma **`HKWorkoutSession`**
(`.traditionalStrengthTraining`) **gravando o treino no Apple Health**: o app
permanece ativo com o pulso abaixado, o cronômetro é preciso, os hápticos
disparam sempre — e o usuário ganha FC, calorias e anéis do Fitness de brinde.

O histórico do Tap Next permanece independente do HealthKit (nosso registro
próprio, ADR 0005); o Health recebe apenas o treino como atividade.

## Alternativas rejeitadas

- **HKWorkoutSession descartando o workout** — pede a mesma permissão e joga
  fora os benefícios.
- **Notificações locais com app suspenso** — UI congelada até levantar o
  pulso, sem relógio ao vivo; experiência visivelmente inferior.

## Consequências

- Permissão HealthKit pedida no primeiro uso; entitlement no target do Watch.
- Testes do lado Watch mockam HealthKit (protocolo fino sobre a sessão).
