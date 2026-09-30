# 03 · Suplementos Store → remote `suplementos`

[← Painel de prontidão](./README.md) · Runbook: [docs/10](../10-integracao-projetos-existentes.md)

| Campo | Valor |
| --- | --- |
| Status | 🔴 **Bloqueado por decisão** (repositório privado) · complexidade técnica **alta** |
| Origem | `org-elizfab/03.suplementos-store/frontend` · `elizfab/suplementos-store` (**privado**) |
| Remote / porta / rota | `suplementos` · 4206 · `/suplementos-store` |
| Backend | Go + MongoDB (`backend/`, `docker-compose.yml`); produção sem URL absoluta definida |
| Diagnóstico em | 30/09/2026 |

## Bloqueio: o código é privado e o MFE é público

Trazer o código para `apps/suplementos` (C1) **publica o código-fonte** no repositório público do MFE.
Decida antes de começar (issue de decisão):

| Opção | Como | Prós | Contras |
| --- | --- | --- | --- |
| **A. Tornar público** | Mudar o repo para público e seguir o runbook normal (C1) | Mais simples; entra no fluxo do monorepo | Expõe o código |
| **B. Remote externo** (C2) | Manter privado; transformar o próprio projeto em remote (Angular 22 + `@angular-architects/module-federation`) e publicar o `remoteEntry.js` | Código continua privado; só o bundle é público | Versões precisam acompanhar o MFE manualmente; sem lint de fronteiras/affected |
| **C. Só vitrine** | Não integrar; manter o card em `/projetos` com screenshots | Zero esforço | Não demonstra o MFE com este projeto |

> O bundle JS publicado é sempre visível no navegador — a opção B protege o **repositório**, não o código compilado.

## Estado atual (validado)

| Item | Resultado |
| --- | --- |
| Git | ✅ Limpo (branch `main`) |
| Build de produção | ✅ OK |
| Testes (Jest) | ✅ 48/48 |
| Angular | 21.2 → **22** |
| UI | CSS próprio + **primeicons** (em `styles.scss` e `header.html`) |
| Dependências sem uso | `primeng`, `@primeuix/themes`, `primeflex`, `chart.js`, `@ngrx/entity`, `uuid` |
| Estado | `provideStore()` sem uso → remover |
| HTTP / Auth | `authInterceptor` + `apiErrorInterceptor`; `auth-guard.ts`; token em `localStorage` |
| API em produção | ⚠️ `apiUrl: '/api/v1'` **relativa** (depende de proxy no mesmo domínio) — dentro do shell iria para o domínio do shell |
| Links absolutos | ⚠️ **30** (`header`, `product-card`, `cart-side-sheet`, páginas) |
| Assets | 29 arquivos (imagens de produtos, ~500 KB) |
| `localStorage` | `suplementos.auth.token`, `.auth.user`, `.cart`, `.favorites`, `.theme` (prefixados ✅) |
| Tema | `data-theme` no `<html>` |

## O que falta, onde e como (após a decisão)

| # | Item | O que fazer | Onde |
| --- | --- | --- | --- |
| 0 | Decisão | Escolher A, B ou C (issue de decisão) | — |
| 1 | I-04/I-05 | Layout (header + cart side sheet) vira `SuplementosRoot`; rotas `produtos`, `produtos/:slug`, `categorias`, `favoritos`, `entrar`, `cadastro`, `checkout`, `pedidos/:id`, `minha-conta` como `children`; sem `**` | `entry.routes.ts` |
| 2 | I-06 | `provideHttpClient(withFetch(), withInterceptors([authInterceptor, apiErrorInterceptor]))` na rota; `withInMemoryScrolling` fica no shell; remover NgRx | `entry.routes.ts`, shell `app.config.ts` |
| 3 | I-07/I-08 | Escopar `:root`/typography/`_auth-form.scss`; tema → `ThemeStore`; remover `suplementos.theme` | `suplementos-root.scss`, `core/services/theme/` |
| 4 | I-09 | 29 imagens → `/assets/suplementos/...`; revisar `products` seed com URLs de imagem | `public/`, dados de produto |
| 5 | I-10 | **30 links absolutos** → relativos/`REMOTE_BASE_PATH` (maior esforço deste projeto) | `header.*`, `product-card.html`, `cart-side-sheet.ts`, páginas |
| 6 | I-11 | Publicar o backend com URL **absoluta HTTPS** (hoje só local/Docker) e usar em `environment.prod.ts`; CORS `ALLOWED_ORIGINS` += domínio do shell | `backend/`, `environment.prod.ts` |
| 7 | I-12 | 48 testes Jest → Vitest | `**/*.spec.ts` |

## Riscos

- Sem backend publicado, o remote funciona só com a API local (`docker compose up`) — o portfólio em produção mostraria erro de API.
- Checkout/login dentro do portfólio: deixar claro na UI que é uma **demo** (sem pagamento real).
