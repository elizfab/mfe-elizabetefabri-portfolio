# 08 — Troubleshooting

[← Índice](./README.md)

## "Seção indisponível" ao abrir uma rota

O shell não conseguiu carregar o remote. Abra o console do navegador: há um log
`[shell] falha ao carregar o remote "<nome>"` com o erro original.

| Causa | Como resolver |
| --- | --- |
| Remote não está rodando | `npm run start:<nome>` ou `npm start` |
| Nome no manifesto ≠ `name` do `webpack.config.js` do remote | Iguale os dois (é *case-sensitive*) |
| URL/porta errada no `mf.manifest.json` | Abra a URL do `remoteEntry.js` direto no navegador: deve baixar um JS |
| Remote não expõe `./Routes` | Confira o `exposes` do `webpack.config.js` |
| `entry.routes.ts` não exporta `remoteRoutes` | O shell lê exatamente `m.remoteRoutes` |
| Erro de CORS (produção) | Libere `Access-Control-Allow-Origin` no servidor do remote |

## `Unsatisfied version X of shared singleton module @angular/core (required ^Y)`

Host e remote foram buildados com versões diferentes de uma dependência compartilhada.

- Dentro do monorepo: rebuilde e publique **todos** os apps (`npm run build`). Isso acontece quando só parte
  deles foi publicada depois de atualizar dependências.
- Remote externo (cenário C2): atualize o projeto externo para as mesmas versões do `package.json` do MFE.

## `Shared module is not available for eager consumption`

Algum código Angular está rodando antes do bootstrap assíncrono. Confira se o `main.ts` do app contém
**apenas** `initFederation(...)` (shell) ou `import('./bootstrap')` (remotes), sem imports do Angular.

## `Cannot use 'import.meta' outside a module` no console (dev)

Aparece só no `nx serve` e vem de `styles.js`, um chunk de runtime vazio que o Webpack gera em modo dev e que o
Angular injeta sem `type="module"`. O CSS global é servido normalmente pelo `styles.css`. **Pode ignorar**:
não ocorre no build de produção.

## Estilos do remote aparecem standalone, mas não dentro do shell

O `styles.scss` do remote não é carregado no shell. Mova os estilos para o componente (`styleUrl`/`styles`)
ou, se for CSS de uma lib de UI, importe-o também no `styles.scss` do shell. Ver
[04 — Cuidados comuns](./04-anatomia-de-um-remote.md#cuidados-comuns).

## `NullInjectorError: No provider for X` só dentro do shell

O provider está no `app.config.ts` do remote, que não roda no shell. Mova-o para os `providers` da rota em
`entry.routes.ts` ou, se for global, para o `app.config.ts` do shell. Ver
[04 — Providers e dependências](./04-anatomia-de-um-remote.md#providers-e-dependências).

## Link dentro do remote leva para a página errada no shell

Links absolutos (`routerLink="/detalhe"`) ignoram o prefixo `/projetos` do shell. Use links relativos.

## Imagem do remote não carrega dentro do shell

Caminhos relativos são resolvidos na origem do shell (4200), não na do remote. Use URL absoluta ou mova o
arquivo para `apps/shell/public/`.

## Lint: `A project without tags matching at least one constraint cannot depend on any libraries`

O projeto não tem tags (ou tem uma tag sem regra). Adicione `type:*` e `scope:*` no `project.json` e a regra
`scope:<nome>` no `eslint.config.mjs`.

## Lint: `A project tagged with "scope:x" can only depend on libs tagged with ...`

Você importou código de outro domínio. Mova o código para uma lib `scope:shared` ou remova a dependência.

## `The "@nx/webpack" package is required by "@nx/angular:webpack-browser"`

Rode `npm install` na raiz (a dependência está no `package.json`). Se persistir:
`npm i -D @nx/webpack@<mesma versão do nx>`.

## `npm install` falha com `ERESOLVE`

Confirme se o `.npmrc` (com `legacy-peer-deps=true`) está na raiz e rode o comando **na raiz** do monorepo.

## `npm run run:all` → "This needs to be started in the root of an Angular project!"

Esse script é recolocado pelo gerador `module-federation:init` e não funciona em workspace Nx. Apague-o do
`package.json` e use `npm start`.

## Porta em uso (`EADDRINUSE` / `Port 4200 is already in use`)

Um dev server anterior ficou vivo. Descubra e encerre:

```bash
ss -ltnp | grep -E ':42[0-9]{2}'     # mostra o PID
kill <PID>
```

## Algo "não atualiza" mesmo depois de mudar o código

```bash
npx nx reset          # limpa o cache do Nx
rm -rf .angular       # limpa o cache do Angular/Webpack
```

Em produção, confira o `Cache-Control` do `remoteEntry.js` e do `mf.manifest.json` (ver
[07 — Deploy](./07-comandos-build-deploy.md#deploy)).
