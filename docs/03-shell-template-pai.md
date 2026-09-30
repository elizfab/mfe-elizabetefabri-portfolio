# 03 — Shell: o template pai

[← Índice](./README.md)

O `shell` é o **app pai**: a "moldura" onde todos os micro frontends são encaixados. É o único app que o
usuário final acessa diretamente.

## Responsabilidades do shell

| O shell É responsável por                          | O shell NÃO deve                                             |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Layout global (cabeçalho, menu, container)         | Conter regra de negócio de uma seção (isso é do remote)     |
| Página inicial (`/`)                               | Importar código de um remote (`apps/<remote>/...`)          |
| Saber **onde** estão os remotes (manifesto)        | Ter a URL de um remote fixa no código TypeScript            |
| Mapear rota → remote                               | Quebrar se um remote estiver fora do ar                     |
| Providers realmente globais (router, HttpClient se todos usarem, store raiz) | Carregar CSS/providers específicos de um remote |
| Tela de fallback de remote indisponível            |                                                              |

## Ciclo de vida, arquivo por arquivo

### 1. `public/mf.manifest.json` — onde estão os remotes

```json
{
  "about": "http://localhost:4202/remoteEntry.js",
  "contact": "http://localhost:4203/remoteEntry.js",
  "projects": "http://localhost:4201/remoteEntry.js"
}
```

- A **chave** (`about`) é o `remoteName` — precisa ser **igual** ao `name` do `webpack.config.js` do remote.
- O **valor** é a URL do `remoteEntry.js` publicado.
- É um arquivo da pasta `public/`: vai para o `dist` como está e pode ser **substituído no deploy** sem
  rebuild (ex.: um manifesto por ambiente).

### 2. `src/main.ts` — inicializa a federação

```ts
import { initFederation } from '@angular-architects/module-federation';

initFederation('mf.manifest.json')
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
```

`initFederation` baixa o manifesto e registra os remotes. **Só depois** o Angular sobe (`import('./bootstrap')`).
Se o manifesto falhar, o erro é logado e o app sobe mesmo assim (as seções remotas mostram o fallback).

> Nunca coloque imports de Angular diretamente no `main.ts`. Tudo que é Angular fica em `bootstrap.ts`.

### 3. `src/bootstrap.ts` e `src/app/app.config.ts` — o Angular de fato

`bootstrap.ts` chama `bootstrapApplication(App, appConfig)`. Em `app.config.ts` ficam os providers
globais — hoje `provideRouter(appRoutes)` e `provideBrowserGlobalErrorListeners()`.

**Importante:** quando um remote é carregado dentro do shell, **o `app.config.ts` do remote NÃO roda**.
Só as rotas expostas são carregadas. Então, se algo precisa existir para *todos* (ex.: `provideHttpClient()`,
`provideStore()` do NgRx, `provideAnimations()`), ele tem que estar aqui no shell. O que é específico de um
remote vai nos `providers` da rota dele (ver [04](./04-anatomia-de-um-remote.md#providers-e-dependências)).

### 4. `src/app/app.routes.ts` — o coração do template pai

```ts
const loadRemoteRoutes = (remoteName: string) => () =>
  loadRemoteModule({ type: 'manifest', remoteName, exposedModule: './Routes' })
    .then((m) => m.remoteRoutes)
    .catch((err) => {
      console.error(`[shell] falha ao carregar o remote "${remoteName}"`, err);
      return [{ path: '**', component: RemoteUnavailable, data: { remoteName } }];
    });

export const appRoutes: Route[] = [
  { path: '', component: Home, title: 'Elizabete Fabri' },
  { path: 'projetos', loadChildren: loadRemoteRoutes('projects'), title: 'Projetos' },
  { path: 'sobre', loadChildren: loadRemoteRoutes('about'), title: 'Sobre' },
  { path: 'contato', loadChildren: loadRemoteRoutes('contact'), title: 'Contato' },
  { path: '**', redirectTo: '' },
];
```

- `loadRemoteRoutes('<remoteName>')` é o **único** jeito de plugar um remote. Ele:
  1. procura o remote no manifesto;
  2. carrega o módulo exposto `./Routes`;
  3. usa o array `remoteRoutes` exportado por ele como filhos da rota;
  4. em caso de erro, devolve uma rota que mostra `RemoteUnavailable`.
- O `path` da rota é o que aparece na URL (em português: `/projetos`, `/sobre`). O `remoteName` é o nome
  técnico do remote (em inglês/kebab-case). Eles **não precisam** ser iguais.
- Como são `loadChildren`, as sub-rotas do remote funcionam naturalmente: se o remote `projects` definir
  `{ path: ':slug', component: ProjectDetail }`, a URL `/projetos/dose-certa` já funciona.
- A rota `**` precisa ser **sempre a última**.

### 5. `src/app/app.ts` — layout e menu

```ts
protected readonly links = [
  { path: '/', label: 'Início' },
  { path: '/projetos', label: 'Projetos' },
  { path: '/sobre', label: 'Sobre' },
  { path: '/contato', label: 'Contato' },
];
```

O menu é gerado a partir desse array. Adicionou um remote que deve aparecer no menu? Adicione um item
aqui (o teste `app.spec.ts` verifica a lista — atualize-o também).

### 6. `src/app/remote-unavailable/` — fallback

Componente exibido quando o remote não responde (servidor parado, deploy quebrado, CORS). Lê o
`remoteName` do `data` da rota e mostra uma mensagem com o comando para subir o remote. Assim, **um remote
com problema nunca derruba o portfólio inteiro**.

### 7. `webpack.config.js` — o shell como host

```js
module.exports = withModuleFederationPlugin({
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

O shell não tem `name` nem `exposes` (não expõe nada). Ele só declara o que é **compartilhado**:
`shareAll` compartilha todas as `dependencies` do `package.json` + as libs de `tsconfig.base.json` (`@elizfab/...`).

- `singleton: true` → uma única instância (obrigatório para Angular).
- `strictVersion: true` → erro se as versões divergirem (evita bugs silenciosos).
- `requiredVersion: 'auto'` → usa a versão do `package.json`.

### 8. `project.json` — tarefas

| Target | Executor | Função |
| --- | --- | --- |
| `build` | `@nx/angular:webpack-browser` | Build com o `webpack.config.js` (produção usa `webpack.prod.config.js`). Saída: `dist/apps/shell`. |
| `serve` | `@nx/angular:dev-server` | Dev server na porta **4200**, com header CORS liberado. |
| `serve-static` | `@nx/web:file-server` | Serve o build de produção localmente (teste pré-deploy). |
| `lint` / `test` | eslint / vitest | Qualidade. |
| `extract-i18n` | Angular | Extração de textos para tradução (não usado ainda). |

## Como evoluir o shell com segurança

- **Mudou o layout?** Edite `app.ts`/`app.scss`. Todos os remotes herdam o novo layout na hora, sem rebuild deles.
- **Novo provider global?** Adicione em `app.config.ts`. Se um remote passar a depender dele, documente no README do remote.
- **Nova dependência npm usada pelo shell?** Ela entra no `shareAll` automaticamente. Rebuilde **todos** os
  apps antes do deploy, para que as versões compartilhadas batam.
- **Nunca** coloque `import ... from 'apps/about/...'` no shell. O lint bloqueia (`scope:shell`).
