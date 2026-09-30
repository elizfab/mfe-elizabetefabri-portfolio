# 07 — Comandos, build e deploy

[← Índice](./README.md)

## Pré-requisitos

- Node.js 22 e npm 10
- Na primeira vez: `npm install` na raiz. O `.npmrc` já aplica `legacy-peer-deps`.

## Desenvolvimento

| Comando | O que faz |
| --- | --- |
| `npm start` | Sobe shell + todos os remotes (4200–4203). Abra `http://localhost:4200`. |
| `npm run start:shell` | Só o shell. As seções dos remotes desligados mostram "Seção indisponível". |
| `npm run start:<remote>` | Só um remote, standalone (ex.: `start:about` → `localhost:4202`). |
| `npx nx run-many -t serve -p shell about` | Shell + remotes escolhidos (o jeito mais rápido de trabalhar numa seção). |
| `npx nx serve <app> --configuration=production` | Serve com a build de produção (para testar otimizações). |

O dev server recompila ao salvar. Mudou um remote? Basta recarregar o shell: ele busca o `remoteEntry.js` novo.

## Qualidade

| Comando | O que faz |
| --- | --- |
| `npm test` | Testes (Vitest) de todos os projetos. |
| `npx nx test <projeto>` | Testes de um projeto (`shell`, `projects`, `shared-data`...). |
| `npm run lint` | ESLint + regras de fronteira em todos os projetos. |
| `npx nx affected -t lint test build` | Só nos projetos afetados pelas mudanças em relação à `main`. |
| `npm run graph` | Abre o grafo de dependências no navegador. |
| `npx nx show project <projeto>` | Lista as tarefas e a configuração de um projeto. |
| `npx nx reset` | Limpa o cache do Nx (use se algo parecer "preso"). |

## Build

```bash
npm run build                 # todos os apps
npx nx build projects         # um app
npx nx affected -t build      # só o que mudou
```

Saída em `dist/apps/<app>/`. Cada pasta é um **site estático independente**; nos remotes, com o
`remoteEntry.js` na raiz.

O cache do Nx reaproveita builds que não mudaram (a segunda execução é instantânea).

## Deploy

### Princípios

1. **Um deploy por app**: o shell e cada remote são publicados em URLs próprias. Exemplo:

   | App | URL de produção (sugestão) |
   | --- | --- |
   | shell | `https://portfolio.elizabetesousafabri.com.br` |
   | projects | `https://mfe-projects.elizabetesousafabri.com.br` |
   | about | `https://mfe-about.elizabetesousafabri.com.br` |
   | contact | `https://mfe-contact.elizabetesousafabri.com.br` |

2. **O manifesto de produção** aponta para essas URLs. O `mf.manifest.json` do repositório é o de
   **desenvolvimento** (localhost). No deploy do shell, sobrescreva o arquivo no `dist` antes de publicar:

   ```bash
   npx nx build shell
   cat > dist/apps/shell/mf.manifest.json <<'EOF'
   {
     "projects": "https://mfe-projects.elizabetesousafabri.com.br/remoteEntry.js",
     "about": "https://mfe-about.elizabetesousafabri.com.br/remoteEntry.js",
     "contact": "https://mfe-contact.elizabetesousafabri.com.br/remoteEntry.js"
   }
   EOF
   ```

   Outra opção é versionar um `mf.manifest.prod.json` e copiá-lo no passo de deploy. Como o manifesto é lido
   em runtime, dá para trocar a URL de um remote **sem rebuildar o shell**.

3. **CORS nos remotes**: o shell (outra origem) baixa o `remoteEntry.js` e os chunks. Os remotes precisam
   responder com `Access-Control-Allow-Origin` (o domínio do shell, ou `*`).

4. **Cache**: `remoteEntry.js` e `mf.manifest.json` **não têm hash no nome**. Configure
   `Cache-Control: no-cache` para eles, senão o navegador pode continuar usando a versão antiga. Os demais
   `.js`/`.css` têm hash e podem ter cache longo.

5. **SPA fallback no shell**: qualquer rota (`/projetos`, `/sobre`...) deve servir o `index.html` do shell.

### Exemplo: Vercel (um projeto Vercel por app)

| Configuração | shell | remote (ex.: projects) |
| --- | --- | --- |
| Root directory | raiz do monorepo | raiz do monorepo |
| Build command | `npx nx build shell && cp deploy/mf.manifest.prod.json dist/apps/shell/mf.manifest.json` | `npx nx build projects` |
| Output directory | `dist/apps/shell` | `dist/apps/projects` |
| Install command | `npm ci` | `npm ci` |

`vercel.json` de um remote (headers):

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }] },
    { "source": "/remoteEntry.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

`vercel.json` do shell (SPA + manifesto sem cache):

```json
{
  "rewrites": [{ "source": "/((?!.*\\.).*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/mf.manifest.json", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

> Na Vercel, use a opção "Ignored Build Step" com `npx nx-ignore <app>` (ou
> `npx nx show projects --affected | grep -qx <app>`) para que um push só redeploye os apps afetados.

### Ordem segura de deploy

| Mudança | O que publicar |
| --- | --- |
| Só código de um remote | Só esse remote |
| URL de um remote | Só o manifesto do shell |
| Layout/menu/rotas do shell | Só o shell |
| Remote novo | 1) o remote, 2) o shell (manifesto + rota) |
| Lib compartilhada (`packages/shared/*`) | Shell + todos os remotes afetados (`nx affected`) |
| Versão de Angular ou outra dependência compartilhada | **Todos** os apps, juntos |

## CI (`.github/workflows/ci.yml`)

Em cada push em `main`, `develop` e `feature/**`: `npm ci` →
`npx nx run-many -t lint test build` (inclui os testes das regras de nomenclatura, projeto `git-rules`). O cache do Nx mantém a execução rápida. Os demais workflows (PR
automático, validação de branch, Danger) estão em [09 — Fluxo Git](./09-fluxo-git.md#workflows-githubworkflows).
