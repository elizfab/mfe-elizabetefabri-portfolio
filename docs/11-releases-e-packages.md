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

### Como publicar uma release neste repositório

O fluxo encaixa no Git Flow do projeto ([09](./09-fluxo-git.md)): **release = merge de `develop` em `main`**.

```bash
# 1. PR develop → main aprovado e mergeado
git switch main && git pull

# 2. Criar a release (a tag é criada junto), com notas geradas a partir dos PRs
gh release create v0.1.0 --target main --title "v0.1.0 — Estrutura inicial do MFE" --generate-notes

# 3. Conferir
gh release view v0.1.0 --web
```

Ou pela interface: **Releases → Create a new release → Choose a tag** (digite `v0.1.0`, "create new tag on publish")
**→ Target: `main` → Generate release notes → Publish**.

As notas são geradas a partir dos **PRs mergeados** desde a release anterior e agrupadas pelas categorias de
`.github/release.yml`, que usam as labels `tipo:*`:

| Label | Seção nas notas |
| --- | --- |
| `tipo:feat` | 🚀 Funcionalidades |
| `tipo:fix` | 🐛 Correções |
| `tipo:perf`, `tipo:refactor` | ⚡ Melhorias internas |
| `tipo:docs` | 📚 Documentação |
| `tipo:ci`, `tipo:build`, `tipo:test` | ⚙️ Build, CI e testes |
| demais | 🧹 Outras mudanças |

Você não precisa pôr essas labels à mão: **o Danger aplica `tipo:<tipo>` a partir do título do PR** (Conventional
Commits). Por isso vale caprichar no título.

### Exercícios para aprender

1. Depois do merge dos PRs #1 e #2 em `main`, publique a `v0.1.0` com `--generate-notes` e leia o resultado.
2. Integre o PDI (primeiro remote real) e publique a `v0.2.0`. Compare as duas notas.
3. Crie uma release **pre-release** (`gh release create v0.3.0-rc.1 --prerelease ...`) antes de um deploy arriscado.
4. Anexe um artefato: `npx nx build shell && zip -r shell.zip dist/apps/shell && gh release upload v0.2.0 shell.zip`.
5. Avançado: um workflow `on: release: types: [published]` que faz o deploy de produção.
6. Avançado: automatizar versão e changelog com [release-please](https://github.com/googleapis/release-please),
   que lê os Conventional Commits e abre sozinho o PR de release.

## Packages: um registro de pacotes do GitHub

**GitHub Packages** é um "npm/Docker Hub" dentro do GitHub: você publica **pacotes** (npm, imagens Docker, Maven,
NuGet...) ligados ao repositório/organização, e outros projetos os instalam.

| Tipo | O que seria publicado | Onde fica |
| --- | --- | --- |
| **npm** | Uma lib, ex.: `@elizfab/shared-data` | `npm.pkg.github.com` |
| **Container (Docker)** | Uma imagem, ex.: a API Go do Dose Certa | `ghcr.io/elizfab/dosecerta-api` |

Ideias de uso neste ecossistema (ótimas para aprender):

1. **Imagens Docker dos backends Go** (Dose Certa, Suplementos, Caderno): um workflow faz `docker build` e
   `docker push ghcr.io/elizfab/<projeto>-api:<versão>` a cada release. O deploy (Render, VPS) passa a baixar a imagem pronta.
2. **Libs do MFE como pacote npm**: publicar `@elizfab/shared-data` e `@elizfab/shared-core` para que um **remote
   externo** (ex.: Suplementos Store mantido privado — opção B do [relatório 03](./integracao/03-suplementos-store.md))
   use os mesmos modelos e o mesmo contrato de tema sem copiar código.

Os dois exigem autenticação com token (`GITHUB_TOKEN` nos workflows, PAT localmente) e são um bom próximo passo
depois das releases.
