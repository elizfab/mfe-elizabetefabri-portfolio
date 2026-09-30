# 01 — Conceitos

[← Índice](./README.md)

## O problema que o MFE resolve

Em um app Angular tradicional, tudo vira **um único bundle**: mudar um texto na página "Sobre" exige
rebuild e redeploy do portfólio inteiro. Com micro frontends, o portfólio é dividido em **apps menores e
independentes**, e o navegador os junta **em tempo de execução**.

```txt
 Monolito                                   Micro frontends
 ┌───────────────────────────┐              ┌────────── shell (host) ──────────┐
 │ layout + home + projetos  │              │ layout + menu + home             │
 │ + sobre + contato         │   ───►       │   ├─ /projetos → remote projects │
 │ (1 build, 1 deploy)       │              │   ├─ /sobre    → remote about    │
 └───────────────────────────┘              │   └─ /contato  → remote contact  │
                                            └──────────────────────────────────┘
                                             4 builds, 4 deploys independentes
```

## As duas peças: host e remote

**Host (`shell`)** — o app que o usuário acessa. Responsável pelo que é **comum a todas as páginas**:
layout, cabeçalho, navegação, página inicial e tratamento de erro quando um remote não responde.

**Remote (`projects`, `about`, `contact`)** — um app Angular completo, com seu próprio `project.json`,
build, testes e porta. Ele **expõe** um conjunto de rotas (`./Routes`) que o host pluga no seu roteador.
Um remote também funciona **sozinho** (standalone): `npx nx serve about` abre só a página "Sobre" em
`http://localhost:4202`, o que facilita desenvolver e testar isoladamente.

## Module Federation clássico

Usamos o plugin **Module Federation do Webpack 5**, por meio da lib `@angular-architects/module-federation`.

- No **build do remote**, o Webpack gera, além do app normal, um arquivo `remoteEntry.js`, que descreve o
  que o remote expõe e quais dependências ele aceita compartilhar.
- No **navegador**, o host baixa esse `remoteEntry.js` e, quando o usuário entra em `/sobre`, baixa só os
  chunks necessários do remote `about`.
- As dependências marcadas como **shared** (Angular, RxJS, a lib `@elizfab/shared/data`...) são
  carregadas **uma vez só** e reaproveitadas. Por isso host e remotes precisam usar **as mesmas versões**
  (configuração `singleton: true, strictVersion: true`).

> A alternativa moderna é o **Native Federation** (`@angular-architects/native-federation`), baseado em ESM
> nativo e no builder esbuild do Angular, sem Webpack. O modelo mental (host, remotes, manifesto, shared)
> é o mesmo; uma migração futura troca a ferramenta, não a arquitetura.

## Host dinâmico e manifesto

O shell é um **dynamic host**: as URLs dos remotes **não ficam no código compilado**, e sim em
`apps/shell/public/mf.manifest.json`:

```json
{
  "about": "http://localhost:4202/remoteEntry.js",
  "contact": "http://localhost:4203/remoteEntry.js",
  "projects": "http://localhost:4201/remoteEntry.js"
}
```

Como esse arquivo é um asset estático, em produção basta publicar um manifesto com as URLs reais. Trocar
um remote de endereço, ou apontar para uma versão nova, **não exige rebuild do shell**.

## O que acontece quando o usuário abre o portfólio

```txt
1. Navegador baixa  shell/index.html → main.js
2. main.ts          initFederation('mf.manifest.json')   → lê o manifesto e registra os remotes
3. main.ts          import('./bootstrap')               → só agora o Angular inicia
4. Usuário clica em "Sobre" → rota /sobre
5. app.routes.ts    loadRemoteModule({ remoteName: 'about', exposedModule: './Routes' })
6. Navegador baixa  http://localhost:4202/remoteEntry.js + chunks do componente About
7. Angular do shell renderiza as rotas do remote dentro do <router-outlet>
   (usando a MESMA instância de Angular — graças ao "shared")
8. Se o passo 6 falhar (remote fora do ar), o shell mostra a tela "Seção indisponível"
```

O passo 3 (bootstrap assíncrono) é **obrigatório** no Module Federation: ele dá ao Webpack a chance de
negociar as dependências compartilhadas antes que qualquer código Angular rode.

## Por que Nx

O Nx é o "gerenciador" do monorepo:

- **Um repositório, vários apps**: todos os micro frontends e libs vivem juntos, com uma única
  instalação de dependências (um só `package.json` → versões sempre alinhadas, requisito do `strictVersion`).
- **Builds incrementais e cache**: `nx affected -t build` builda só o que mudou; resultados repetidos vêm do cache.
- **Geradores**: `nx g ...` cria apps e libs já configurados.
- **Isolamento de domínios**: tags (`scope:projects`, `scope:shared`...) e a regra de lint
  `@nx/enforce-module-boundaries` impedem que um remote importe código de outro remote.
- **Grafo de dependências**: `npx nx graph` mostra visualmente quem depende de quem.

## Regras de ouro da arquitetura

1. **Remotes não importam uns aos outros.** A integração é sempre em runtime, pelo shell.
2. **Código comum vai para `packages/`** (libs com tag `scope:shared`), nunca copiado entre apps.
3. **Todo remote expõe `./Routes`** — um contrato único, fácil de plugar no shell.
4. **O shell não depende de nenhum remote para subir.** Se um remote cair, só a seção dele fica indisponível.
5. **Uma versão de Angular para todos.** Atualizações de framework são feitas no monorepo inteiro de uma vez.
