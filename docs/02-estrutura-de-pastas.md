# 02 — Estrutura de pastas e arquivos

[← Índice](./README.md)

## Visão geral

```txt
mfe-elizabetefabri-portfolio/
├── apps/                      # Aplicações Angular (1 host + N remotes)
│   ├── shell/                 # HOST — o "template pai"
│   ├── projects/              # REMOTE — lista de projetos
│   ├── about/                 # REMOTE — página Sobre
│   └── contact/               # REMOTE — página Contato
├── packages/                  # Código compartilhado entre os apps
│   ├── danger-rules/          # PACOTE npm @elizfab/danger-rules — regras de PR, padrões de repo, CLI
│   └── shared/
│       ├── data/              # LIB Nx — modelos + dados (também publicada como @elizfab/shared-data)
│       └── styles/            # Tema global (design tokens SCSS) — pasta simples, não é projeto Nx
├── docs/                      # Esta documentação
├── docker/                    # assemble.mjs (monta o site) + nginx.conf da imagem Docker
├── tools/ai-migrations/       # Material gerado pelo Nx (guias de migração); não mexer
├── .github/                   # Workflows (CI, Auto PR, Danger, branch), template de PR, arquivos de IA do Nx
├── dangerfile.ts              # Danger: regras da org (pacote) + regras do MFE (M-xx)
├── elizfab.json               # Identidade do repositório (tipo mfe-host) para os padrões P-xx
├── Dockerfile / .dockerignore # Imagem do portfólio (shell + remotes) publicada no ghcr.io
├── .nvmrc                     # Node 22
├── .vscode/                   # Extensões recomendadas e debug (local: ignorada pelo gitignore global)
├── .agents/ .claude/ .codex/ .cursor/ .gemini/ .opencode/
│                              # Configurações de assistentes de IA geradas pelo Nx (opcionais)
├── nx.json                    # Configuração do Nx
├── package.json               # Dependências ÚNICAS do monorepo + scripts npm
├── tsconfig.base.json         # TS base + aliases de import (@elizfab/...)
├── eslint.config.mjs          # Lint + regras de fronteira entre domínios
├── vitest.config.mts          # Agrega os testes de todos os projetos
├── .npmrc                     # legacy-peer-deps=true
├── .prettierrc / .prettierignore / .editorconfig
├── AGENTS.md / CLAUDE.md / opencode.json   # Instruções do Nx para assistentes de IA
└── README.md                  # Resumo do projeto e links para esta pasta
```

Pastas geradas automaticamente (no `.gitignore`, **nunca edite**): `node_modules/`, `dist/`
(saída dos builds), `.nx/` (cache do Nx), `.angular/` (cache do Angular), `coverage/`, `tmp/`.

---

## Arquivos da raiz

