# Documentação do MFE — `mfe-elizabetefabri-portfolio`

Manual de uso do monorepo de **Micro Frontends** do portfólio. Aqui está tudo o que você precisa para
entender como o projeto funciona, o que cada pasta e arquivo faz e, principalmente, **como adicionar
projetos novos** sem quebrar o que já existe.

## Por onde começar

| Se você quer...                                                     | Leia                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entender o que é host, remote, manifesto e por que usamos Nx        | [01 — Conceitos](./01-conceitos.md)                               |
| Saber o que existe em cada pasta e em cada arquivo                  | [02 — Estrutura de pastas](./02-estrutura-de-pastas.md)           |
| Entender o app pai (shell) que carrega todos os outros              | [03 — Shell: o template pai](./03-shell-template-pai.md)          |
| Entender o "molde" que todo micro frontend (remote) segue           | [04 — Anatomia de um remote](./04-anatomia-de-um-remote.md)       |
| **Adicionar um projeto novo ao MFE**                                | [05 — Adicionar projetos](./05-adicionar-projetos.md)             |
| Compartilhar código, dados e tema entre os apps                     | [06 — Libs e estilos compartilhados](./06-libs-e-estilos-compartilhados.md) |
| Rodar, testar, gerar build e publicar                               | [07 — Comandos, build e deploy](./07-comandos-build-deploy.md)    |
| Resolver um erro                                                    | [08 — Troubleshooting](./08-troubleshooting.md)                   |
| Criar branch, commitar, abrir PR e entender o Danger                | [09 — Fluxo Git, PRs automáticos e Danger](./09-fluxo-git.md)     |
| **Integrar um projeto existente (01–05), item por item**            | [10 — Integração de projetos existentes](./10-integracao-projetos-existentes.md) |
| Ver se cada projeto está pronto para integrar e o que falta         | [Painel de prontidão](./integracao/README.md)                     |
| Entender e usar Releases e Packages do GitHub                       | [11 — Releases e Packages](./11-releases-e-packages.md)           |
| **Padrões que todo repositório da org deve ter e como criar um novo** | [12 — Padrões de repositório](./12-padroes-de-repositorio.md)   |

## Resumo em 30 segundos

- É um **monorepo Nx** com vários apps Angular 22 em `apps/` e código compartilhado em `packages/`.
- `apps/shell` é o **host** (o "template pai"): tem o layout, o menu e a página inicial. Ele **não conhece
  o código** dos outros apps — só sabe onde eles estão publicados.
- `apps/projects`, `apps/about` e `apps/contact` são **remotes** (micro frontends). Cada um é um app
  Angular completo, que roda sozinho e também é carregado **dentro** do shell, em tempo de execução.
- A ligação entre eles é feita pelo **Module Federation clássico** (`@angular-architects/module-federation`,
  Webpack 5) e por um arquivo JSON: `apps/shell/public/mf.manifest.json`.
- Consequência: **cada remote pode ser atualizado e publicado sozinho**, sem rebuild do shell.

## Mapa de portas

| App        | Tipo   | Porta | Rota no shell |
| ---------- | ------ | ----- | ------------- |
| `shell`    | host   | 4200  | `/`           |
| `projects` | remote | 4201  | `/projetos`   |
| `about`    | remote | 4202  | `/sobre`      |
| `contact`  | remote | 4203  | `/contato`    |
| `carteira` (reservado)    | remote | 4204  | `/carteira-saude`      |
| `dosecerta` (reservado)   | remote | 4205  | `/dose-certa`          |
| `suplementos` (reservado) | remote | 4206  | `/suplementos-store`   |
| `pdi` (reservado)         | remote | 4207  | `/pdi`                 |
| `caderno` (reservado)     | remote | 4208  | `/caderno-inteligente` |
| próximo                   | remote | 4209  | —                      |

> Convenção: o MFE usa a faixa **4200–4299**. A faixa **60xx** continua reservada para os projetos
> standalone do ecossistema (`carteira-saude` = 6010, `dose-certa` = 6011, ...), então não há conflito
> se você rodar os dois ao mesmo tempo.

## Glossário rápido

| Termo              | Significado                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Host / shell**   | App principal que o usuário abre. Carrega os remotes.                                        |
| **Remote**         | Micro frontend. App independente que expõe partes de si para o host.                        |
| **`remoteEntry.js`** | Arquivo gerado no build de cada remote. É o "cardápio" do que ele expõe.                   |
| **Exposed module** | O que o remote disponibiliza. Aqui, sempre `./Routes`.                                       |
| **Manifesto**      | `mf.manifest.json`: mapa `nome do remote → URL do remoteEntry.js`.                           |
| **Shared**         | Dependências (Angular, RxJS...) carregadas uma única vez e reaproveitadas por todos.          |
| **Tag / scope**    | Rótulo Nx no `project.json` usado para impedir imports indevidos entre domínios.             |
