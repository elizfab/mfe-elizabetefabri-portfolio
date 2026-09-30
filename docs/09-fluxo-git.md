# 09 — Fluxo Git, PRs automáticos e Danger

[← Índice](./README.md)

## Branches

```txt
feature/<nome-da-atividade> ──PR──► develop ──PR──► main
        (trabalho)               (integração)    (produção)
```

| Branch | Função | Proteção |
| --- | --- | --- |
| `main` | Código publicado. Só recebe PR vindo de `develop`. | PR obrigatório, checks `CI` + `Danger`, sem force-push, sem exclusão |
| `develop` | Integração das features. Só recebe PR de `feature/*`. | PR obrigatório, checks `CI` + `Danger`, sem force-push, sem exclusão |
| `feature/<nome-da-atividade>` | Uma atividade por branch. Criada a partir de `develop`. | — |

### Nomenclatura: `feature/<nome-da-atividade>`

- Prefixo **obrigatório** `feature/`: não existem `fix/`, `hotfix/`, `chore/`... O **tipo** da mudança vai no
  **título do PR** e nos commits (Conventional Commits).
- Nome em **kebab-case**: minúsculas, números e hífens simples. Máximo 60 caracteres.

| ✔ Aceito | ✘ Rejeitado | Por quê |
| --- | --- | --- |
| `feature/remote-certificados` | `feat/remote-certificados` | prefixo tem que ser `feature/` |
| `feature/corrige-link-contato` | `feature/Corrige-Link` | maiúsculas |
| `feature/lib-shared-ui` | `feature/lib_shared_ui` | underscore |
| `feature/adr-001` | `feature/lib/shared` | barra extra |
| | `hotfix/menu` | só `feature/*` é permitido |

Onde a regra é aplicada:

1. **Ruleset do GitHub "Nomenclatura de branches"**: o próprio GitHub recusa o `git push` de uma branch nova
   que não seja `main`, `develop` ou `feature/*`.
2. **Workflow `Branch name`** (`.github/workflows/branch-name.yml`): valida o formato completo (kebab-case,
   tamanho) em todo push e falha com a explicação do padrão.
3. **Danger** no PR (ver abaixo).

A regra fica em um único lugar: `packages/danger-rules/src/naming.ts` (pacote `@elizfab/danger-rules`). Para testar localmente:

```bash
node packages/danger-rules/src/cli.ts branch feature/remote-certificados
node packages/danger-rules/src/cli.ts title "feat(shell): adiciona rota de certificados"
```

## Commits e título do PR: Conventional Commits

```txt
<tipo>(<escopo opcional>): <descrição em minúsculas, 9+ caracteres>
```

| Tipo | Uso |
| --- | --- |
| `feat` | Funcionalidade nova (remote novo, tela, rota) |
| `fix` | Correção de bug |
| `docs` | Só documentação |
| `style` | Formatação, sem mudança de lógica |
| `refactor` | Refatoração sem mudar comportamento |
| `perf` | Performance |
| `test` | Testes |
| `build` | Build, dependências, configuração do Nx/Webpack |
| `ci` | Workflows, Danger |
| `chore` | Manutenção geral |
| `revert` | Reverte um commit |

Escopos sugeridos: o nome do projeto Nx (`shell`, `projects`, `about`, `contact`, `shared-data`) ou a área
(`workspace`, `docs`, `ci`, `styles`). Título do PR: máximo 72 caracteres.

**Commits por bloco de implementação**: cada commit deve ser uma unidade coerente, como "lib compartilhada",
"shell", "remote X" ou "docs". Isso deixa o histórico legível e facilita reverter um bloco.

## Passo a passo de uma atividade

```bash
git switch develop && git pull
git switch -c feature/remote-certificados

# ... implementa, commitando por bloco
git commit -m "feat(certificates): cria remote de certificados"
git commit -m "feat(shell): registra remote certificates no manifesto e nas rotas"
git commit -m "docs: adiciona certificates ao mapa de portas"

git push -u origin feature/remote-certificados
```

Ao dar push:

1. **Auto PR** abre o PR `feature/remote-certificados → develop`:
   - título gerado a partir da branch: `feat: remote certificados` (ajuste se quiser, por exemplo
     `feat(certificates): cria remote de certificados`);
   - descrição com a lista de commits + checklist do template;
   - você como responsável (assignee).
