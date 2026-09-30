# 11 — Releases e Packages no GitHub

[← Índice](./README.md)

Na lateral de todo repositório o GitHub mostra **Releases** e **Packages**. São duas coisas diferentes.

## Release: uma "foto" versionada do projeto

Uma **release** é uma versão publicada do código, com nome (ex.: `v0.1.0`), notas explicando o que mudou e,
opcionalmente, arquivos anexados (builds, zips). Toda release aponta para uma **tag** do Git, um marcador fixo em
um commit.

```txt
main:  ──●──────●──────────●────────────●──►
         │      │          │            │
       v0.1.0 v0.1.1     v0.2.0       v1.0.0     ← tags (imutáveis)
         └ release "v0.1.0": notas + link para o código daquele momento
```

Para que serve:

- **Histórico legível**: "o que entrou na versão 0.2.0?" fica respondido nas notas, sem garimpar commits.
- **Ponto de retorno**: se o deploy de hoje quebrar, você sabe exatamente qual código estava na versão anterior.
- **Comunicação**: quem acompanha o repositório (recrutador, colega) vê a evolução do projeto.
- **Automação**: workflows podem disparar deploy de produção quando uma release é publicada.

### Versionamento semântico (SemVer): `MAJOR.MINOR.PATCH`

| Muda | Quando | Exemplo |
| --- | --- | --- |
| `PATCH` | Correções sem mudança de comportamento esperado (`fix`) | `0.1.0 → 0.1.1` |
| `MINOR` | Funcionalidade nova compatível (`feat`), ex.: um remote novo | `0.1.1 → 0.2.0` |
| `MAJOR` | Mudança que quebra algo (`feat!`, `BREAKING CHANGE`), ex.: Angular 22 → 23 em todos os apps | `0.9.0 → 1.0.0` |

Enquanto o projeto está em `0.x`, ele é considerado "em construção". Uma sugestão para o MFE:
`v1.0.0` quando os 5 projetos estiverem integrados e publicados.

### Como as releases acontecem neste repositório (automático)

O fluxo encaixa no Git Flow do projeto ([09](./09-fluxo-git.md)): **release = merge de `develop` em `main`**.

```txt
PR develop → main  ──(Danger mostra a prévia: "será publicada a release v0.3.0")──► merge
      │
      ▼  .github/workflows/release.yml (push em main)
 1. elizfab-rules next-version   → versão pelos commits desde a última tag
 2. gh release create vX.Y.Z --generate-notes   → tag + release com notas por categoria
 3. npm publish  @elizfab/danger-rules@X.Y.Z, @elizfab/shared-data@X.Y.Z   (GitHub Packages)
 4. docker push  ghcr.io/elizfab/mfe-elizabetefabri-portfolio:X.Y.Z e :latest
```

| Commits desde a última tag | Próxima versão |
| --- | --- |
| só `docs`, `ci`, `chore`, `test`, `style` | nenhuma (sem release) |
| algum `fix`, `perf`, `refactor`, `build`, `revert` | `PATCH` |
| algum `feat` | `MINOR` |
| algum `feat!` / `BREAKING CHANGE:` | `MAJOR` (em `0.x`, vira `MINOR`) |

**Promover para `1.0.0`** (ou forçar uma versão): **Actions → Release → Run workflow** e informe `1.0.0`.

Release manual (se precisar, ex.: em outro repositório sem o workflow):

```bash
gh release create v0.1.0 --target main --title "v0.1.0" --generate-notes
```

### Exercícios para aprender

1. Leia as notas da `v0.1.0` (primeira release automática) e compare com os PRs mergeados.
2. Integre o PDI (primeiro remote real) e publique a `v0.2.0`. Compare as duas notas.
3. Crie uma release **pre-release** (`gh release create v0.3.0-rc.1 --prerelease ...`) antes de um deploy arriscado.
4. Anexe um artefato: `npx nx build shell && zip -r shell.zip dist/apps/shell && gh release upload v0.2.0 shell.zip`.
5. Avançado: adicionar ao `release.yml` o deploy de produção (ex.: Vercel/servidor) usando a imagem publicada.
6. Avançado: automatizar versão e changelog com [release-please](https://github.com/googleapis/release-please),
   que lê os Conventional Commits e abre sozinho o PR de release.

## Packages: um registro de pacotes do GitHub

**GitHub Packages** é um "npm/Docker Hub" dentro do GitHub: você publica **pacotes** (npm, imagens Docker, Maven,
NuGet...) ligados ao repositório/organização, e outros projetos os instalam.

| Tipo | O que seria publicado | Onde fica |
| --- | --- | --- |
| **npm** | Uma lib, ex.: `@elizfab/shared-data` | `npm.pkg.github.com` |
| **Container (Docker)** | Uma imagem, ex.: a API Go do Dose Certa | `ghcr.io/elizfab/dosecerta-api` |

Pacotes publicados por este repositório (a cada release):

| Pacote | Tipo | Para quê |
| --- | --- | --- |
| `@elizfab/danger-rules` | npm | Regras de PR, padrões de repositório e CLI `elizfab-rules` para **todos** os repositórios da org ([12](./12-padroes-de-repositorio.md)) |
| `@elizfab/shared-data` | npm | Modelos e dados do portfólio para **remotes externos** |
| `ghcr.io/elizfab/mfe-elizabetefabri-portfolio` | container | Portfólio completo (shell + remotes) em nginx |

Instalar um pacote npm da org (em qualquer projeto):

```bash
# .npmrc do projeto
@elizfab:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}

export NODE_AUTH_TOKEN=$(gh auth token)      # token com read:packages
npm install -D @elizfab/danger-rules
```

> Mesmo pacotes públicos do GitHub Packages exigem um token para instalar. Nos workflows, use
> `actions/setup-node` com `registry-url: https://npm.pkg.github.com` e `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.

Próximas ideias:

1. **Imagens Docker dos backends Go** (Dose Certa, Suplementos, Caderno) em `ghcr.io/elizfab/<projeto>-api`.
2. **`@elizfab/shared-core`** (contrato de tema e contexto do remote — issues #5 e #6) publicado junto, para remotes
   externos como o Suplementos Store (opção B do [relatório 03](./integracao/03-suplementos-store.md)).
