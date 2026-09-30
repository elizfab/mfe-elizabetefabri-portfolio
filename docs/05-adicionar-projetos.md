# 05 — Como adicionar projetos novos ao MFE

[← Índice](./README.md)

"Adicionar um projeto" pode significar três coisas diferentes. Escolha o cenário antes de começar:

```txt
O que você quer?
│
├─ Só MOSTRAR um projeto novo na vitrine do portfólio (card em /projetos)?
│     → Cenário A — editar a lib de dados. 5 minutos, nenhum app novo.
│
├─ Criar uma SEÇÃO / APP NOVO dentro do portfólio (ex.: /blog, /certificados, /pdi)?
│     → Cenário B — criar um remote novo no monorepo. ← caminho padrão
│
└─ Plugar um projeto que JÁ EXISTE em outra pasta/repositório (ex.: 01.carteira-saude)?
      → Cenário C — trazer para o monorepo (C1, recomendado) ou federar de fora (C2).
```

---

## Cenário A — Adicionar um projeto à vitrine

Os cards de `/projetos` vêm de `packages/shared/data/src/lib/projects.data.ts`.

1. Abra `projects.data.ts` e adicione um objeto ao array `PROJECTS`:

   ```ts
   {
     slug: 'release-control',                 // único, kebab-case (o teste valida)
     title: 'Release Control',
     description: 'Uma a duas frases sobre o que o projeto faz.',
     category: 'Frontend',                    // 'Frontend' | 'Backend' | 'Full-stack' | 'Estudos'
     techs: ['Angular', 'NgRx'],              // pelo menos 1 (o teste valida)
     repoUrl: 'https://github.com/elizfab/release-control',   // https:// (o teste valida)
     demoUrl: 'https://release.elizabetesousafabri.com.br',   // opcional
   },
   ```

2. Se precisar de um campo novo (ex.: `image`), adicione-o primeiro na interface `Project` em `models.ts`
   (como opcional `image?:` para não quebrar os outros itens) e depois use-o no template
   `apps/projects/src/app/remote-entry/projects.html`.
3. Se for uma categoria nova, inclua-a em `ProjectCategory` (`models.ts`) e no array `categories` de
   `apps/projects/src/app/remote-entry/projects.ts` (é ele que gera os botões de filtro).
