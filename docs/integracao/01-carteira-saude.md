# 01 · Carteira de Saúde → remote `carteira`

[← Painel de prontidão](./README.md) · Runbook: [docs/10](../10-integracao-projetos-existentes.md)

| Campo | Valor |
| --- | --- |
| Status | 🟡 **Pronto com adaptações** (complexidade **média-alta**) |
| Origem | `org-elizfab/01.carteira-saude/frontend` · [elizfab/carteira-saude](https://github.com/elizfab/carteira-saude) (branch local `develop`) |
| Remote / porta / rota | `carteira` · 4204 · `/carteira-saude` |
| Backend | Não tem (100% client-side, `localStorage`) |
| Diagnóstico em | 30/09/2026 |

## Estado atual (validado)

| Item | Resultado |
| --- | --- |
| Git | ✅ Limpo, sem pendências (branch `develop`) |
| Build de produção (`ng build`) | ✅ OK |
| Testes (Jest) | ✅ 182/182 |
| Angular | 21.2 → precisa ir para **22** (o MFE está em 22.1) |
| Builder | `@angular/build:application` com **SSR** → no MFE vira Webpack, sem SSR |
| UI | **ng-zorro-antd** (14 arquivos) + `theme.less` importando `ng-zorro-antd.less` inteiro; fonte **Carlito** (`@fontsource`) |
| Estado | **NgRx real**: `provideStore({ theme, perfil })` + `PerfilEffects` + `@ngrx/entity` (11 arquivos usam Store) |
| Estilos globais | `styles.scss` + `shared/styles/` (`:root` em `_variables.scss`, reset, typography, forms-grid) |
| Tema | `ThemeService` coloca `dark`/`light` no `<body>`; estado `theme` no NgRx |
| Links absolutos | 5 (`navigate(['/carteira'…])`, `navigate(['/preview'…])`) em `app-topbar`, `preview`, `opcoes` |
| Assets | `public/` com 3 arquivos (`logo.png` referenciado relativo) |
| `localStorage` | `carteira-saude:v1` (já com prefixo ✅) |
| Impressão | `PrintLayoutService` + `@media print` (relatório A4) |

## O que falta, onde e como

| # | Item | O que fazer | Onde |
| --- | --- | --- | --- |
| 1 | F-01 | `ng-zorro-antd@22`, `@ngrx/*@22`, `@fontsource/carlito` no MFE | `package.json` do MFE |
| 2 | I-04 | Copiar `src/app/*` para `remote-entry/`; **descartar** `main.server.ts`, `server.ts`, `app.config.server.ts`, `app.routes.server.ts` | `apps/carteira/src/app/remote-entry/` |
| 3 | I-05 | `routes` → `remoteRoutes` com `CarteiraRoot` como layout; `redirectTo: 'carteira/dados'` (relativo); remover `**` | `entry.routes.ts` |
| 4 | I-06 | `provideStore({ theme, perfil })` → `provideState('perfil', perfilReducer)` + `provideEffects(PerfilEffects)` na rota; **slice `theme` sai** (tema é do shell, F-03); `provideNzI18n(pt_BR)`, `provideNzIcons(ICONES_APP)` e `NzModalService` na rota | `entry.routes.ts`, `core/state/` |
| 5 | I-07 | `theme.less` (ng-zorro inteiro, **inclui estilos base globais**) → importar no `styles.scss` do **shell** e validar as outras seções; `_variables.scss` (`:root`) e `typography`/`forms-grid` escopados em `.mfe-carteira`; **não** trazer `_reset.scss` | `carteira-root.scss`, `apps/shell/src/styles.scss` |
| 6 | I-07 | Fontes Carlito (`@fontsource/carlito/*.css`) no `styles.scss` do shell e do remote | idem |
| 7 | I-08 | `ThemeService` + `core/state/theme.*` → usar `ThemeStore` de `@elizfab/shared/core`; o `app-topbar` do projeto: esconder o toggle de tema (e opcionalmente o próprio topbar) quando federado | `core/services/theme.service.ts`, `shared/components/app-topbar/` |
| 8 | I-08 | **Impressão A4**: dentro do shell, o cabeçalho do shell sairia no papel. Adicionar ao shell `@media print { ef-root .topbar { display: none } }` e validar o preview | `apps/shell/src/app/app.scss` |
| 9 | I-09 | `public/logo.png` → `apps/carteira/public/assets/carteira/logo.png`; referências para `/assets/carteira/logo.png` | templates do topbar |
| 10 | I-10 | Trocar os 5 `navigate(['/…'])` por navegação relativa ao remote | `app-topbar.component.ts:53,71,75`, `preview.component.ts:49`, `opcoes.component.ts:63` |
| 11 | I-12 | 182 testes Jest → Vitest (`jest.fn` → `vi.fn` etc.) | `**/*.spec.ts` |
| 12 | I-16 | README do repo original apontando para o MFE; decidir se o deploy standalone (Vercel) continua | repo `carteira-saude` |

## Riscos

- **CSS base do ng-zorro** (`ng-zorro-antd.less` inclui normalize/global de `html`/`body`) pode alterar tipografia de outras seções.
  Mitigação: validar todas as seções; se houver impacto, importar apenas os estilos dos componentes usados
  (`ng-zorro-antd/<componente>/style/index.less`) em vez do pacote inteiro.
- **Cor primária** do ng-zorro (`@primary-color: #2c5876`) é global: se outro remote usar ng-zorro, a cor será a mesma.
