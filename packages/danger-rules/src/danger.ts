// Regras de PR padrão da organização elizfab, para qualquer repositório.
// Uso no dangerfile.ts do repositório:
//
//   import { danger, fail, warn, message, markdown, schedule } from 'danger';
//   import { elizfabRules } from '@elizfab/danger-rules';
//   schedule(elizfabRules({ danger, fail, warn, message, markdown }));
//
// O DSL do Danger é passado como argumento porque o Danger não transpila nem injeta globais em node_modules.
import { validateBranch, validateFlow, validateTitle, isConventionalCommit, TITLE_PATTERN } from './naming.ts';
import { checkStandards, localFiles, standardsTable } from './standards.ts';
import { nextVersion } from './version.ts';

type Report = (msg: string, file?: string, line?: number) => void;

/** Subconjunto do DSL do Danger usado aqui (tipado de forma estrutural para não depender da versão). */
export interface DangerApi {
  danger: {
    github: {
      pr: {
        title: string;
        body: string | null;
        head: { ref: string; sha: string };
        base: { ref: string };
        additions?: number;
        deletions?: number;
        draft?: boolean;
        assignee?: unknown;
        assignees?: unknown[];
        milestone?: unknown;
        labels?: { name: string }[];
      };
      thisPR: { owner: string; repo: string; number: number };
      api: {
        issues: {
          addLabels(p: { owner: string; repo: string; issue_number: number; labels: string[] }): Promise<unknown>;
          removeLabel(p: { owner: string; repo: string; issue_number: number; name: string }): Promise<unknown>;
        };
        repos: {
          listTags(p: { owner: string; repo: string; per_page?: number }): Promise<{ data: { name: string }[] }>;
          compareCommits(p: { owner: string; repo: string; base: string; head: string }): Promise<{
            data: { commits: { commit: { message: string } }[] };
          }>;
        };
      };
    };
    git: {
      modified_files: string[];
      created_files: string[];
      deleted_files: string[];
      commits: { sha: string; message: string }[];
      diffForFile(f: string): Promise<{ added: string } | null>;
      JSONDiffForFile(f: string): Promise<Record<string, unknown>>;
    };
  };
  fail: Report;
  warn: Report;
  message: Report;
  markdown: (md: string) => void;
}

export interface ElizfabRulesOptions {
  /** Base das features (padrão: develop). */
  integrationBranch?: string;
  /** Branch de produção (padrão: main). */
  productionBranch?: string;
  /** Diretório raiz do checkout para os padrões de repositório (padrão: cwd). */
  root?: string;
  /** Linhas (sem lockfiles) a partir das quais o PR é considerado grande. */
  largePrLines?: number;
  /** Tamanho (bytes) a partir do qual um arquivo novo gera aviso / falha. */
  largeFileWarn?: number;
  largeFileFail?: number;
  /** Desliga a verificação de padrões de repositório. */
  skipStandards?: boolean;
}

const SECRET_PATTERNS: [RegExp, string][] = [
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'token do GitHub'],
  [/github_pat_[A-Za-z0-9_]{50,}/, 'token do GitHub (fine-grained)'],
  [/AKIA[0-9A-Z]{16}/, 'chave de acesso AWS'],
  [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'chave privada'],
  [/mongodb(\+srv)?:\/\/[^\s:'"]+:[^\s@'"]+@/, 'string de conexão MongoDB com senha'],
  [/sk-[A-Za-z0-9_-]{32,}/, 'chave de API (sk-...)'],
];

const LOCKFILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum)$/;

async function addedLines(api: DangerApi, file: string): Promise<string[]> {
  const diff = await api.danger.git.diffForFile(file);
  if (!diff) return [];
  return diff.added
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1));
}

async function syncTypeLabel(api: DangerApi) {
  const { pr, thisPR } = api.danger.github;
  const type = pr.title.match(/^([a-z]+)/)?.[1];
  if (!type) return;
  const wanted = `tipo:${type}`;
  const current = pr.labels?.map((l) => l.name) ?? [];
  const { owner, repo, number } = thisPR;
  try {
    for (const name of current.filter((l) => l.startsWith('tipo:') && l !== wanted)) {
      await api.danger.github.api.issues.removeLabel({ owner, repo, issue_number: number, name });
    }
    if (!current.includes(wanted)) {
      await api.danger.github.api.issues.addLabels({ owner, repo, issue_number: number, labels: [wanted] });
    }
  } catch {
    api.warn(`Não foi possível aplicar a label \`${wanted}\` (rode scripts/setup-repo.sh para criar as labels).`);
  }
}

