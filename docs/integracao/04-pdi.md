# 04 · PDI → remote `pdi`

[← Painel de prontidão](./README.md) · Runbook: [docs/10](../10-integracao-projetos-existentes.md)

| Campo | Valor |
| --- | --- |
| Status | 🔴 **Bloqueado** — repositório git local corrompido e com trabalho não enviado · complexidade técnica **baixa-média** |
| Origem | `org-elizfab/04.pdi/frontend` · [elizfab/pdi](https://github.com/elizfab/pdi) |
| Remote / porta / rota | `pdi` · 4207 · `/pdi` |
| Backend | Não tem |
| Diagnóstico em | 30/09/2026 |

## Bloqueio: `.git` corrompido

`git fsck` no clone local encontra **12 objetos vazios** (`error: object file .git/objects/… is empty`); `git status`
e `git log` falham. O commit local (`5b0d3db`) é o mesmo que está no GitHub, **mas a pasta local tem alterações que
não estão no GitHub**: screenshots novos/alterados em `frontend/docs/screenshots/` e `frontend/scripts/screenshots.mjs` modificado.

**Reparo seguro** (preserva os arquivos de trabalho; faça com backup):

```bash
cd org-elizfab/04.pdi
mv .git ../pdi-git-corrompido-backup            # guarda o .git quebrado
git clone --no-checkout https://github.com/elizfab/pdi.git /tmp/pdi-fix
mv /tmp/pdi-fix/.git .git                       # .git saudável, arquivos locais intactos
git status                                      # deve listar só screenshots e screenshots.mjs
git add -A && git commit -m "chore: atualiza screenshots e script de captura" && git push
git fsck                                        # sem erros
```

## Estado atual (validado)

| Item | Resultado |
| --- | --- |
| Build de produção | ✅ OK |
| Testes (Jest) | ⚠️ 1/1 — **só 1 teste** para 23 componentes |
| Angular | 21.2 → **22** |
| Estrutura | App de **página única**: `bootstrapApplication(Pdi)`, `provideRouter([])` (sem rotas); abas controladas por estado |
| UI | CSS próprio + **@lucide/angular** (9 arquivos); prefixo de seletor `pdi-` |
| Estilos | ⚠️ `pdi.scss` (1.897 linhas) gerado como bundle separado (`inject: false`) e carregado em runtime com `<link href="/pdi.css">` (`pdi.ts:88-110`) → **caminho absoluto quebra no shell** |
| Manipulação global | ⚠️ troca o **favicon** (`swaplogo`), `document.body.style.overflow` (menu mobile), scroll progress no `documentElement` |
| Tema | chave `pdi-theme`; dark mode próprio |
| Assets | `public/images/icons/*` (referências relativas `images/icons/github.svg`), `logo.svg` |

## O que falta, onde e como

| # | Item | O que fazer | Onde |
| --- | --- | --- | --- |
| 0 | I-01 | Reparar o `.git` e enviar as alterações pendentes (acima) | `org-elizfab/04.pdi` |
| 1 | F-01 | `@lucide/angular` no MFE | `package.json` do MFE |
| 2 | I-04/I-05 | `Pdi` vira o componente da rota `''` (`remoteRoutes = [{ path: '', component: Pdi }]`) | `entry.routes.ts` |
| 3 | I-07 | **Remover `loadPdiStyles()`** e o bundle `pdi` com `inject: false`; usar `styleUrl: './pdi.scss'` com `ViewEncapsulation.None` e tudo escopado em `.mfe-pdi` (o arquivo já é "da página", então a troca é direta) | `pdi.ts`, `pdi.scss`, `project.json` |
| 4 | I-08 | `swaplogo()` (favicon) e `body.style.overflow` só quando **standalone** (`MFE_HOST`); tema → `ThemeStore`; remover `pdi-theme` | `pdi.ts`, `components/layout/*` |
| 5 | I-09 | `public/images/icons/*` → `/assets/pdi/images/icons/*` | templates de `components/sections/*` |
| 6 | I-10 | 1 link `[routerLink]="['/']"` (hero) → decidir se volta para a Home do shell (`/`) ou para o topo do PDI | `components/sections/hero/hero.html:35` |
| 7 | I-12 | Migrar o teste e **adicionar testes** (mínimo: render de cada aba, troca de tema, menu mobile) | `pdi.spec.ts` + novos specs |

## Por que é o primeiro da fila

Sem backend, sem NgRx, sem lib de UI com CSS global — depois do reparo do git, é o caminho mais curto para validar
o runbook e a fundação (F-03 tema, F-04 contexto, F-05 assets, F-06 estilos) com um projeto real.
