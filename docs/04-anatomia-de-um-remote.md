# 04 — Anatomia de um remote

[← Índice](./README.md)

Todo micro frontend deste monorepo segue **o mesmo molde**. Se você entender um (`about` é o mais simples),
entende todos. Este documento descreve o **contrato** que um remote precisa cumprir para ser plugado no shell.

## O contrato em 5 itens

1. Tem um `name` único no `webpack.config.js` (ex.: `'about'`), igual à chave no `mf.manifest.json` do shell.
2. Expõe **exatamente** `./Routes`, apontando para `src/app/remote-entry/entry.routes.ts`.
3. `entry.routes.ts` exporta uma constante chamada **`remoteRoutes`** (`Route[]`).
4. Tem uma porta própria no `project.json` (faixa 4201–4299) e header CORS liberado no `serve`.
5. Tem as tags `type:app` e `scope:<nome>` no `project.json`.

## Os dois modos de execução

Um remote roda de **duas formas**, e o código precisa funcionar nas duas:

```txt
 MODO STANDALONE  (npx nx serve about → localhost:4202)
   main.ts → bootstrap.ts → App (só <router-outlet>) → app.routes.ts
     → '' carrega remote-entry/entry.routes.ts → About
   ✔ roda o app.config.ts do remote
   ✔ carrega o styles.scss do remote

 MODO FEDERADO  (shell em localhost:4200 → /sobre)
   shell app.routes.ts → loadRemoteModule('about', './Routes')
     → remote-entry/entry.routes.ts → About
   ✘ NÃO roda main.ts, bootstrap.ts, app.ts, app.config.ts, app.routes.ts do remote
   ✘ NÃO carrega o styles.scss do remote
```

**Regra prática:** tudo o que a feature precisa para funcionar deve estar **dentro de `remote-entry/`**
(componentes, estilos de componente, providers de rota). O resto do `src/app` é só a "casca" para o modo standalone.

## Arquivo por arquivo

### `webpack.config.js`

```js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: 'about',                                   // = chave no mf.manifest.json do shell
  exposes: {
    './Routes': './apps/about/src/app/remote-entry/entry.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

O bloco `shared` deve ser **idêntico** ao do shell. Não exponha componentes soltos, services ou o `app.ts`:
o contrato do projeto é expor só `./Routes`.

### `src/app/remote-entry/entry.routes.ts`

```ts
import { Route } from '@angular/router';
import { About } from './about';

export const remoteRoutes: Route[] = [{ path: '', component: About }];
```

É a **porta de entrada pública** do remote. Pode ter quantas rotas quiser:

```ts
export const remoteRoutes: Route[] = [
  {
    path: '',
    providers: [ProjectsStore],                      // providers só desta feature
    children: [
      { path: '', component: ProjectList },
      { path: ':slug', component: ProjectDetail },    // → /projetos/dose-certa no shell
    ],
  },
];
```

### `src/app/remote-entry/<feature>.ts`

Componentes da feature. Padrões adotados no projeto:

- Componentes **standalone** com `ChangeDetectionStrategy.OnPush`.
- Estado local com **signals** (`signal`, `computed`).
- Prefixo de seletor `ef-` (definido no `project.json`).
- Estilos no próprio componente (`styleUrl` ou `styles`), usando **apenas** `var(--ef-*)`.
- Dados comuns vêm de `@elizfab/shared/data`; nunca de outro remote.

### `src/app/app.routes.ts` (casca standalone)

```ts
export const appRoutes: Route[] = [
  { path: '', loadChildren: () => import('./remote-entry/entry.routes').then((m) => m.remoteRoutes) },
];
```

Reaproveita **as mesmas rotas** expostas ao shell — o que você vê em `localhost:4202` é o mesmo que aparece em `/sobre`.

### `src/app/app.ts` (casca standalone)

Componente raiz mínimo, só com `<router-outlet />`. Não coloque layout aqui (o layout é do shell).

### `src/main.ts` e `src/bootstrap.ts`

`main.ts` faz apenas `import('./bootstrap')`. O bootstrap assíncrono é **obrigatório** para o Module Federation
negociar as dependências compartilhadas. Não altere.

### `src/styles.scss`

Só `@use '../../../packages/shared/styles/theme';`. Vale apenas no modo standalone (no shell, o tema vem do shell).

### `project.json`

- `serve.options.port`: a porta do remote. `publicHost` e `headers['Access-Control-Allow-Origin']` são
  necessários para o shell (outra origem) conseguir baixar o `remoteEntry.js`.
- `tags`: `["type:app", "scope:<nome>"]`.
- `prefix`: `ef`.

## Providers e dependências

Como o `app.config.ts` do remote **não roda** no shell:

| Precisa de...                                        | Onde declarar                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| Service/store usado só por esta feature              | `providers: [...]` na rota em `entry.routes.ts`, ou `providedIn: 'root'` no service |
| `provideHttpClient()`                                | Nos `providers` da rota do remote **ou** no `app.config.ts` do shell (se vários remotes usam) |
| NgRx: `provideState(...)`, `provideEffects(...)`     | `providers` da rota do remote                                   |
| NgRx: `provideStore()` (raiz)                        | `app.config.ts` do **shell** (e do remote, para o modo standalone) |
| `provideAnimations()`, locale, configs de lib de UI  | `app.config.ts` do **shell** (e do remote, para o modo standalone) |

Sempre que colocar algo no `app.config.ts` do remote, pergunte: "isso vai existir quando eu estiver dentro do shell?".

## Cuidados comuns

- **Links internos:** use `routerLink` **relativo** dentro do remote (`[routerLink]="[project.slug]"` ou
  `routerLink="./detalhe"`). No shell o remote está montado em `/projetos`; standalone, em `/`. Um link
  absoluto como `/detalhe` quebra em um dos dois modos.
- **Imagens e assets:** arquivos em `apps/<remote>/public/` são servidos na origem do **remote**
  (`localhost:4202`), mas o HTML é renderizado na origem do **shell**. Um `src="images/foto.png"` relativo
  vai procurar no shell. Use URLs absolutas (CDN/domínio do remote) ou coloque imagens compartilhadas no `public/` do shell.
- **CSS global:** `styles.scss` do remote não é carregado no shell. Estilos que a feature precisa ficam
  nos componentes; tokens vêm do tema compartilhado.
- **Bibliotecas de UI com CSS global** (PrimeNG, ng-zorro): o CSS/tema delas precisa ser importado no
  `styles.scss` do **shell** também.
- **Nada de `window.location` / URLs fixas** para navegar: use o `Router`.
