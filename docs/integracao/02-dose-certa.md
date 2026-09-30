# 02 · Dose Certa → remote `dosecerta`

[← Painel de prontidão](./README.md) · Runbook: [docs/10](../10-integracao-projetos-existentes.md)

| Campo | Valor |
| --- | --- |
| Status | 🟡 **Pronto com adaptações** (complexidade **média**) |
| Origem | `org-elizfab/02.dose-certa/frontend` · [elizfab/dosecerta](https://github.com/elizfab/dosecerta) |
| Remote / porta / rota | `dosecerta` · 4205 · `/dose-certa` |
| Backend | Go, publicado no Render: `https://dose-certa-backend.onrender.com` |
| Diagnóstico em | 30/09/2026 |

## Estado atual (validado)

| Item | Resultado |
| --- | --- |
| Git | ✅ Limpo (branch `main`) |
| Build de produção | ✅ OK |
| Testes (Jest) | ✅ 22/22 (7 arquivos de spec — cobertura baixa) |
| Angular | 21.2 → **22** |
| UI | CSS próprio + **primeicons** (1 uso em `breadcrumbs.html`) + **chart.js** (2 arquivos) |
| Dependências sem uso | `primeng`, `@primeuix/themes`, `primeflex`, `@ngrx/entity`, `uuid` — **não trazer** |
| Estado | `provideStore()`/`provideEffects()` configurados, mas **sem nenhum uso** de Store → remover |
| HTTP | `provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor]))`; `ApiService` usa `environment.apiUrl` |
| Layout | `layouts/main-layout` (header + menu próprios) envolve todas as páginas |
| Tema | `ThemeService` escreve `data-theme` no `<html>`; chave `dc-theme` |
| Estilos globais | `:root` em 3 arquivos (`styles.scss`, `_variables.scss`, `_dosecerta.scss`), reset, typography |
| Links absolutos | 5 (`routerLink="/dashboard"`, `/medications`, `/weight`, `/calculator`) |
| `localStorage` | `dc-calc-history`, `dc-theme` (prefixados ✅) |
| CORS do backend | Controlado por `ALLOWED_ORIGINS` (`backend/app/internal/middleware/cors.go`) |

## O que falta, onde e como

| # | Item | O que fazer | Onde |
| --- | --- | --- | --- |
| 1 | F-01 | `chart.js` e `primeicons` no MFE | `package.json` do MFE |
| 2 | I-04/I-05 | `MainLayout` vira `DosecertaRoot` (layout do remote); `children` = rotas atuais; `redirectTo: 'dashboard'` relativo; sem `**` | `entry.routes.ts` |
| 3 | I-06 | Remover `provideStore`/`provideEffects`/`provideStoreDevtools`; `provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor]))` na rota | `entry.routes.ts` |
| 4 | I-07 | Os 3 blocos `:root` + typography em `.mfe-dosecerta`; `primeicons.css` no shell; não trazer reset | `dosecerta-root.scss` |
| 5 | I-08 | `ThemeService` → `ThemeStore` compartilhado; remover `dc-theme`; header do `MainLayout` sem toggle quando federado | `core/services/theme/theme-service.ts`, `layouts/main-layout/` |
| 6 | I-09 | `public/logo.png` → `/assets/dosecerta/logo.png` | `main-layout.html` |
| 7 | I-10 | 5 `routerLink="/..."` → relativos | `main-layout.html:4`, `dashboard.html:69,79,90,96` |
| 8 | I-11 | `environment*.ts` em `remote-entry/environment/` + `fileReplacements`; no Render: `ALLOWED_ORIGINS` += domínio do shell e `http://localhost:4200` | `project.json`, painel do Render |
| 9 | I-12 | 22 testes Jest → Vitest | `**/*.spec.ts` |

## Riscos

- **Render (plano free) hiberna**: a primeira chamada pode levar ~30–50 s. O remote deve mostrar estado de carregamento
  (verificar se já mostra) para não parecer quebrado dentro do portfólio.
