# ADR 0007 — Pivô para app web (PWA); fim do nativo iOS/Watch

**Data**: 2026-07-18
**Status**: Aceito
**Decisor**: Leandro Alves

## Contexto

Distribuir o app nativo provou-se o maior atrito do projeto: conta paga de
desenvolvedor Apple, provisioning, montagem manual do target do Watch e
builds Xcode frágeis (RN prebuilt × Xcode 26). Para um companion pessoal e
open source, o custo de distribuição superava o valor da plataforma. O
código já rodava no browser via RN-Web (`npm run web`) e a camada de dados
já tinha variantes web.

## Decisão

O Tap Next passa a ser **exclusivamente um app web**: uma **PWA
instalável, offline-first, hospedada estaticamente**, mantendo Expo/RN-Web
como stack. O app iOS nativo e o app Apple Watch (SwiftUI + motor Swift +
sync WatchConnectivity + HealthKit) são removidos do produto e do
repositório. O motor de sessão existe uma única vez, em TypeScript, e as
fixtures de `fixtures/engine/` seguem como sua especificação executável.

Este ADR **substitui**: 0001 (RN iPhone + SwiftUI Watch), 0002 (motor
duplicado com fixtures compartilhadas — permanece só a metade "fixtures
como spec"), 0004 (HKWorkoutSession) e 0005 (sync append-only).

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **PWA com Expo/RN-Web** *(escolhida)* | Zero reescrita (telas/motor/dados sobrevivem); sem loja/conta; offline-first via service worker; um só motor | Sem Watch; wake lock/vibração dependem de suporte do browser; iOS Safari limita PWAs |
| Continuar nativo (TestFlight/sideload) | Watch, HealthKit, notificações plenas | Atrito de distribuição permanente; conta paga; fragilidade de build comprovada |
| Reescrever web puro (Vite+React) | Bundle menor, DOM direto | Semanas reescrevendo telas sem valor novo ao praticante |
| Capacitor/loja | Ícone de loja | Mesmo atrito de distribuição que motivou o pivô |

## Consequências

**Positivas**: distribuição = abrir uma URL; um motor, uma suíte, um CI
(Linux); repo sem toolchain Apple; iteração muito mais rápida.

**Negativas / trade-offs**: perde-se o Apple Watch standalone e o registro
no HealthKit; alertas com tela bloqueada não existem no web — mitigado com
Screen Wake Lock durante a sessão; armazenamento do browser pode ser
apagado pelo sistema em desuso prolongado — mitigado pelo export JSON (o
dado é do usuário). Watch/Wear ficam como possibilidade futura via história
do git.
