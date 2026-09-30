# Painel de prontidão — integração dos projetos 01–05

[← Índice](../README.md) · Runbook item por item: [docs/10](../10-integracao-projetos-existentes.md)

Diagnóstico feito em **30/09/2026** diretamente no código de `org-elizfab/0N.<projeto>/frontend`
(build de produção, testes Jest, `git status`/`git fsck` e inspeção de providers, estilos, links, assets e API).

## Resumo

| # | Projeto | Remote · rota | Status | Build | Testes | Complexidade | Bloqueio / principal trabalho |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | [Carteira de Saúde](./01-carteira-saude.md) | `carteira` · `/carteira-saude` | 🟡 Pronto com adaptações | ✅ | ✅ 182/182 | Média-alta | ng-zorro global, NgRx `perfil` para feature state, impressão A4 |
| 02 | [Dose Certa](./02-dose-certa.md) | `dosecerta` · `/dose-certa` | 🟡 Pronto com adaptações | ✅ | ✅ 22/22 | Média | API no Render (CORS), 5 links absolutos, deps sem uso |
| 03 | [Suplementos Store](./03-suplementos-store.md) | `suplementos` · `/suplementos-store` | 🔴 Bloqueado (decisão) | ✅ | ✅ 48/48 | Alta | **Repositório privado** vs MFE público; API relativa; 30 links absolutos |
| 04 | [PDI](./04-pdi.md) | `pdi` · `/pdi` | 🔴 Bloqueado (git) | ✅ | ⚠️ 1/1 | Baixa-média | **`.git` local corrompido** + alterações não enviadas; CSS carregado por `/pdi.css` |
| 05 | [Caderno Inteligente](./05-caderno-inteligente.md) | `caderno` · `/caderno-inteligente` | 🔴 Bloqueado (origem) | ❌ | ❌ 119/166 | Alta | **Build falha (budget CSS)**, 47 testes falhando, API de produção inexistente |

Legenda: 🟢 pronto para integrar · 🟡 pronto, com adaptações conhecidas · 🔴 há um bloqueio a resolver antes

## Achados comuns aos 5 projetos

| Achado | Impacto | Tratado em |
| --- | --- | --- |
| Todos em **Angular 21.2**; o MFE está em **22.1** | As libs já têm versão 22 (`ng-zorro-antd@22`, `primeng@22`, `@ngrx/*@22`); o código sobe junto ao ser movido para o monorepo | F-01, I-04 |
| Builder `@angular/build` (esbuild); o MFE usa **Webpack** | Sem ação no código; o remote nasce com o builder certo | I-03 |
| Todos **zoneless** (sem `zone.js`) | Compatível com o MFE | — |
| Cada um tem **tema próprio** (`body.dark`, `data-theme`, `.app-dark`) e chave própria no `localStorage` | Dentro do shell, dois temas brigariam pelo `<html>`/`<body>` | F-03, I-08 |
| Cada um tem **reset + `:root` + `body`** globais | CSS vazaria entre remotes | F-06, I-07 |
| Links/redirects **absolutos** (1 a 30 por projeto) | Quebram sob o prefixo da rota do shell | I-10 |
| Assets referenciados por caminho relativo | 404 dentro do shell | F-05, I-09 |
| Testes em **Jest**; o MFE usa **Vitest** | Migração mecânica (`jest.fn` → `vi.fn`) | I-12 |
| NgRx configurado mas **sem uso** em 02, 03 e 05; PrimeNG instalado sem uso em 02 e 03; `uuid` sem uso em todos | Não trazer essas dependências | I-06 |
| Prefixo de seletor `app-` (PDI: `pdi-`) | Sem conflito (componentes standalone não colidem entre remotes); renomear para `ef-` é opcional | — |

## Ordem de execução

```txt
Fundação F-01…F-08
   └─► 04 PDI        (após reparar o git)
        └─► 02 Dose Certa
             └─► 01 Carteira de Saúde
                  └─► 05 Caderno Inteligente   (após corrigir build/testes na origem)
                       └─► 03 Suplementos Store (após a decisão sobre o repositório privado)
```

## Como atualizar este painel

Ao mudar o estado de um projeto (bloqueio resolvido, integração concluída), atualize a linha na tabela acima e o
relatório do projeto. Comandos usados no diagnóstico (na pasta `frontend/` de cada projeto):

```bash
git -C .. status --short && git -C .. fsck
npx ng build
CI=true npx jest --ci
```
