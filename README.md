# mfe-elizabetefabri-portfolio

Portfólio em **Micro Frontends** com **Angular 22**, **Nx 23** e **Module Federation clássico**
(`@angular-architects/module-federation`, baseado no Webpack 5).

Um app **host** (`shell`) carrega em tempo de execução os **remotes** (`projects`, `about`, `contact`).
Cada remote pode ser atualizado e implantado separadamente, sem rebuild do host.

## Arquitetura

```txt
                    ┌──────────────────────────────┐
                    │  shell (host) · :4200        │
                    │  layout, navegação, Início   │
                    │  public/mf.manifest.json     │
                    └──────┬─────────┬─────────┬───┘
       loadRemoteModule   │         │         │   (runtime, via remoteEntry.js)
                 ┌────────▼──┐ ┌────▼─────┐ ┌─▼─────────┐
                 │ projects  │ │ about    │ │ contact   │
                 │ :4201     │ │ :4202    │ │ :4203     │
                 │ ./Routes  │ │ ./Routes │ │ ./Routes  │
                 └───────────┘ └──────────┘ └───────────┘
                         └──────────┬───────────┘
                         @elizfab/shared/data (lib Nx, singleton compartilhado em runtime)
```

| Projeto        | Tipo   | Porta | Rota no shell | Expõe      |
| -------------- | ------ | ----- | ------------- | ---------- |
| `shell`        | host   | 4200  | `/`           | —          |
| `projects`     | remote | 4201  | `/projetos`   | `./Routes` |
| `about`        | remote | 4202  | `/sobre`      | `./Routes` |
| `contact`      | remote | 4203  | `/contato`    | `./Routes` |
| `shared-data`  | lib    | —     | —             | `@elizfab/shared/data` |

### Como a federação funciona

- **Manifesto dinâmico:** o shell é um *dynamic host*. As URLs dos remotes ficam em
  `apps/shell/public/mf.manifest.json`, lido por `initFederation()` no `main.ts`.
  Para apontar para outro ambiente basta trocar esse JSON no deploy — sem rebuild.
- **Remotes expõem rotas:** cada remote publica `./Routes` (`src/app/remote-entry/entry.routes.ts`),
  e o shell as carrega com `loadRemoteModule({ type: 'manifest', ... })` em `app.routes.ts`.
- **Fallback:** se um remote estiver fora do ar, o shell mostra `RemoteUnavailable` em vez de quebrar.
- **Dependências compartilhadas:** `shareAll({ singleton: true, strictVersion: true })` em cada
  `webpack.config.js` garante uma única instância de Angular/RxJS entre host e remotes.
- **Bootstrap assíncrono:** `main.ts` → `import('./bootstrap')`, exigido pelo Module Federation.
- **Isolamento de domínio:** tags `scope:*` + regra `@nx/enforce-module-boundaries`
  (`eslint.config.mjs`) impedem que um remote importe código de outro. Só `scope:shared` é comum.

## Como executar

```bash
npm install     # .npmrc já define legacy-peer-deps
npm start       # sobe shell + todos os remotes → http://localhost:4200
```

| Comando | O que faz |
| --- | --- |
| `npm run start:<app>` | Sobe um app só (`shell`, `projects`, `about`, `contact`) |
| `npm run build` | Build de todos os apps → `dist/apps/<app>` |
| `npm test` / `npm run lint` | Testes (Vitest) e lint de todos os projetos |
| `npx nx affected -t lint test build` | Só o que mudou |
| `npm run graph` | Grafo de dependências do Nx |

## Estrutura (resumo)

```txt
apps/shell/                  host: layout, menu, Home, fallback, public/mf.manifest.json
apps/<remote>/               remotes: src/app/remote-entry/ é o que o shell carrega (./Routes)
packages/shared/data/        lib Nx: modelos + dados do portfólio (@elizfab/shared/data)
packages/shared/styles/      tema global (design tokens) usado por todos os apps
docs/                        documentação completa
```

## Documentação

A documentação completa está em [`docs/`](./docs/README.md):

1. [Conceitos](./docs/01-conceitos.md): host, remote, manifesto, shared, Nx
2. [Estrutura de pastas](./docs/02-estrutura-de-pastas.md): o que contém cada pasta e arquivo
3. [Shell: o template pai](./docs/03-shell-template-pai.md): como o host carrega os remotes
4. [Anatomia de um remote](./docs/04-anatomia-de-um-remote.md): o contrato que todo micro frontend segue
5. [**Adicionar projetos**](./docs/05-adicionar-projetos.md): vitrine, remote novo ou projeto existente, passo a passo
6. [Libs e estilos compartilhados](./docs/06-libs-e-estilos-compartilhados.md)
7. [Comandos, build e deploy](./docs/07-comandos-build-deploy.md)
8. [Troubleshooting](./docs/08-troubleshooting.md)
9. [Fluxo Git, PRs automáticos e Danger](./docs/09-fluxo-git.md): `feature/<atividade>` → `develop` → `main`
10. [**Integração de projetos existentes**](./docs/10-integracao-projetos-existentes.md): runbook item por item + [painel de prontidão](./docs/integracao/README.md) dos projetos 01–05
11. [Releases e Packages](./docs/11-releases-e-packages.md)

> Alternativa moderna ao Module Federation clássico: **Native Federation**
> (`@angular-architects/native-federation`), com ESM nativo e esbuild, sem Webpack. O modelo
> host/remotes/manifesto é o mesmo, então uma migração futura troca a ferramenta, não a arquitetura.