async function releasePreview(api: DangerApi) {
  const { thisPR, pr } = api.danger.github;
  try {
    const tags = (await api.danger.github.api.repos.listTags({ owner: thisPR.owner, repo: thisPR.repo, per_page: 100 })).data
      .map((t) => t.name)
      .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
    const last = tags[0] ?? null;
    const messages = last
      ? (await api.danger.github.api.repos.compareCommits({ owner: thisPR.owner, repo: thisPR.repo, base: last, head: pr.head.sha })).data.commits.map(
          (c) => c.commit.message,
        )
      : [];
    const next = nextVersion(last, messages);
    api.message(
      next
        ? `🏷️ Ao mergear em \`${pr.base.ref}\`, será publicada a release **v${next}**${last ? ` (anterior: ${last})` : ''}.`
        : `🏷️ Nenhum commit \`feat\`/\`fix\`/\`perf\`/\`refactor\` desde ${last}: o merge **não** gera release nova.`,
    );
  } catch {
    // prévia é informativa; sem permissão de leitura de tags, apenas não mostra
  }
}

export async function elizfabRules(api: DangerApi, options: ElizfabRulesOptions = {}): Promise<void> {
  const { danger, fail, warn, message, markdown } = api;
  const {
    integrationBranch = 'develop',
    productionBranch = 'main',
    root = '.',
    largePrLines = 1500,
    largeFileWarn = 500_000,
    largeFileFail = 5_000_000,
  } = options;
  const pr = danger.github.pr;
  const head = pr.head.ref;
  const base = pr.base.ref;
  const created = danger.git.created_files;
  const modified = danger.git.modified_files;
  const touched = [...created, ...modified];
  const isRelease = base === productionBranch && head === integrationBranch;

  // R-01..R-03 · Fluxo e nomenclatura
  validateFlow(head, base).forEach((e) => fail(`R-01 · ${e}`));
  if (base === integrationBranch) validateBranch(head).forEach((e) => fail(`R-02 · ${e}`));
  const titleErrors = validateTitle(pr.title);
  titleErrors.forEach((e) => fail(`R-03 · ${e}`));
  if (!titleErrors.length) await syncTypeLabel(api);

  // R-04 · Descrição
  const body = (pr.body ?? '').trim();
  if (body.length < 50) fail('R-04 · Descrição do PR vazia ou muito curta. Explique **o que** muda e **por quê** (use o template).');
  if (/<!--\s*TODO/i.test(body)) warn('R-04 · A descrição ainda tem trechos do template sem preencher (`<!-- TODO`).');

  // R-05 · Rastreabilidade: PR de feature ligado a uma issue
  if (!isRelease && !/(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?)\s+#\d+/i.test(body)) {
    warn('R-05 · PR sem issue vinculada. Adicione `Closes #123` (fecha a issue no merge) ou `Refs #123` na descrição.');
  }

  // R-06 · Responsável
  if (!pr.assignee && !pr.assignees?.length) warn('R-06 · PR sem responsável (assignee).');

  // R-07 · Commits no padrão
  const badCommits = danger.git.commits.filter((c) => !isConventionalCommit(c.message));
  if (badCommits.length) {
    warn(
      'R-07 · Commits fora do padrão Conventional Commits:\n' +
        badCommits.map((c) => `- \`${c.sha.slice(0, 7)}\` ${c.message.split('\n')[0]}`).join('\n'),
    );
  }

  // R-08 · Segredos no diff
  for (const file of touched.filter((f) => !LOCKFILES.test(f))) {
    const lines = await addedLines(api, file);
    for (const [re, label] of SECRET_PATTERNS) {
      if (lines.some((l) => re.test(l))) {
        fail(`R-08 · Possível **${label}** adicionado em \`${file}\`. Remova do commit e **revogue** a credencial.`);
      }
    }
  }

  // R-09 · Arquivos grandes
  const { stat } = await import('node:fs/promises');
  for (const file of created) {
    const size = await stat(`${root}/${file}`).then((s) => s.size, () => 0);
    if (size >= largeFileFail) fail(`R-09 · \`${file}\` tem ${(size / 1e6).toFixed(1)} MB. Arquivos grandes não vão para o Git (otimize ou use armazenamento externo).`);
    else if (size >= largeFileWarn) warn(`R-09 · \`${file}\` tem ${(size / 1e3).toFixed(0)} KB. Otimize (ex.: imagens em WebP/SVG).`);
  }

  // R-10 · Dependências
  const pkgChanged = touched.includes('package.json');
  const lockChanged = touched.includes('package-lock.json');
  if (pkgChanged) {
    const diff = await danger.git.JSONDiffForFile('package.json');
    if ((diff.dependencies || diff.devDependencies) && !lockChanged) {
      fail('R-10 · `package.json` alterou dependências sem `package-lock.json`. Rode `npm install` e commite o lockfile.');
    }
    if (diff.version && !isRelease) {
      warn('R-10 · O campo `version` do `package.json` é controlado pelo workflow de release. Não altere à mão.');
    }
  }
  if (lockChanged && !pkgChanged) warn('R-10 · `package-lock.json` mudou sem alteração no `package.json`. Foi intencional?');

  // R-11 · Código esquecido
  for (const file of touched.filter((f) => /\.(ts|js|mjs|tsx|jsx|html)$/.test(f) && !/dangerfile\.ts$|danger-rules\//.test(f))) {
    const lines = await addedLines(api, file);
    if (lines.some((l) => /\b(fdescribe|fit|xit|xdescribe)\(|\b(describe|it|test)\.only\(/.test(l))) {
      fail(`R-11 · \`${file}\`: teste focado/desabilitado (\`.only\`, \`fit\`, \`xit\`...) adicionado.`);
    }
    if (lines.some((l) => /\bdebugger\b/.test(l))) fail(`R-11 · \`${file}\`: \`debugger\` adicionado.`);
    // console.log só importa em código de aplicação (src/, apps/); scripts de ferramenta podem logar
    if (/(^|\/)(src|apps)\//.test(file) && !/\.spec\./.test(file) && lines.some((l) => /console\.log\(/.test(l))) {
      warn(`R-11 · \`${file}\`: \`console.log\` adicionado.`);
    }
  }

  // R-12 · Tamanho do PR
  const size = (pr.additions ?? 0) + (pr.deletions ?? 0);
  if (!isRelease && size > largePrLines) {
    warn(`R-12 · PR grande (${size} linhas, incluindo lockfiles). Prefira PRs menores, um bloco de implementação por PR.`);
  }

  // R-13 · Release: prévia da versão
  if (isRelease) await releasePreview(api);

  // R-14 · Automação alterada
  if (touched.some((f) => f.startsWith('.github/workflows/') || /dangerfile\.ts$/.test(f) || f === 'elizfab.json')) {
    message('⚙️ R-14 · Automação alterada (workflows, dangerfile ou elizfab.json). Revise com atenção.');
  }

  // P-xx · Padrões do repositório
  if (!options.skipStandards) {
    const { config, results } = await checkStandards(await localFiles(root));
    const failed = results.filter((r) => !r.ok && r.level === 'fail');
    const warned = results.filter((r) => !r.ok && r.level === 'warn');
    failed.forEach((r) => fail(`${r.id} · Padrão obrigatório ausente: **${r.title}**. ${r.fix}`));
    warned.forEach((r) => warn(`${r.id} · Padrão recomendado ausente: **${r.title}**. ${r.fix}`));
    markdown(
      `<details><summary>📋 Padrões do repositório (${config?.tipo ?? 'tipo não definido'}): ` +
        `${results.filter((r) => r.ok).length}/${results.length} atendidos</summary>\n\n${standardsTable(results)}\n\n</details>`,
    );
  }

  markdown(`**Resumo:** ${created.length} criado(s), ${modified.length} modificado(s), ${danger.git.deleted_files.length} removido(s) · \`${head}\` → \`${base}\``);
}

export { TITLE_PATTERN };
