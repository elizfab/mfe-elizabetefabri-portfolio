# 06 — Libs e estilos compartilhados

[← Índice](./README.md)

Código que mais de um app usa **não é copiado**: vai para `packages/`. Há dois tipos de compartilhamento aqui.

| O quê | Onde | Como é compartilhado |
| --- | --- | --- |
| TypeScript (modelos, dados, services, componentes de UI) | Libs Nx em `packages/shared/<nome>` | Alias em `tsconfig.base.json` (`@elizfab/shared/<nome>`) + Module Federation em runtime |
| Tema (tokens SCSS/CSS) | `packages/shared/styles/_theme.scss` | `@use` no `styles.scss` de cada app, em build |

## Libs Nx

### A lib existente: `@elizfab/shared/data`

- `models.ts`: interfaces `Project`, `ProjectCategory` e `Profile`.
- `profile.data.ts`: `PROFILE`.
- `projects.data.ts`: `PROJECTS`.
- `index.ts`: **API pública**. Só o que é exportado aqui pode ser importado pelos apps.

```ts
import { PROJECTS, PROFILE, Project } from '@elizfab/shared/data';
```

Nunca importe por caminho interno (`packages/shared/data/src/lib/...`), sempre pelo alias.

### Criando uma lib nova

Exemplo: componentes visuais reutilizáveis (`@elizfab/shared/ui`).

```bash
npx nx g @nx/angular:library packages/shared/ui --name=shared-ui \
  --importPath=@elizfab/shared/ui --standalone --prefix=ef
```

Depois:

1. Tags no `packages/shared/ui/project.json`: `["type:ui", "scope:shared"]`.
2. Exporte o que for público em `packages/shared/ui/src/index.ts`.
3. Rode `npx nx run-many -t build` para rebuildar **todos** os apps (o alias novo entra no `shared` do
   Module Federation de cada um).

Para uma lib usada por **um único** remote (ex.: lógica interna grande de `projects`), use
`packages/projects/<nome>` com tags `["type:feature", "scope:projects"]`: ela só poderá ser importada pelo
próprio `projects`.

### Tipos de lib (tag `type:*`)

| Tag | Conteúdo | Pode depender de |
| --- | --- | --- |
| `type:app` | Os apps em `apps/` | `feature`, `ui`, `data`, `util` |
| `type:feature` | Páginas/fluxos com lógica | (livre, a definir quando surgir) |
| `type:ui` | Componentes visuais "burros" | (livre, a definir quando surgir) |
| `type:data` | Modelos, dados, acesso a API | `data`, `util` |
| `type:util` | Funções puras | (livre, a definir quando surgir) |

## Fronteiras entre domínios (`eslint.config.mjs`)

```js
depConstraints: [
  { sourceTag: 'scope:shell',    onlyDependOnLibsWithTags: ['scope:shell', 'scope:shared'] },
  { sourceTag: 'scope:projects', onlyDependOnLibsWithTags: ['scope:projects', 'scope:shared'] },
  { sourceTag: 'scope:about',    onlyDependOnLibsWithTags: ['scope:about', 'scope:shared'] },
  { sourceTag: 'scope:contact',  onlyDependOnLibsWithTags: ['scope:contact', 'scope:shared'] },
  { sourceTag: 'scope:shared',   onlyDependOnLibsWithTags: ['scope:shared'] },
  { sourceTag: 'type:app',       onlyDependOnLibsWithTags: ['type:feature', 'type:ui', 'type:data', 'type:util'] },
  { sourceTag: 'type:data',      onlyDependOnLibsWithTags: ['type:data', 'type:util'] },
]
```

Na prática:

- `projects` **pode** importar `@elizfab/shared/*`.
- `projects` **não pode** importar nada com `scope:about`, e nenhuma lib `shared` pode importar código de um remote.
- A violação aparece como erro no `nx lint` (e no editor, com a extensão ESLint).

Todo remote novo precisa da sua linha `scope:<nome>` aqui (cenário B, passo 6).

## Atenção: libs compartilhadas e deploy

O `withModuleFederationPlugin` compartilha em runtime, além das dependências npm, **todas as libs do
`tsconfig.base.json`**, como singleton e com versão `0.0.0`. Quando o usuário está no shell, **uma** cópia
de `@elizfab/shared/data` é escolhida e usada por todos (normalmente a do shell).

Consequências:

- Alterou uma lib compartilhada? **Rebuilde e publique o shell e todos os remotes que a usam**
  (`npx nx affected -t build` mostra quais são).
- Mudanças que quebram a API da lib (renomear export, mudar interface) exigem publicar **tudo junto**.
- Prefira mudanças **aditivas** (campos opcionais, exports novos) para não quebrar remotes publicados com
  a versão antiga.
- Dados que mudam com frequência e que você quer publicar de forma independente devem ficar **dentro do
  remote** (ou vir de uma API), não em lib compartilhada.

## Tema global (`packages/shared/styles/_theme.scss`)

Contém:

- **Design tokens** como variáveis CSS em `:root`: `--ef-primary`, `--ef-surface`, `--ef-bg`, `--ef-text`,
  `--ef-muted`, `--ef-border`, `--ef-chip`.
- **Modo escuro** automático via `@media (prefers-color-scheme: dark)`, que redefine os mesmos tokens.
- **Reset** mínimo (`box-sizing`, fonte e cores do `body`).

Uso em cada app (`apps/<app>/src/styles.scss`):

```scss
@use '../../../packages/shared/styles/theme';
```

Uso em componentes: sempre pelas variáveis.

```scss
.card {
  background: var(--ef-surface);
  border: 1px solid var(--ef-border);
  color: var(--ef-text);
}
```

Regras:

- Não use cores fixas (`#7c3aed`) em componentes. Precisa de uma cor nova? Crie um token `--ef-*` no tema,
  com valor claro **e** escuro.
- Dentro do shell, quem carrega o tema é o **shell**. Mudou um token? Publicar o shell já muda a cor em
  todos os remotes.
- O tema é injetado em build (não é federado): para refletir um token novo no modo standalone de um remote,
  rebuilde esse remote também.