4. Valide: `npx nx run-many -t test lint -p shared-data projects`.
5. Deploy: rebuilde e publique **o remote `projects` e o shell**. A lib `@elizfab/shared/data` é
   *compartilhada em runtime* (singleton): dentro do shell, o remote pode acabar usando a cópia da lib
   que veio no bundle do **shell**. Publicar só o `projects` pode, portanto, continuar mostrando a lista
   antiga. Detalhes em [06](./06-libs-e-estilos-compartilhados.md#atenção-libs-compartilhadas-e-deploy).

> Fonte dos dados: a seção "Dados do portfólio" do roadmap de cada projeto
> (`org-elizfab/__MFE/.github/assets/documentation/NN.<projeto>.roadmap.md`).

---

## Cenário B — Criar um remote novo (caminho padrão)

Exemplo usado abaixo: um remote **`certificates`** na porta **4204**, exibido na rota **`/certificados`**.
Substitua pelos seus valores.

### 0. Defina os nomes

| Item | Regra | Exemplo |
| --- | --- | --- |
| Nome do remote (`<nome>`) | kebab-case, inglês, sem prefixo `mfe-`/`app-`. É o nome da pasta, do projeto Nx, do `name` no webpack e da chave do manifesto. | `certificates` |
| Classe do componente (`<Classe>`) | PascalCase do nome | `Certificates` |
| Porta | Próxima livre na faixa 4201–4299 (veja o mapa no [README](./README.md#mapa-de-portas)) | `4204` |
| Rota no shell | Português, kebab-case (é o que aparece na URL) | `certificados` |
| Tag | `scope:<nome>` | `scope:certificates` |

### 1. Gere o app Angular

Na raiz do monorepo:

```bash
npx nx g @nx/angular:application apps/certificates --name=certificates --prefix=ef \
  --routing --standalone --bundler=webpack --style=scss --e2eTestRunner=none --ssr=false
```

> `--bundler=webpack` é obrigatório: o Module Federation clássico só funciona com o builder Webpack.

### 2. Transforme em remote

```bash
npx nx g @angular-architects/module-federation:init --project=certificates --port=4204 \
  --type=remote --stack=module-federation-webpack
```

Isso cria `webpack.config.js`, `webpack.prod.config.js`, `src/bootstrap.ts`, altera `src/main.ts` e ajusta
porta/CORS/builder no `project.json`.

⚠️ Esse gerador **(a)** readiciona ao `package.json` da raiz o script `"run:all"` — **apague-o**, ele não
funciona em workspace Nx (procura `angular.json`); e **(b)** **não** registra o remote no shell — isso é
feito à mão no passo 7.

### 3. Remova o conteúdo de exemplo

```bash
rm apps/certificates/src/app/nx-welcome.ts apps/certificates/src/app/app.html apps/certificates/src/app/app.scss
mkdir apps/certificates/src/app/remote-entry
```

### 4. Crie a feature em `remote-entry/`

`apps/certificates/src/app/remote-entry/certificates.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ef-certificates',
  template: `
    <section>
      <h1>Certificados</h1>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Certificates {}
```

`apps/certificates/src/app/remote-entry/entry.routes.ts`:

```ts
import { Route } from '@angular/router';
import { Certificates } from './certificates';

export const remoteRoutes: Route[] = [{ path: '', component: Certificates }];
```

### 5. Ajuste a casca standalone

`apps/certificates/src/app/app.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'ef-root',
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
```

`apps/certificates/src/app/app.routes.ts`:

```ts
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.remoteRoutes),
  },
];
```

`apps/certificates/src/app/app.spec.ts` (substitui o teste gerado, que referencia o `nx-welcome` apagado):

```ts
import { TestBed } from '@angular/core/testing';
import { Certificates } from './remote-entry/certificates';

describe('Certificates (remote)', () => {
  it('renderiza o título', async () => {
    await TestBed.configureTestingModule({ imports: [Certificates] }).compileComponents();
    const fixture = TestBed.createComponent(Certificates);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).toBeTruthy();
  });
});
```

`apps/certificates/src/styles.scss` (tema compartilhado):

```scss
// Estilos globais do app. O tema comum vem da pasta packages/shared/styles.
@use '../../../packages/shared/styles/theme';
```

Em `apps/certificates/src/index.html`: troque `lang="en"` por `lang="pt-BR"`.

### 6. Exponha as rotas e marque o domínio

Em `apps/certificates/webpack.config.js`, troque o `exposes` gerado:

```js
exposes: {
  './Routes': './apps/certificates/src/app/remote-entry/entry.routes.ts',
},
```

Em `apps/certificates/project.json`:

```json
"tags": ["type:app", "scope:certificates"],
```

Em `eslint.config.mjs` (raiz), dentro de `depConstraints`, junto dos outros `scope:*`:

```js
{
  sourceTag: 'scope:certificates',
  onlyDependOnLibsWithTags: ['scope:certificates', 'scope:shared'],
},
```

### 7. Registre no shell (o template pai)

`apps/shell/public/mf.manifest.json` — a chave é o `name` do webpack:

```json
{
  "about": "http://localhost:4202/remoteEntry.js",
  "certificates": "http://localhost:4204/remoteEntry.js",
  "contact": "http://localhost:4203/remoteEntry.js",
  "projects": "http://localhost:4201/remoteEntry.js"
}
```

`apps/shell/src/app/app.routes.ts` — **antes** da rota `**`:

```ts
{ path: 'certificados', loadChildren: loadRemoteRoutes('certificates'), title: 'Certificados' },
{ path: '**', redirectTo: '' },
```

`apps/shell/src/app/app.ts` — se deve aparecer no menu, adicione ao array `links`:

```ts
{ path: '/certificados', label: 'Certificados' },
```

…e atualize a lista esperada em `apps/shell/src/app/app.spec.ts`.

### 8. Scripts npm

Em `package.json` (raiz):

```json
"start": "nx run-many -t serve -p shell projects about contact certificates",
"start:certificates": "nx serve certificates",
```

(Apague o `"run:all"` se o gerador o recolocou.)

### 9. Valide

```bash
npx nx run-many -t test lint build          # tudo verde?
npm start                                    # sobe shell + remotes
```

- `http://localhost:4204` → o remote sozinho.
- `http://localhost:4200/certificados` → o remote dentro do shell.
- Pare o remote e recarregue `/certificados` → deve aparecer "Seção indisponível" (fallback funcionando).

