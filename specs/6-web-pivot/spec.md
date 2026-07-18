# Spec: Pivô para app web (PWA instalável)

## Contexto

Distribuir o app nativo iOS se provou inviável para um projeto pessoal open
source (conta de desenvolvedor, provisioning, fragilidade de builds Xcode).
O produto pivota para **um único app web instalável (PWA), offline-first,
hospedado estaticamente** — o praticante adiciona à tela de início e usa na
academia sem sinal, em qualquer aparelho com browser. O fluxo de sessão v2
(Preparação-first, protótipo v2.1) permanece intacto: muda o veículo, não o
produto.

## Plataformas

**Web (browser mobile e desktop), como PWA instalável.** iPhone nativo e
Apple Watch saem do produto. Não há mais paridade multi-plataforma — o motor
de sessão existe uma única vez (TypeScript).

## Requisitos funcionais

### P1 — Essencial

- RF01: O app completo funciona no browser: lista de treinos, importação
  paste-only, sessão (Preparação → Execução → Descanso → Resumo), histórico
  (lista, detalhe, edição) e exportação JSON.
- RF02: O app é **instalável como PWA**: manifest válido (nome "Tap Next",
  ícone do produto, modo standalone, tema escuro) e service worker que
  pré-cacheia o app — depois do primeiro load, tudo funciona **offline**.
- RF03: Durante uma sessão ativa, a **tela não apaga** (wake lock); ao sair
  da sessão (concluir, salvar parcial, descartar), o bloqueio é liberado.
- RF04: Os **6 sons de evento** (RF-18 do PRD: contagem, início de
  exercício, fim de isometria, início de descanso, fim de descanso, sessão
  concluída) tocam no browser; vibração acompanha onde o aparelho suportar.
- RF05: Dados persistem **localmente no browser** (armazenamento do site) e
  sobrevivem a recarregar a página e fechar/reabrir o app instalado;
  crash/refresh no meio da sessão continua oferecendo retomada (RF-08).
- RF06: Todo o código, build e documentação do nativo saem do repositório:
  projeto Xcode, app do Watch, motor Swift, sync Watch↔iPhone, HealthKit e
  notificações locais. Sem referências vivas em código de produção.

### P2 — Importante

- RF07: Cronômetros continuam corretos ao voltar de aba/tela suspensa —
  recalculados por timestamp (RNF-02), nunca por ticks acumulados.
- RF08: Docs refletem o pivô: PRD 3.0 (visão, plataformas, RFs de Watch
  removidos, backlog atualizado), SPEC reescrita, ADRs 0001/0002/0004/0005
  marcados como substituídos + ADR novo registrando o pivô.
- RF09: CI reduzido ao essencial: typecheck + Jest em Linux; jobs
  macOS/XCTest/Maestro-iOS removidos.

### P3 — Desejável

- RF10: Deploy estático documentado (build web + hospedagem em páginas
  estáticas) no README.

## Cenários de uso

### Cenário 1: Instalar e treinar offline

1. Usuário abre a URL no Safari do iPhone, usa "Adicionar à Tela de Início".
2. Abre o app instalado (fullscreen, dark), importa "Pernas A" colando JSON.
3. No dia seguinte, **sem sinal na academia**, abre o app: treinos e
   histórico presentes; inicia a sessão; tela permanece acesa; sons tocam a
   cada evento.
4. Conclui → Resumo → histórico salvo localmente.

**Fluxo alternativo / erro**:
- Refresh no meio da sessão → modal de retomada (como hoje).
- Browser sem wake lock/vibração → sessão funciona; só perde esses extras.

### Cenário 2: Repositório pós-pivô

1. Contribuidor clona o repo: não há `ios/` nem `watch/`; `npm install`,
   `npm run web` e `npm test` bastam para rodar e testar tudo.
2. Fixtures em `fixtures/engine/` seguem sendo a spec executável do motor.

## Impacto no motor de sessão

**Comportamento: nenhum.** Estrutural: o motor deixa de ser duplicado — a
implementação Swift e os testes XCTest são removidos; as fixtures continuam
rodando no Jest como espec executável do motor TS único. A regra de ouro
passa a ser: mudou o motor ⇒ mudou a fixture.

## Critérios de aceite

- [ ] CA01: `npm run web` serve o app completo; fluxo inteiro (importar →
      sessão → resumo → histórico → export) funciona no browser.
- [ ] CA02: Manifest + service worker presentes; app abre e funciona offline
      após o primeiro load (inclusive fontes e sons).
- [ ] CA03: Wake lock ativo durante sessão e liberado fora dela (verificável
      por inspeção/log; browsers sem suporte não quebram).
- [ ] CA04: Sons dos 6 eventos audíveis no browser; `navigator.vibrate`
      chamado onde existir.
- [ ] CA05: Dados sobrevivem a reload; retomada pós-refresh funciona.
- [ ] CA06: `git grep` sem referências de produção a Swift/Watch/HealthKit/
      WatchConnectivity/expo-sqlite/expo-notifications; `ios/` e `watch/`
      inexistentes.
- [ ] CA07: `npm run typecheck` e `npm test` verdes (fixtures incluídas).
- [ ] CA08: PRD 3.0, SPEC e ADRs atualizados (4 substituídos + 1 novo).
- [ ] CA09: CI só com job Linux (typecheck + Jest) verde.

## Fora de escopo

- IndexedDB (backlog — migrar se os dados crescerem).
- Wrapper Capacitor / lojas de app (backlog).
- Notificações (locais ou push).
- Backend, contas, nuvem (continuam não-objetivos).
- E2E Maestro (era iOS; substituto web fica para depois).

## Dependências

- Fluxo de sessão v2 já em main (#4/#5).
- Protótipo v2.1 segue como fonte visual — telas idênticas no web.
