# 10 — Integração de projetos existentes (runbook item por item)

[← Índice](./README.md) · Relatórios de prontidão por projeto: [`docs/integracao/`](./integracao/README.md)

Guia operacional para trazer um projeto Angular que já existe (ex.: `01.carteira-saude`) para dentro do MFE
como **remote**. É a versão detalhada do [cenário C1](./05-adicionar-projetos.md#c1--trazer-o-código-para-dentro-do-monorepo-recomendado),
dividida em **itens numerados** (`I-01` a `I-16`), referenciados pelas issues e pelos relatórios de cada projeto.

Cada item tem: **objetivo**, **onde** (arquivos), **como** (passos) e **pronto quando** (critério de aceite).

---

## Visão geral

```txt
 FASE 0 — Fundação do MFE (uma vez, antes do primeiro projeto)     issues F-01 … F-08
 FASE 1 — Preparar o projeto de origem                             I-01 … I-02
 FASE 2 — Criar o remote e trazer o código                         I-03 … I-05
 FASE 3 — Adaptar para rodar dentro do shell                       I-06 … I-12
 FASE 4 — Integrar, validar e publicar                             I-13 … I-16
```

### Nomes, portas e rotas reservados

| # | Projeto de origem | Remote (`name`/pasta) | Porta | Rota no shell | Repositório de origem |
| --- | --- | --- | --- | --- | --- |
| 01 | Carteira de Saúde | `carteira` | 4204 | `/carteira-saude` | `elizfab/carteira-saude` |
| 02 | Dose Certa | `dosecerta` | 4205 | `/dose-certa` | `elizfab/dosecerta` |
| 03 | Suplementos Store | `suplementos` | 4206 | `/suplementos-store` | `elizfab/suplementos-store` (privado) |
| 04 | PDI | `pdi` | 4207 | `/pdi` | `elizfab/pdi` |
| 05 | Caderno Inteligente | `caderno` | 4208 | `/caderno-inteligente` | `elizfab/caderno-inteligente` |

> **Por que nomes sem hífen?** O `name` do remote vira identificador do container do Module Federation (e parte do
> nome do chunk global do Webpack). Nomes de uma palavra evitam problemas. A **rota** pode ter hífen normalmente.

### Ordem recomendada

`Fundação` → **04 PDI** (mais simples, sem backend) → **02 Dose Certa** → **01 Carteira** (ng-zorro + NgRx real)
→ **05 Caderno** (PrimeNG + auth) → **03 Suplementos** (depende de decisão: repositório privado).

---

## FASE 0 — Fundação (pré-requisitos no MFE)

Feitas **uma vez**, antes do primeiro remote. Cada uma é uma issue `F-xx`.

| ID | O quê | Resultado esperado |
| --- | --- | --- |
| **F-01** | Dependências compartilhadas no `package.json` da raiz | `ng-zorro-antd@22`, `primeng@22`, `@primeuix/themes`, `primeicons`, `@ngrx/store|effects|entity|store-devtools@22`, `chart.js@4`, `@lucide/angular`, `@fontsource/carlito` instalados; build verde |
| **F-02** | Providers globais no shell | `app.config.ts` do shell com `provideHttpClient(withFetch())`, `provideStore()`, `provideEffects()`, `provideStoreDevtools`, `LOCALE_ID` pt-BR + `registerLocaleData`, `providePrimeNG` (Aura, `darkModeSelector: '.app-dark'`) |
| **F-03** | Lib `@elizfab/shared/core`: **contrato de tema** | `ThemeStore` (signal `light`/`dark`) que aplica no `<html>` `data-theme`, a classe `app-dark` (PrimeNG) e no `<body>` a classe `dark`/`light` (Carteira). O shell é o **dono** do tema; remotes só leem |
| **F-04** | Lib `@elizfab/shared/core`: **contexto de execução** | Token `MFE_HOST` (fornecido pelo shell). O remote sabe se está **federado** (esconde header próprio, não mexe em favicon/título) ou **standalone** |
| **F-05** | Padrão de **assets** por remote | Assets em `apps/<remote>/public/assets/<remote>/`, copiados também para o build do shell; referências absolutas `/assets/<remote>/...` |
| **F-06** | Padrão de **isolamento de estilos** | Componente raiz do remote com classe `mfe-<remote>` e `ViewEncapsulation.None`; `:root`/`body` dos estilos globais convertidos para `.mfe-<remote>`; resets removidos (o shell já faz) |
| **F-07** | Padrão de **ambientes e API** | `environment.ts`/`environment.prod.ts` por remote com `fileReplacements` no `project.json`; URL absoluta da API; domínio do shell no `ALLOWED_ORIGINS` dos backends |
| **F-08** | Shell: **navegação para os projetos** | Campo `mfeRoute` em `Project` (`@elizfab/shared/data`); card em `/projetos` com botão "Abrir aqui"; menu do shell com entrada "Projetos" |

---

## FASE 1 — Preparar o projeto de origem

### I-01 · Projeto de origem saudável

- **Objetivo:** partir de um código que builda, passa nos testes e está 100% versionado.
- **Onde:** repositório original (`org-elizfab/0N.<projeto>/`).
- **Como:**
  ```bash
  cd org-elizfab/0N.<projeto>
  git status                     # nada pendente; se houver, commit/push no repo original
  git fsck                       # sem objetos corrompidos
  cd frontend && npm ci && npx ng build && npx jest
  ```
- **Pronto quando:** `git status` limpo, `git fsck` sem erros, build e testes verdes, último commit no GitHub.

### I-02 · Inventário do projeto

- **Objetivo:** saber exatamente o que precisa ser adaptado antes de copiar.
- **Onde:** relatório do projeto em [`docs/integracao/`](./integracao/README.md).
- **Como:** conferir (comandos na raiz do frontend de origem):
  ```bash
  cat src/app/app.config.ts                                        # providers globais → I-06
  grep -rnE "routerLink=\"/|navigate\(\['/|navigateByUrl\('/" src  # links absolutos → I-10
  grep -rn "localStorage" src --include='*.ts' | grep -v spec      # chaves → I-11
  grep -rn "document\.\(body\|documentElement\|head\)" src         # manipulação global → I-08
  ls public/ ; grep -rn "src=\"[a-z]" src --include='*.html'       # assets → I-09
  cat src/app/environment/environment.prod.ts                      # API → I-11
  ```
- **Pronto quando:** o relatório do projeto está atualizado com as pendências reais.

---

## FASE 2 — Criar o remote e trazer o código

### I-03 · Criar o remote vazio

- **Objetivo:** ter o esqueleto do remote funcionando (standalone e no shell) **antes** de trazer código.
- **Onde:** raiz do MFE.
- **Como:** executar os passos **1 a 9 do [cenário B](./05-adicionar-projetos.md#cenário-b--criar-um-remote-novo-caminho-padrão)**
  com o nome/porta/rota da tabela acima. Branch: `feature/remote-<remote>` (ex.: `feature/remote-pdi`).
- **Pronto quando:** `http://localhost:<porta>` e `http://localhost:4200/<rota>` mostram o placeholder; `nx run-many -t lint test build` verde.

### I-04 · Copiar o código-fonte

- **Objetivo:** trazer o código do app para `remote-entry/`, preservando a estrutura interna.
- **Onde:** `apps/<remote>/src/app/remote-entry/`.
- **Como:**
  ```bash
  ORIG=../0N.<projeto>/frontend/src/app
  DEST=apps/<remote>/src/app/remote-entry
  rsync -a --exclude 'app.ts' --exclude 'app.html' --exclude 'app.scss' --exclude 'app.config*.ts' \
        --exclude 'app.routes*.ts' --exclude 'app.spec.ts' "$ORIG/" "$DEST/"
  # estilos globais do projeto (serão adaptados no I-07)
  mkdir -p "$DEST/styles" && cp -r ../0N.<projeto>/frontend/src/shared/styles/* "$DEST/styles/" 2>/dev/null
  ```
  - O `app.ts`/`app.html` do projeto original (o componente raiz com header/layout) vira o **componente raiz do remote**:
    copie-o como `remote-entry/<remote>-root.ts` (+ `.html`/`.scss`) e renomeie a classe para `<Remote>Root`.
  - **Não** traga arquivos de SSR (`main.server.ts`, `server.ts`, `app.config.server.ts`, `app.routes.server.ts`): o MFE é client-side.
- **Pronto quando:** o código está em `remote-entry/` e os imports relativos resolvem (`npx nx build <remote>` pode ainda falhar por providers/estilos — isso é tratado nos próximos itens).

### I-05 · Rotas: de `app.routes.ts` para `remoteRoutes`

- **Objetivo:** expor as rotas do projeto pelo contrato `./Routes`.
- **Onde:** `apps/<remote>/src/app/remote-entry/entry.routes.ts`.
- **Como:** o componente raiz (layout do projeto) vira a rota `''` e as rotas originais viram `children`:
  ```ts
  export const remoteRoutes: Route[] = [
    {
      path: '',
      component: CarteiraRoot,               // layout do projeto (header/sidebar próprios)
      providers: [/* ver I-06 */],
      children: [
        { path: '', pathMatch: 'full', redirectTo: 'carteira/dados' },   // SEM barra inicial
        { path: 'carteira', loadChildren: () => import('./pages/carteira/carteira.routes').then((m) => m.CARTEIRA_ROUTES) },
        { path: 'preview', loadComponent: () => import('./pages/preview/preview.component').then((m) => m.PreviewComponent) },
        // NÃO copie o `{ path: '**', redirectTo: '' }` do projeto: o curinga é do shell
      ],
    },
  ];
  ```
  - `redirectTo` **sem** `/` inicial (relativo). `redirectTo: '/dashboard'` mandaria para `/dashboard` do shell.
  - Remova o `**` do projeto: dentro do shell ele capturaria rotas de outros apps.
- **Pronto quando:** navegar em `http://localhost:4200/<rota>/...` abre as páginas do projeto.

---

## FASE 3 — Adaptar para rodar dentro do shell

### I-06 · Providers

- **Objetivo:** tudo o que o `app.config.ts` original fornecia continuar existindo dentro do shell.
- **Onde:** `providers` da rota `''` em `entry.routes.ts` (feature) e `apps/shell/src/app/app.config.ts` (global, já feito em F-02).
- **Como:** para cada provider do `app.config.ts` original:

  | Provider original | Destino |
  | --- | --- |
  | `provideRouter(routes)` | Some (o roteador é do shell) |
  | `provideStore({ a: reducerA, b: reducerB })` | `provideState('a', reducerA)`, `provideState('b', reducerB)` na rota. A `provideStore()` raiz é do shell (F-02) |
  | `provideStore()` / `provideEffects()` **sem uso** | Remover (não há estado NgRx no projeto) |
  | `provideEffects([X])` | `provideEffects(X)` na rota |
  | `provideStoreDevtools` | Remover (é do shell) |
  | `provideHttpClient(withInterceptors([...]))` | `provideHttpClient(withFetch(), withInterceptors([...]))` **na rota** — cria um `HttpClient` próprio do remote, com os interceptors dele |
  | `provideNzI18n(pt_BR)`, `provideNzIcons([...])` | Na rota |
  | `providePrimeNG({...})` | Remover; a config é global no shell (F-02). Se o preset for diferente, alinhar com o do shell |
  | `LOCALE_ID` / `registerLocaleData` | Remover (shell, F-02) |
  | Services `providedIn: 'root'` | Continuam funcionando (singleton por app); confira se não colidem com services do shell |

  Replique os mesmos providers no `apps/<remote>/src/app/app.config.ts` (modo standalone) — ou, mais simples,
  deixe o `app.config.ts` do remote igual ao do shell e os específicos só na rota.
- **Pronto quando:** nenhuma `NullInjectorError` no console, nem standalone nem no shell.

### I-07 · Estilos globais → estilos isolados

- **Objetivo:** o CSS do projeto não vazar para o shell nem para outros remotes (e vice-versa).
- **Onde:** `remote-entry/<remote>-root.scss`, `remote-entry/styles/`, `apps/shell/src/styles.scss`, `apps/<remote>/src/styles.scss`.
- **Como (padrão F-06):**
  1. No componente raiz do remote:
     ```ts
     @Component({
       selector: 'ef-carteira-root',
       host: { class: 'mfe-carteira' },
       encapsulation: ViewEncapsulation.None,
       styleUrl: './carteira-root.scss',
       ...
     })
     ```
  2. Em `carteira-root.scss`, envolva os estilos globais do projeto na classe:
     ```scss
     .mfe-carteira {
       @include meta.load-css('styles/abstracts/variables');   // ex-:root → agora escopado
       @include meta.load-css('styles/base/typography');
       // NÃO carregue o reset: o shell já tem o dele
     }
     ```
     e troque `:root {` por `& {` e `body {` por `& {` dentro desses arquivos (as variáveis CSS passam a valer só dentro do remote).
  3. **CSS de bibliotecas** (ng-zorro, primeicons, fontes) é global por natureza: importe no `apps/shell/src/styles.scss`
     **e** no `apps/<remote>/src/styles.scss` (standalone). Depois de adicionar, **navegue por todas as seções do shell**
     para verificar se nada mudou visualmente.
- **Pronto quando:** o remote tem a mesma aparência standalone e no shell, e as outras seções do shell não mudaram.

### I-08 · Tema e manipulação global do documento

- **Objetivo:** um único tema (claro/escuro) para todo o portfólio; remote não altera `<html>`, `<body>`, `<head>` quando federado.
- **Onde:** services de tema do projeto (ex.: `core/services/theme*.ts`), componentes que mexem em `document`.
- **Como:**
  - Substitua o service de tema do projeto por `ThemeStore` de `@elizfab/shared/core` (F-03): leitura via `themeStore.mode()`;
    o botão de tema do projeto chama `themeStore.toggle()` (o shell aplica no documento).
  - Remova a chave de tema própria do `localStorage` (`dc-theme`, `pdi-theme`, `suplementos.theme`, `techbook.theme`, slice `theme` do NgRx).
  - Código que troca favicon, `document.title`, `body.style.overflow`, ou injeta `<link>` no `<head>`: execute **só se standalone**:
    ```ts
    private readonly federated = inject(MFE_HOST, { optional: true }) !== null;
    if (!this.federated) { /* trocar favicon, título... */ }
    ```
    (título: use `title` nas rotas.)
  - Header/topbar próprio do projeto: esconda quando federado (o shell já tem cabeçalho), ou mantenha como sub-navegação se fizer sentido.
- **Pronto quando:** trocar o tema no shell muda o remote; o remote não altera favicon/título/scroll do shell.

### I-09 · Assets (imagens, ícones, fontes)

- **Objetivo:** imagens aparecerem standalone e dentro do shell.
- **Onde:** `apps/<remote>/public/assets/<remote>/`, `apps/<remote>/project.json`, `apps/shell/project.json`.
- **Como (padrão F-05):**
  ```bash
  mkdir -p apps/<remote>/public/assets/<remote>
  cp -r ../0N.<projeto>/frontend/public/* apps/<remote>/public/assets/<remote>/
  ```
  - Troque as referências: `src="logo.png"` → `src="/assets/<remote>/logo.png"`, `url(images/x.svg)` → `url(/assets/<remote>/images/x.svg)`.
  - No `apps/shell/project.json`, em `build.options.assets`, adicione:
    ```json
    { "glob": "**/*", "input": "apps/<remote>/public/assets/<remote>", "output": "assets/<remote>" }
    ```
  - Favicon/`index.html` do projeto: não se aplicam (são do shell).
- **Pronto quando:** nenhuma imagem 404 na aba Network, standalone e no shell.

### I-10 · Links e navegação

- **Objetivo:** navegação interna funcionar sob o prefixo da rota do shell (`/carteira-saude/...`).
- **Onde:** templates (`routerLink`) e código (`router.navigate`).
- **Como:**
  - `routerLink="/produtos"` → `routerLink="produtos"` relativo ao componente raiz **ou** use um helper:
    ```ts
    // remote-entry/remote-path.ts
    export const BASE = inject(REMOTE_BASE_PATH);         // '/suplementos-store' no shell, '' standalone
    router.navigate([BASE, 'produtos', slug]);
    ```
    (o token `REMOTE_BASE_PATH` pode ser fornecido na rota do shell via `data`/providers — definir em F-04).
  - Links que **devem** sair do projeto (ex.: voltar ao portfólio) apontam para rotas do shell (`/`, `/projetos`).
  - Localize todos: `grep -rnE "routerLink=\"/|\['/|navigateByUrl\('/" apps/<remote>/src`.
- **Pronto quando:** o grep acima só retorna links intencionais para o shell; todas as navegações funcionam nos dois modos.

### I-11 · Ambiente, API, autenticação e armazenamento local

- **Objetivo:** o remote falar com o backend certo e não colidir dados locais com outros apps.
- **Onde:** `remote-entry/environment/`, `apps/<remote>/project.json`, backend do projeto (`ALLOWED_ORIGINS`).
- **Como (padrão F-07):**
  - Mova `environment*.ts` para `remote-entry/environment/` e configure no `project.json` do remote, em `build.configurations.production`:
    ```json
    "fileReplacements": [{ "replace": "apps/<remote>/src/app/remote-entry/environment/environment.ts",
                           "with": "apps/<remote>/src/app/remote-entry/environment/environment.prod.ts" }]
    ```
    Atenção: dentro do shell vale o build **do remote** (o environment é compilado no bundle dele).
  - `apiUrl` **absoluta** (`https://...`). URL relativa (`/api/v1`) apontaria para o domínio do shell.
  - Backend: adicionar o domínio do shell (e `http://localhost:4200`) em `ALLOWED_ORIGINS`.
  - `localStorage`: chaves com prefixo do projeto (ex.: `suplementos.cart`) estão ok — o shell e os remotes compartilham a mesma origem.
    Chaves genéricas (`token`, `theme`, `user`) devem ganhar prefixo.
  - Autenticação: guards e interceptors vão nos `providers`/`canActivate` das rotas do remote; login/logout redirecionam com caminho relativo (I-10).
- **Pronto quando:** chamadas de API funcionam a partir de `localhost:4200`, sem erro de CORS, e o login (se houver) funciona no shell.

### I-12 · Testes: Jest → Vitest

- **Objetivo:** manter os testes do projeto rodando no `nx test <remote>`.
- **Onde:** `apps/<remote>/src/**/*.spec.ts`.
- **Como:**
  - `jest.fn()` → `vi.fn()`, `jest.spyOn` → `vi.spyOn`, `jest.useFakeTimers()` → `vi.useFakeTimers()`, `jest.mock(...)` → `vi.mock(...)`
    (o `globals: true` do Vitest já expõe `describe/it/expect`).
  - Mocks de `localStorage`/`matchMedia` do `setup-jest.ts` original → `apps/<remote>/src/test-setup.ts`.
  - Rode: `npx nx test <remote>` e compare a contagem com a do projeto original.
- **Pronto quando:** mesma quantidade de testes do original, todos verdes.

---

## FASE 4 — Integrar, validar e publicar

### I-13 · Registrar no shell e na vitrine

- **Onde:** `mf.manifest.json`, `apps/shell/src/app/app.routes.ts`, `packages/shared/data/src/lib/projects.data.ts`.
- **Como:** passo 7 do cenário B + preencher `mfeRoute: '/<rota>'` no item do projeto em `PROJECTS` (F-08).
- **Pronto quando:** o card do projeto em `/projetos` abre o remote dentro do portfólio.

### I-14 · Validação completa

```bash
npx nx run-many -t lint test build          # tudo verde
npm start                                    # shell + remotes
```

Checklist manual (anote o resultado no PR):

- [ ] Standalone (`localhost:<porta>`) idêntico ao projeto original
- [ ] Dentro do shell: todas as rotas do projeto navegáveis, inclusive recarregando a página (F5) numa rota interna
- [ ] Tema claro/escuro do shell se aplica ao remote
- [ ] Nenhum erro no console, nenhum 404 de asset, nenhum erro de CORS
- [ ] Outras seções do shell (Home, Projetos, Sobre, Contato e demais remotes) sem mudança visual
- [ ] Remote desligado → "Seção indisponível" na rota dele, resto do portfólio funcionando
- [ ] Responsivo (largura de celular)

### I-15 · Deploy

- Publicar o remote (ver [07 — Deploy](./07-comandos-build-deploy.md#deploy)) e incluir a URL no manifesto de produção do shell.
- Publicar o shell (manifesto + rota + assets do remote).

### I-16 · Pós-integração no repositório original

- README do repositório original: seção "Este projeto também roda dentro do portfólio MFE" com link.
- Decidir o destino do original: **manter** (deploy standalone continua) ou **arquivar** (o MFE vira a fonte da verdade).
  Enquanto os dois existirem, correções devem ser feitas no MFE e portadas (ou vice-versa) — documente qual é a fonte.
- Atualizar o roadmap do projeto (`__MFE/.github/assets/documentation/0N.<projeto>.roadmap.md`).

---

## Definition of Done de um projeto integrado

- [ ] I-01 a I-16 concluídos (ou marcados "não se aplica" no relatório do projeto)
- [ ] PR `feature/remote-<remote>` → `develop` com CI e Danger verdes
- [ ] Relatório em `docs/integracao/0N-<projeto>.md` com status 🟢 **Integrado**
- [ ] Tabela de portas (`docs/README.md`) e manifesto de produção atualizados