| Arquivo | O que contém | Quando mexer |
| --- | --- | --- |
| `package.json` | **Todas** as dependências do monorepo (um só lugar = versões iguais em todos os apps) e os scripts `start`, `build`, `test`, `lint`, `graph`, `start:<app>`. | Ao instalar libs novas e ao adicionar um remote (incluir no `start` e criar `start:<nome>`). |
| `nx.json` | Configuração do Nx: `namedInputs` (o que invalida o cache), `targetDefaults` (cache/dependências de cada executor), `plugins` (eslint, vite, vitest inferem tarefas) e `generators` (padrões usados pelo `nx g`: bundler **webpack**, estilo **scss**, sem e2e). | Raramente. Ajuste os `generators` se quiser mudar os padrões de novos apps. |
| `tsconfig.base.json` | Opções TypeScript comuns e, principalmente, `paths`: os aliases das libs (`@elizfab/shared/data` → `packages/shared/data/src/index.ts`). O Module Federation lê esses aliases para compartilhar as libs entre host e remotes. | Ao criar uma lib nova (o gerador já atualiza). |
| `eslint.config.mjs` | Configuração ESLint (flat config) e a regra `@nx/enforce-module-boundaries` com os `depConstraints` por `scope:*` e `type:*`. | Ao criar um remote ou lib (adicionar a regra do novo `scope`). |
| `vitest.config.mts` | Agrega os `vite.config.mts` de cada projeto para rodar tudo com Vitest. | Nunca. |
| `.npmrc` | `legacy-peer-deps=true`: evita falhas do `npm install` por conflito de peer deps entre versões do Nx/Angular. | Nunca. |
| `.prettierrc`, `.prettierignore`, `.editorconfig` | Formatação (aspas simples, 2 espaços, UTF-8). | Raramente. |
| `.gitignore` | Ignora `node_modules`, `dist`, caches etc. | Raramente. |
| `dangerfile.ts` | Regras de revisão automática dos PRs (Danger JS). Detalhes em [09](./09-fluxo-git.md#regras-do-danger-dangerfilets). | Ao criar/ajustar regras de PR. |
| `packages/danger-rules/` | Pacote `@elizfab/danger-rules`: `naming.ts`, `version.ts`, `standards.ts`, `danger.ts`, `cli.ts` e testes. Ver [12](./12-padroes-de-repositorio.md). | Ao mudar regras da org. |
| `elizfab.json` | Tipo do repositório (`mfe-host`) e exceções aos padrões. | Raramente. |
| `.github/workflows/release.yml` | Release automática: versão, tag, notas, pacotes npm e imagem Docker. | Ao mudar o que é publicado. |
| `AGENTS.md`, `CLAUDE.md`, `opencode.json` | Instruções do Nx para assistentes de IA (usar `nx` para rodar tarefas etc.). | Opcional; pode apagar se não usar. |

### `.github/`

| Caminho | Conteúdo |
| --- | --- |
| `.github/workflows/ci.yml` | CI: em push em `main`, `develop` e `feature/**` roda lint, testes e build de todos os projetos. |
| `.github/workflows/branch-name.yml` | Valida o padrão `feature/<nome-da-atividade>` em todo push. |
| `.github/workflows/auto-pr.yml` | Em push de `feature/**`: abre o PR para `develop` automaticamente e roda o Danger. |
| `.github/workflows/danger.yml`, `danger-release.yml` | Danger ao abrir/editar PR e em PRs de release (`develop → main`). |
| `.github/pull_request_template.md` | Template da descrição dos PRs (resumo, blocos, como testar, checklist). |
| `.github/agents`, `prompts`, `skills` | Arquivos de IA gerados pelo Nx (monitorar CI, usar geradores). Não afetam o build. |

### `.vscode/` (só local, não versionada)

| Arquivo | Conteúdo |
| --- | --- |
| `extensions.json` | Extensões recomendadas: Nx Console, Angular Language Service, Prettier, ESLint, Vitest. |
| `launch.json` | "Debug shell (Chrome)": abre o Chrome em `localhost:4200` com debugger do VS Code (rode `npm start` antes). |

---

## `apps/shell/` — o host

```txt
apps/shell/
├── project.json               # Tarefas Nx do app (build, serve, lint, test, serve-static) + tags
├── webpack.config.js          # Module Federation: shell é HOST (não expõe nada, só compartilha deps)
├── webpack.prod.config.js     # Config de produção (reaproveita a de dev)
├── tsconfig.json              # TS do app (strict) — referencia os dois abaixo
├── tsconfig.app.json          # TS usado no build (exclui specs)
├── tsconfig.spec.json         # TS usado nos testes
├── vite.config.mts            # Config do Vitest (testes unitários) do app
├── eslint.config.mjs          # Lint específico do app (estende o da raiz)
├── public/                    # Arquivos copiados como estão para o build
│   ├── favicon.ico
│   └── mf.manifest.json       # ★ MAPA DOS REMOTES: nome → URL do remoteEntry.js
└── src/
    ├── index.html             # HTML base (<ef-root>, título, lang pt-BR)
    ├── main.ts                # ★ initFederation(manifesto) → import('./bootstrap')
    ├── bootstrap.ts           # bootstrapApplication(App, appConfig) — o "main" real do Angular
    ├── styles.scss            # Estilos globais: só importa o tema compartilhado
    ├── test-setup.ts          # Setup do Vitest + Analog (inicializa o TestBed do Angular)
    └── app/
        ├── app.ts             # Componente raiz: cabeçalho, menu (array `links`) e <router-outlet>
        ├── app.scss           # Estilos do layout (topbar, nav, container)
        ├── app.config.ts      # Providers globais (router, error listeners)
        ├── app.routes.ts      # ★ Rotas: Home + uma rota por remote via loadRemoteRoutes()
        ├── app.spec.ts        # Teste: menu renderiza os links esperados
        ├── home/home.ts       # Página inicial (hero com perfil e CTA)
        └── remote-unavailable/remote-unavailable.ts
                               # Tela de fallback quando um remote não carrega
```

Detalhes de funcionamento: [03 — Shell: o template pai](./03-shell-template-pai.md).

## `apps/<remote>/` — projects, about, contact

Todos os remotes seguem **o mesmo molde**:

```txt
apps/<remote>/
├── project.json               # Tarefas Nx + porta do serve (4201, 4202...) + tags scope:<remote>
├── webpack.config.js          # ★ Module Federation: name '<remote>' + exposes { './Routes': ... }
├── webpack.prod.config.js
├── tsconfig*.json, vite.config.mts, eslint.config.mjs   # iguais ao shell
├── public/favicon.ico
└── src/
    ├── index.html             # Usado só quando o remote roda sozinho
    ├── main.ts                # import('./bootstrap') — bootstrap assíncrono
    ├── bootstrap.ts           # bootstrapApplication(App, appConfig) — modo standalone
    ├── styles.scss            # Importa o tema compartilhado (modo standalone)
    ├── test-setup.ts
    └── app/
        ├── app.ts             # Raiz mínima: só <router-outlet /> (modo standalone)
        ├── app.config.ts      # Providers do modo standalone
        ├── app.routes.ts      # '' → carrega remote-entry/entry.routes (reusa as mesmas rotas)
        ├── app.spec.ts        # Testes do remote
        └── remote-entry/      # ★ TUDO O QUE O SHELL VAI CARREGAR
            ├── entry.routes.ts    # export const remoteRoutes — o que é exposto como './Routes'
            └── <feature>.ts/.html/.scss   # Componentes da feature
```

Conteúdo específico de cada remote hoje:

| Remote | `remote-entry/` | O que faz |
| --- | --- | --- |
| `projects` | `projects.ts`, `projects.html`, `projects.scss` | Lista `PROJECTS` em cards com filtro por categoria (signal + computed). |
| `about` | `about.ts` | Mostra `PROFILE` (nome, cargo, resumo) e lista de stack. |
| `contact` | `contact.ts` | Links de LinkedIn e GitHub do `PROFILE`. |

Detalhes do molde: [04 — Anatomia de um remote](./04-anatomia-de-um-remote.md).

## `packages/shared/data/` — lib de dados

```txt
packages/shared/data/
├── project.json               # Projeto Nx do tipo library, tags type:data + scope:shared
├── tsconfig*.json, vite.config.mts, eslint.config.mjs
├── README.md
└── src/
    ├── index.ts               # API pública da lib — SÓ o que é exportado aqui pode ser importado
    ├── test-setup.ts
    └── lib/
        ├── models.ts          # Interfaces: Project, ProjectCategory, Profile
        ├── profile.data.ts    # PROFILE: nome, cargo, resumo, GitHub, LinkedIn
        ├── projects.data.ts   # ★ PROJECTS: os projetos exibidos no portfólio
        └── projects.data.spec.ts  # Garante slugs únicos, repoUrl válido e techs preenchidas
```

Importação em qualquer app: `import { PROJECTS, PROFILE } from '@elizfab/shared/data';`

## `packages/shared/styles/` — tema

| Arquivo | Conteúdo |
| --- | --- |
| `_theme.scss` | Design tokens como variáveis CSS (`--ef-primary`, `--ef-bg`, `--ef-text`, `--ef-muted`, `--ef-border`, `--ef-surface`, `--ef-chip`), versão escura via `prefers-color-scheme` e reset básico do `body`. |

Cada app faz `@use '../../../packages/shared/styles/theme';` no seu `src/styles.scss`. Componentes usam
só `var(--ef-*)`. Mais em [06 — Libs e estilos compartilhados](./06-libs-e-estilos-compartilhados.md).

## `dist/` (gerado)

Depois de `npm run build`:

```txt
dist/apps/
├── shell/      index.html, main.*.js, styles.*.css, mf.manifest.json
├── projects/   index.html, remoteEntry.js ★, *.js
├── about/      index.html, remoteEntry.js ★, *.js
└── contact/    index.html, remoteEntry.js ★, *.js
```

Cada pasta é um site estático independente, publicado separadamente (ver
[07 — Comandos, build e deploy](./07-comandos-build-deploy.md)).
