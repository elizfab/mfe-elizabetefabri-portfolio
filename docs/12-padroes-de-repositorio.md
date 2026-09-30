# 12 — Padrões de repositório da organização

[← Índice](./README.md)

Todo repositório da org **elizfab** segue o mesmo padrão mínimo: documentação, fluxo Git, automação, releases e
higiene. Os padrões são **verificados automaticamente** em todo PR pelo Danger e podem ser auditados a qualquer momento.

```txt
@elizfab/danger-rules  (packages/danger-rules, publicado no GitHub Packages a cada release)
 ├── naming.ts      branch feature/<atividade>, título Conventional Commits, fluxo feature → develop → main
 ├── version.ts     próxima versão SemVer a partir dos commits
 ├── standards.ts   padrões de repositório P-01…P-22 (dependem do tipo em elizfab.json)
 ├── danger.ts      regras de PR R-01…R-14 + relatório dos padrões
 └── cli.ts         elizfab-rules: branch | title | next-version | standards | audit
        │
        ├─► dangerfile.ts de cada repositório   (bloqueia o merge quando um padrão obrigatório falta)
        ├─► workflows de cada repositório        (branch-name, auto-pr, release)
        └─► auditoria sob demanda                (elizfab-rules audit elizfab/<repo>)
```

## 1. `elizfab.json`: a identidade do repositório

Todo repositório tem, na raiz:

```json
{
  "tipo": "mfe-remote",
  "nome": "pdi",
  "excecoes": {}
}
```

| Tipo | Quando usar |
| --- | --- |
| `mfe-host` | App que carrega remotes (este repositório) |
| `mfe-remote` | Micro frontend carregado pelo host (repositórios novos que vão para o MFE) |
| `app-angular` | App Angular standalone que não é remote |
| `backend-go` | API em Go |
| `lib` | Biblioteca publicada como pacote |
| `org` | Repositórios da organização (`.github`, templates) |

**Exceções**: um padrão pode ser desligado **com justificativa**, que aparece no relatório do Danger:
`"excecoes": { "P-03": "licença ainda em definição" }`. Use com parcimônia; toda exceção deve ter prazo ou motivo claro.

## 2. Padrões (P-xx)

`❌` = obrigatório (bloqueia o merge) · `⚠️` = recomendado (aviso)

| ID | Padrão | Nível | Tipos | Como atender |
| --- | --- | --- | --- | --- |
| P-01 | README com título, "Como executar" e stack/arquitetura | ❌ | todos | Seções `# Título`, `## Como executar`, `## Stack` (ou Arquitetura/Tecnologias) |
| P-02 | `elizfab.json` válido | ❌ | todos | Seção 1 acima |
| P-03 | `LICENSE` | ⚠️ | apps e libs | Escolha uma licença (ex.: MIT) — decisão da autora |
| P-04 | `docs/` ou `ROADMAP.md` | ⚠️ | apps e libs | Template de roadmap em `org-elizfab/__MFE/.github/assets/documentation/templates` |
| P-05 | `.gitignore` com `node_modules`, `dist`, `.env` | ❌ | todos | Copie do template |
| P-06 | Nenhum `.env` versionado | ❌ | todos | Só `.env.example`; segredos em GitHub Secrets / variáveis do provedor |
| P-07 | `.editorconfig` | ⚠️ | todos | Copie do template |
| P-08 | Template de PR | ❌ | todos | `.github/pull_request_template.md` |
| P-09 | Workflows `ci`, `branch-name`, `auto-pr`, `danger` | ❌ | todos | `.github/workflows/*.yml` do template |
| P-10 | Workflow `release` | ⚠️ | apps e libs | `.github/workflows/release.yml` |
| P-11 | Categorias das notas de release | ⚠️ | todos | `.github/release.yml` |
| P-12 | `dangerfile.ts` com `@elizfab/danger-rules` | ❌ | todos | Ver README do pacote |
| P-13 | `package-lock.json` | ❌ | Node | `npm install` e commit do lockfile |
| P-14 | Scripts `build`, `test`, `lint` | ❌ | Node | `package.json` |
| P-15 | Versão do Node (`.nvmrc` / `engines`) | ⚠️ | Node | `.nvmrc` com `22` |
| P-16 | Remote expõe `./Routes` | ❌ | `mfe-remote` | `webpack.config.js` |
| P-17 | `remote-entry/entry.routes.ts` com `remoteRoutes` | ❌ | `mfe-remote` | Contrato do [docs/04](./04-anatomia-de-um-remote.md) |
| P-18 | `@angular-architects/module-federation` | ❌ | `mfe-host`, `mfe-remote` | Mesma major do Angular do MFE |
| P-19 | Sem script `run:all` | ❌ | `mfe-host`, `mfe-remote` | Remover do `package.json` |
| P-20 | Host com `mf.manifest.json` | ❌ | `mfe-host` | `public/mf.manifest.json` |
| P-21 | `go.mod` | ❌ | `backend-go` | `go mod init` |
| P-22 | `Dockerfile` e `.env.example` | ⚠️ | `backend-go` | Imagem publicada no `ghcr.io` |

