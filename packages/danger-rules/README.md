# @elizfab/danger-rules

Regras padrão da organização **elizfab** para todo repositório:

- **Danger**: regras de PR (fluxo Git, nomenclatura, descrição, segredos, arquivos grandes, dependências, código esquecido, prévia de release) e **padrões de repositório** (P-01…P-22).
- **CLI `elizfab-rules`**: validação de branch/título nos workflows, cálculo da próxima versão (SemVer) e auditoria de repositórios.

Código-fonte e documentação completa: [`elizfab/mfe-elizabetefabri-portfolio`](https://github.com/elizfab/mfe-elizabetefabri-portfolio) → `packages/danger-rules` e `docs/12-padroes-de-repositorio.md`.

## Instalação (GitHub Packages)

```bash
# .npmrc do projeto
@elizfab:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}

# localmente (token com read:packages)
export NODE_AUTH_TOKEN=$(gh auth token)
npm install -D danger @elizfab/danger-rules
```

Nos workflows, `actions/setup-node` com `registry-url: https://npm.pkg.github.com` e `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (permissão `packages: read`).

## dangerfile.ts

```ts
import { danger, fail, warn, message, markdown, schedule } from 'danger';
import { elizfabRules } from '@elizfab/danger-rules';

schedule(elizfabRules({ danger, fail, warn, message, markdown }));
// regras específicas do repositório podem vir depois
```

Opções: `integrationBranch` (`develop`), `productionBranch` (`main`), `largePrLines` (1500), `largeFileWarn` (500 KB),
`largeFileFail` (5 MB), `skipStandards`.

## CLI

```bash
npx elizfab-rules branch feature/minha-atividade      # valida a branch
npx elizfab-rules title "feat(pdi): cria remote"      # valida o título do PR
npx elizfab-rules title-from-branch feature/x-y       # "feat: x y"
npx elizfab-rules next-version                        # próxima versão pelo git local (vazio = sem release)
npx elizfab-rules standards .                         # padrões de repositório no diretório atual
GH_TOKEN=$(gh auth token) npx elizfab-rules audit elizfab/pdi elizfab/dosecerta
```

## elizfab.json

Todo repositório declara o próprio tipo; os padrões aplicados dependem dele.

```json
{
  "tipo": "mfe-remote",
  "nome": "pdi",
  "excecoes": { "P-03": "licença ainda em definição" }
}
```

Tipos: `mfe-host`, `mfe-remote`, `app-angular`, `backend-go`, `lib`, `org`.