### 10. Documente

- Tabela de portas em `docs/README.md` e tabela de apps no `README.md` da raiz.
- Manifesto de produção com a URL pública do novo remote (ver [07](./07-comandos-build-deploy.md#deploy)).

### Checklist do cenário B

- [ ] App gerado com `--bundler=webpack`
- [ ] `module-federation:init --type=remote` com porta única
- [ ] Script `run:all` removido do `package.json`
- [ ] `nx-welcome.ts`, `app.html`, `app.scss` removidos
- [ ] `remote-entry/entry.routes.ts` exportando `remoteRoutes`
- [ ] `exposes: { './Routes': ... }` no `webpack.config.js`
- [ ] `app.routes.ts` / `app.ts` / `app.spec.ts` do remote ajustados
- [ ] `styles.scss` importando o tema; `index.html` com `lang="pt-BR"`
- [ ] Tags `type:app` + `scope:<nome>` e regra no `eslint.config.mjs`
- [ ] Entrada no `mf.manifest.json` (chave = `name` do webpack)
- [ ] Rota no `app.routes.ts` do shell (antes de `**`) e link no menu + spec
- [ ] Scripts `start` e `start:<nome>`
- [ ] `nx run-many -t test lint build` verde; testado standalone, no shell e com o remote desligado
- [ ] Docs atualizadas

---

## Cenário C — Plugar um projeto que já existe

Os projetos do ecossistema (`01.carteira-saude`, `02.dose-certa`, ...) são apps Angular standalone, com
repositório próprio, builder `@angular/build` (esbuild) e, hoje, **Angular 21**. O MFE usa **Angular 22** e
builder **Webpack**. Por isso há duas estratégias.

### C1 — Trazer o código para dentro do monorepo (recomendado)

O projeto vira um remote como no cenário B, e o código dele é movido para `remote-entry/`.

1. Faça **todo o cenário B** com o nome do projeto (ex.: `health-card` → rota `/carteira-saude`).
2. Copie o código de `<projeto>/frontend/src/app/` para `apps/<nome>/src/app/remote-entry/`
   (páginas, `core/`, `shared/`, `models/`...).
3. Converta as rotas raiz do projeto (`app.routes.ts` original) em `remoteRoutes` no `entry.routes.ts`.
4. Mova os providers do `app.config.ts` original seguindo a tabela
   [Providers e dependências](./04-anatomia-de-um-remote.md#providers-e-dependências):
   - específicos da feature (`provideState`, `provideEffects`, services) → `providers` da rota em `entry.routes.ts`;
   - raiz (`provideStore()`, `provideHttpClient()`, animações, config de lib de UI) → `app.config.ts` do **shell**
     **e** do remote (para o modo standalone).
5. Instale as dependências do projeto **na raiz** (`npm install ng-zorro-antd ...`). No monorepo existe um só
   `package.json`; as versões precisam ser compatíveis com o Angular 22.
6. CSS global do projeto (tema da lib de UI, fontes, `theme.less`): importe no `styles.scss` do **shell** e do
   remote — o `styles.scss` do remote não é carregado dentro do shell.
7. Troque links absolutos (`routerLink="/carteira/dados"`) por relativos, pois o app passa a viver sob
   `/carteira-saude/...` dentro do shell.
8. Assets (`public/logo.png`, imagens): mova para o `public/` do shell ou use URLs absolutas
   (ver [cuidados comuns](./04-anatomia-de-um-remote.md#cuidados-comuns)).
9. Migre os testes (Jest → Vitest: em geral basta trocar `jest.fn()` por `vi.fn()`).
10. Valide como no passo 9 do cenário B.

✔ Versões sempre alinhadas, lint de fronteiras, cache/affected do Nx, um só CI.
✘ Trabalho inicial de migração; o repositório antigo passa a ser só histórico (ou é arquivado).

### C2 — Federar o projeto a partir do repositório dele

O projeto continua no próprio repositório e deploy, e o shell só aponta para o `remoteEntry.js` publicado.

Pré-requisitos **obrigatórios** (por causa de `singleton` + `strictVersion`):

- Mesmo **major** do Angular do MFE (hoje 22) e versões compatíveis de toda dependência compartilhada
  (`@angular/*`, `rxjs`...). Rode `ng update` no projeto antes.
- A cada atualização de Angular no MFE, o projeto externo precisa ser atualizado **junto**.

Passos, no repositório do projeto:

```bash
cd org-elizfab/01.carteira-saude/frontend
ng update @angular/core@22 @angular/cli@22
ng add @angular-architects/module-federation@22 --project frontend --port 6010 \
  --type remote --stack module-federation-webpack
```

O `ng add` troca o builder por um baseado em Webpack e cria `webpack.config.js` / `bootstrap.ts` — confira
o `angular.json` depois de rodar. Em seguida:

1. Crie `src/app/remote-entry/entry.routes.ts` exportando `remoteRoutes` e exponha `./Routes` no
   `webpack.config.js` com `name` único (ex.: `'healthCard'`).
2. Aplique os itens 4, 6, 7 e 8 do C1 (providers, CSS, links relativos, assets).
3. Libere CORS no servidor onde o projeto é publicado (ex.: `vercel.json` com header
   `Access-Control-Allow-Origin` para o domínio do shell).
4. No MFE, registre a URL de produção no manifesto e a rota no shell (passo 7 do cenário B).

✔ O projeto mantém repositório, pipeline e deploy próprios.
✘ Versões podem divergir e quebrar em runtime (`Unsatisfied version` — ver [08](./08-troubleshooting.md));
sem lint de fronteiras nem affected do Nx.

### E se o projeto não puder ir para o Angular 22?

Com majors diferentes, o Module Federation com `singleton` não funciona. A alternativa é empacotar o projeto
como **Web Component** (Angular Elements), com o Angular dele embutido e sem compartilhar dependências, e
o shell carregar esse elemento. Isso aumenta o tamanho do bundle e é uma estratégia avançada: só vale como
solução temporária enquanto o projeto não é atualizado.

---

## Convenções gerais

| Assunto | Convenção |
| --- | --- |
| Pastas | `apps/<nome>` para apps, `packages/<escopo>/<nome>` para libs |
| Seletor | Prefixo `ef-` em tudo |
| Componentes | Standalone, `OnPush`, signals para estado local |
| Nomes de arquivo | Sem sufixo `.component` (padrão Angular 20+): `certificates.ts`, `certificates.html` |
| Rotas no shell | Em português (`/certificados`), nome técnico em inglês (`certificates`) |
| Estilos | Só `var(--ef-*)`; nada de cores fixas |
| Imports entre apps | Proibidos. Compartilhe via lib em `packages/shared/` |
| Dependências npm | Sempre instaladas na raiz |