2. **CI** roda lint, testes e build.
3. **Danger** comenta no PR com erros, avisos e lembretes.
4. Edite a descrição (seção "Resumo" e "Blocos de implementação"). Ao salvar, o Danger roda de novo.
5. Com `CI` e `Danger` verdes, faça o merge em `develop`.

Novos pushes na mesma branch **não** abrem outro PR: o workflow reaproveita o existente e reexecuta o Danger.

**Release:** abra um PR `develop → main` (manual). O Danger valida o fluxo e o CI roda sobre `develop`.

## Regras do Danger (`dangerfile.ts`)

O `dangerfile.ts` roda em duas camadas:

1. **Regras da organização** — pacote [`@elizfab/danger-rules`](../packages/danger-rules/README.md): regras de PR
   **R-01…R-14** (fluxo, nomenclatura, descrição, issue vinculada, segredos, arquivos grandes, dependências, código
   esquecido, prévia de release) e **padrões de repositório P-01…P-22**. Tabelas completas em
   [12 — Padrões de repositório](./12-padroes-de-repositorio.md).
2. **Regras do MFE (M-xx)**, só deste repositório:

| ID | Regra | Nível |
| --- | --- | --- |
| M-01 | Remote novo com manifesto, rota no shell, `scope` no ESLint, script `start:<nome>`, docs e nome sem hífen | ❌ |
| M-02 | Import direto de outro app (`apps/x` → `apps/y`) | ❌ |
| M-03 | Cor fixa (`#hex`, `rgb()`) em `apps/` — usar tokens `var(--ef-*)` | ⚠️ |
| M-04 | Asset de remote com caminho relativo — usar `/assets/<remote>/...` | ⚠️ |
| M-05 | Código TS alterado sem nenhum `*.spec.ts` | ⚠️ |
| M-06 | Lembretes de deploy: manifesto, lib compartilhada, dependências | ℹ️ |
| M-07 | Projeto Nx novo sem mudança em `docs/` | ⚠️ |

### Automação de labels

Com o título válido, o Danger aplica a label `tipo:<tipo>` (ex.: `tipo:feat`) e remove outras `tipo:*`. Essas labels
organizam as notas de release ([11](./11-releases-e-packages.md)).

Para testar o Danger contra um PR existente, sem comentar nele:

```bash
GITHUB_TOKEN=$(gh auth token) npx danger pr https://github.com/elizfab/mfe-elizabetefabri-portfolio/pull/<n>
```

## Workflows (`.github/workflows/`)

| Arquivo | Dispara em | Faz |
| --- | --- | --- |
| `ci.yml` | push em `main`, `develop`, `feature/**` | `npm ci` → `nx run-many -t lint test build` (inclui os testes do projeto `danger-rules`). Check **CI**. |
| `branch-name.yml` | push em qualquer branch exceto `main`/`develop` | Valida `feature/<nome-da-atividade>`. Check **Branch name**. |
| `auto-pr.yml` | push em `feature/**` | Valida a branch, cria o PR para `develop` (se não existir) e roda o Danger. Check **Danger**. |
| `danger.yml` | PR `opened`, `edited`, `reopened`, `ready_for_review` | Danger (PRs abertos à mão, edição de título/descrição). Check **Danger**. |
| `danger-release.yml` | PR para `main` com novo commit (`synchronize`) | Danger nos PRs de release. Check **Danger**. |
| `release.yml` | push em `main` (merge do PR de release) | Calcula a versão, cria tag + release e publica pacotes npm e imagem Docker ([11](./11-releases-e-packages.md)). |

Por que o CI roda em `push` e não em `pull_request`: PRs criados pelo `GITHUB_TOKEN` (Auto PR) **não disparam**
outros workflows. Como o check fica no SHA do commit, o resultado do push vale para o PR. Pelo mesmo motivo,
o Auto PR roda o Danger ele mesmo, montando o evento do PR.

## Configurações do repositório

Aplicadas via API (`gh`) na criação do repositório. Para conferir: **Settings → Branches / Rules / Actions**.

- **Actions → Workflow permissions**: *Read and write* + *Allow GitHub Actions to create and approve pull
  requests* (necessário para o Auto PR).
- **Branch protection** em `main` e `develop`: PR obrigatório (0 aprovações, já que é projeto solo), checks
  `CI` e `Danger` obrigatórios, *conversation resolution*, sem force-push e sem exclusão.
- **Ruleset "Nomenclatura de branches"**: bloqueia criação de branches fora de `main`, `develop`, `feature/**`.
- **Merge**: squash e merge commit habilitados; branch apagada automaticamente após o merge.
