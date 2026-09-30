# shared-data (`@elizfab/shared/data`)

Lib compartilhada com os **modelos** e os **dados** do portfólio, usada pelo shell e pelos remotes.

| Arquivo | Conteúdo |
| --- | --- |
| `src/lib/models.ts` | Interfaces `Project`, `ProjectCategory`, `Profile` |
| `src/lib/profile.data.ts` | `PROFILE`: nome, cargo, resumo e links |
| `src/lib/projects.data.ts` | `PROJECTS`: projetos exibidos em `/projetos` |
| `src/index.ts` | API pública: só o que é exportado aqui pode ser importado |

```ts
import { PROJECTS, PROFILE } from '@elizfab/shared/data';
```

- Adicionar um projeto à vitrine: [docs/05 — Cenário A](../../../docs/05-adicionar-projetos.md#cenário-a--adicionar-um-projeto-à-vitrine)
- Esta lib é compartilhada **em runtime** pelo Module Federation. Ao alterá-la, publique o shell e os
  remotes que a usam: [docs/06](../../../docs/06-libs-e-estilos-compartilhados.md#atenção-libs-compartilhadas-e-deploy)
- Testes: `npx nx test shared-data`

## Pacote npm (GitHub Packages)

Publicado como **`@elizfab/shared-data`** a cada release do MFE (workflow `release.yml`), para uso por **remotes externos**
(repositórios fora do monorepo). Dentro do monorepo, continue importando pelo alias `@elizfab/shared/data`.

```bash
npm install @elizfab/shared-data   # requer .npmrc com @elizfab:registry=https://npm.pkg.github.com
```