"Node" = `mfe-host`, `mfe-remote`, `app-angular`, `lib`. "apps e libs" = todos exceto `org`.

## 3. Regras de PR (R-xx) — valem para todo repositório

| ID | Regra | Nível |
| --- | --- | --- |
| R-01 | Fluxo `feature/* → develop` e `develop → main` | ❌ |
| R-02 | Branch `feature/<nome-da-atividade>` (kebab-case, ≤ 60) | ❌ |
| R-03 | Título Conventional Commits (≤ 72); aplica a label `tipo:<tipo>` | ❌ |
| R-04 | Descrição com ≥ 50 caracteres; template preenchido | ❌ / ⚠️ |
| R-05 | Issue vinculada (`Closes #n` ou `Refs #n`) — exceto release | ⚠️ |
| R-06 | Responsável (assignee) | ⚠️ |
| R-07 | Commits Conventional Commits | ⚠️ |
| R-08 | **Segredos no diff** (tokens GitHub, AWS, chaves privadas, URI MongoDB com senha, `sk-…`) | ❌ |
| R-09 | Arquivo novo ≥ 500 KB (aviso) / ≥ 5 MB (bloqueio), exceto lockfiles | ⚠️ / ❌ |
| R-10 | Dependências sem lockfile; `version` alterada à mão | ❌ / ⚠️ |
| R-11 | `.only`/`fit`/`xit`/`debugger` (bloqueio); `console.log` em `src/`/`apps/` (aviso) | ❌ / ⚠️ |
| R-12 | PR com mais de 1500 linhas | ⚠️ |
| R-13 | PR de release: prévia da versão que será publicada; label `ignorar-release` (fica fora das notas) | ℹ️ |
| R-14 | Workflows/dangerfile/`elizfab.json` alterados | ℹ️ |

Este repositório tem ainda regras próprias de micro frontends (**M-01…M-07**, no `dangerfile.ts`): checklist de remote
novo, imports entre apps, cores fixas, assets relativos, testes, lembretes de deploy e documentação de projetos novos.

## 4. Como criar um repositório novo (passo a passo)

1. **Criar a partir do template**
   ```bash
   gh repo create elizfab/<nome> --public --template elizfab/template-remote-mfe --clone
   cd <nome>
   ```
2. **Configurar o GitHub** (proteções, ruleset de branches, labels, permissões do Actions):
   ```bash
   ./scripts/setup-repo.sh elizfab/<nome>
   ```
3. **Ajustar a identidade**: `elizfab.json` (`tipo`, `nome`), `README.md`, `package.json` (`name`), porta e nome do remote.
4. **Instalar** (precisa de token com `read:packages` para o `@elizfab/danger-rules`):
   ```bash
   export NODE_AUTH_TOKEN=$(gh auth token)
   npm install
   npx elizfab-rules standards .          # tudo ✅?
   ```
5. **Primeira entrega**: `git switch -c feature/<atividade>` → commits → `git push -u origin feature/<atividade>`.
   O PR para `develop` abre sozinho; o Danger valida as regras e os padrões.
6. **Integrar ao MFE**: registrar o remote no manifesto do shell (docs/05, cenário C2) e abrir a issue de integração.

## 5. Auditoria de repositórios

Verifique qualquer repositório da org sem precisar clonar:

```bash
GH_TOKEN=$(gh auth token) node packages/danger-rules/src/cli.ts audit elizfab/pdi elizfab/dosecerta elizfab/carteira-saude
# ou, fora deste repositório, com o pacote instalado:
GH_TOKEN=$(gh auth token) npx elizfab-rules audit elizfab/<repo>
```

A saída é uma tabela por repositório com o que falta e como corrigir (sai com código 1 se algum obrigatório falhar).

## 6. Como evoluir as regras

1. Edite `packages/danger-rules/src/*` e os testes (`*.spec.ts`); rode `npx nx test danger-rules`.
2. Atualize as tabelas deste documento.
3. PR `feature/*` → `develop`, depois release (`develop → main`): o workflow publica a nova versão do pacote.
4. Nos outros repositórios: `npm update @elizfab/danger-rules` em uma branch `feature/atualiza-danger-rules`.

> Mudanças que tornam um padrão **obrigatório** quebram PRs de repositórios existentes: prefira introduzir como
> `warn`, dar tempo para adequação e só depois promover a `fail` — e registre isso nas notas da release.
