# 05 · Caderno Inteligente → remote `caderno`

[← Painel de prontidão](./README.md) · Runbook: [docs/10](../10-integracao-projetos-existentes.md)

| Campo | Valor |
| --- | --- |
| Status | 🔴 **Bloqueado** — build de produção e testes quebrados na origem · complexidade técnica **alta** |
| Origem | `org-elizfab/05.caderno-inteligente/frontend` · [elizfab/caderno-inteligente](https://github.com/elizfab/caderno-inteligente) |
| Remote / porta / rota | `caderno` · 4208 · `/caderno-inteligente` |
| Backend | Go (`backend/app`); **produção não configurada** (`apiUrl: 'https://api.SEU-PROJETO.com'`) |
| Diagnóstico em | 30/09/2026 |

## Bloqueios na origem (I-01)

1. **Build de produção falha** (`ng build`):
   ```
   ERROR: src/app/pages/study-labs/courses/course-detail/course-detail.component.scss exceeded maximum budget.
          Budget 8.00 kB was not met by 9.76 kB with a total of 17.75 kB.
   ```
   Também há avisos: bundle inicial com 992 kB (limite 500 kB) e `study-card-grid.scss` com 4,27 kB.
   **Como resolver:** dividir `course-detail.component.scss` (extrair partes para estilos compartilhados/parciais) ou,
   conscientemente, ajustar o `anyComponentStyle` no `angular.json`. Rever o bundle inicial (lazy loading das páginas pesadas).
2. **Testes: 47 de 166 falham (6 suítes)**:

   | Suíte | Causa encontrada |
   | --- | --- |
   | `shared/components/sidebar/sidebar.spec.ts` | `ReferenceError: provideAppIcons is not defined` — falta o `import` no spec |
   | `shared/components/back-button/back-button.spec.ts` | Expectativas de visibilidade em `/estudos-labs` e `/projetos` divergem do componente atual |
   | `shared/components/projects/project-card-grid/project-card-grid.spec.ts` | Falha no `should create` (provider/ícones ausentes no TestBed) |
   | `shared/components/study/study-card-grid/study-card-grid.spec.ts` | Idem (setup do TestBed) |
   | `shared/components/study/study-detail-template/study-detail-template.spec.ts` | Idem |
   | `pages/projects/projetos.spec.ts` | Idem |

   **Como resolver:** no repositório original, `npx jest <arquivo>` suíte por suíte; adicionar os imports/providers
   faltantes (ex.: `import { provideAppIcons } from '...'`) e atualizar as expectativas do `back-button`.
3. **API de produção inexistente**: sem URL real, o remote só funciona com o backend local. Não bloqueia a integração
   local, mas **bloqueia o deploy** no portfólio.

## Estado atual

| Item | Resultado |
| --- | --- |
| Git | ✅ Limpo (branch `main`) |
| Build de produção | ❌ Falha (budget) |
| Testes (Jest) | ❌ 119/166 passam |
| Angular | 21.2 → **22** |
| UI | **PrimeNG** (22 arquivos) com `providePrimeNG({ preset: Aura, darkModeSelector: '.app-dark' })` + `@lucide/angular` + `provideAppIcons()` |
| Dependências sem uso | `chart.js`, `primeflex`, `@ngrx/entity`, `uuid`; `provideStore()` sem uso |
| HTTP / Auth | `authInterceptor` + `apiErrorInterceptor`; guards `auth.guard.ts` e `admin.guard.ts`; rotas `login`/`logout`; sessão em `techbook.session` |
| Rotas | Muitas seções (`dashboard`, `backend`, `cloud`, `devops`, `frontend`, `estudos-labs`, `projetos`, `culinaria`, `admin/usuarios`...) com `redirectTo: '/dashboard'` **absoluto** |
| Links absolutos | ⚠️ **18** (`header.html`, `sidebar.html`, páginas de culinária, admin, `auth.service.ts:127`) |
| Tema | classe `app-dark` no `<html>` (casa com o `darkModeSelector` do PrimeNG); chave `techbook.theme` |
| Estilos globais | `styles.scss` com `:root` e `body`; reset e typography |
| Assets | ⚠️ `public/` com **7,9 MB** (`assets/images/**`, fontes **Oswald** em `assets/fonts`, `logo.png` de 1,2 MB); referências relativas `assets/images/...` |

## O que falta, onde e como

| # | Item | O que fazer | Onde |
| --- | --- | --- | --- |
| 0 | I-01 | Corrigir build (budget) e as 6 suítes de teste **no repositório original** | `05.caderno-inteligente/frontend` |
| 1 | F-01/F-02 | `primeng@22`, `@primeuix/themes`, `@lucide/angular` no MFE; `providePrimeNG` (Aura, `.app-dark`) no shell | MFE |
| 2 | I-05 | Layout (header + sidebar) vira `CadernoRoot`; `redirectTo: 'dashboard'` **relativo**; `login`/`logout` como filhos; guards nos `canActivate` das rotas | `entry.routes.ts` |
| 3 | I-06 | `provideHttpClient(withFetch(), withInterceptors([authInterceptor, apiErrorInterceptor]))` e `provideAppIcons()` na rota; remover NgRx e `providePrimeNG` (vem do shell) | `entry.routes.ts` |
| 4 | I-07 | `:root`/`body` do `styles.scss` → `.mfe-caderno`; fonte Oswald: `@font-face` com URL `/assets/caderno/fonts/...` | `caderno-root.scss` |
| 5 | I-08 | `ThemeService` → `ThemeStore` (que já aplica `app-dark`); remover `techbook.theme` | `core/services/theme/theme.service.ts` |
| 6 | I-09 | `public/assets/*` → `apps/caderno/public/assets/caderno/*`; trocar `assets/images/...` → `/assets/caderno/images/...`; **otimizar imagens** (logo de 1,2 MB → WebP/SVG) | `public/`, templates |
| 7 | I-10 | 18 links absolutos + `auth.service.ts:127` (`navigate(['/login'])`) → relativos | `header.html`, `sidebar.html`, `auth.service.ts`, páginas |
| 8 | I-11 | Publicar o backend e preencher `apiUrl` real; `ALLOWED_ORIGINS` += domínio do shell | `backend/`, `environment.prod.ts` |
| 9 | I-12 | 166 testes Jest → Vitest (depois de todos verdes na origem) | `**/*.spec.ts` |

## Riscos

- **PrimeNG é global**: o preset/cores definidos no shell valem para qualquer remote que use PrimeNG.
- **Peso**: o maior projeto da lista (bundle inicial ~1 MB + 7,9 MB de assets). Dentro do shell, só carrega ao entrar na rota
  (lazy), mas as imagens precisam de otimização antes do deploy.
