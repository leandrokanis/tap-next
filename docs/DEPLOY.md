# Deploy — kasparov (CasaOS) + Docker Hub + Cloudflare Tunnel

O app é um site estático servido por nginx num container. O Cloudflare
Tunnel dá o HTTPS — obrigatório para a PWA (service worker, wake lock,
instalação).

## 1. Publicação da imagem (automática)

Todo push na `main` builda e publica `SEU_USUARIO/tap-next:latest`
(amd64 + arm64) via [`.github/workflows/docker.yml`](../.github/workflows/docker.yml).

Configuração única no GitHub (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` | usuário do Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token (hub.docker.com → Account Settings → Security) |

## 2. CasaOS (kasparov)

App Store → **Custom Install**:

| Campo | Valor |
|---|---|
| Image | `SEU_USUARIO/tap-next:latest` |
| Porta | host `8090` → container `80` (TCP) |
| Restart | `unless-stopped` |

Sem volumes — o container é imutável; os dados do usuário vivem no browser.

Teste local: `http://kasparov:8090`.

Atualizar depois de um push: CasaOS → app → ⋯ → *Check for updates* (ou
recriar o container puxando `latest`).

## 3. Cloudflare Tunnel

No Zero Trust (dash.cloudflare.com → Networks → Tunnels), no túnel já
existente do kasparov (ou crie um com o conector `cloudflared` no CasaOS):

- **Public hostname**: `tapnext.SEU_DOMINIO.com`
- **Service**: `http://localhost:8090` (ou `http://IP-do-kasparov:8090` se o
  cloudflared roda em outro container/host)

O Cloudflare entrega `https://tapnext.SEU_DOMINIO.com` com TLS válido.

## 4. iPhone

1. Safari → `https://tapnext.SEU_DOMINIO.com`
2. Compartilhar → **Adicionar à Tela de Início**
3. Abrir pelo ícone: fullscreen, offline após a primeira visita, tela acesa
   durante a sessão.

## Atualizações do app

O service worker versiona o cache (`CACHE` em `public/sw.js`). Ao publicar
uma versão nova: bump da constante → o SW novo assume no próximo load e
descarta o cache antigo. Sem bump, assets novos ainda chegam (cache-first
só congela o que já foi baixado com o mesmo nome; bundles têm hash).
