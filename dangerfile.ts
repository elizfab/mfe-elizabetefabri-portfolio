// Regras de revisão automática dos PRs (Danger JS).
// Executado por .github/workflows/auto-pr.yml (a cada push em feature/*) e por danger.yml (abertura/edição do PR).
// fail()  → bloqueia o merge (check "Danger" vermelho)
// warn()  → aviso no comentário, não bloqueia
// message() → lembrete informativo
// Documentação das regras: docs/09-fluxo-git.md
import { danger, fail, warn, message, markdown, schedule } from 'danger';
import {
  validateBranch,
  validateTitle,
  validateFlow,
  isConventionalCommit,
} from './tools/git-rules/rules.ts';

const pr = danger.github.pr;
const head = pr.head.ref;
const base = pr.base.ref;
const modified = danger.git.modified_files;
const created = danger.git.created_files;
const deleted = danger.git.deleted_files;
const touched = [...modified, ...created];
const changed = [...touched, ...deleted];

const isCode = (f: string) => /^(apps|packages)\/.+\.(ts|html|scss)$/.test(f);
const isSpec = (f: string) => /\.spec\.ts$/.test(f);

async function addedLines(file: string): Promise<string[]> {
  const diff = await danger.git.diffForFile(file);
  if (!diff) return [];
  return diff.added
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1));
}

/** Aplica a label `tipo:<tipo>` do título (usada nas notas de release — .github/release.yml). */
async function syncTypeLabel(title: string) {
  const type = title.match(/^([a-z]+)/)?.[1];
  if (!type) return;
  const wanted = `tipo:${type}`;
  const current = (pr as unknown as { labels?: { name: string }[] }).labels?.map((l) => l.name) ?? [];
  const { owner, repo, number } = danger.github.thisPR;
  try {
    for (const label of current.filter((l) => l.startsWith('tipo:') && l !== wanted)) {
      await danger.github.api.issues.removeLabel({ owner, repo, issue_number: number, name: label });
    }
    if (!current.includes(wanted)) {
      await danger.github.api.issues.addLabels({ owner, repo, issue_number: number, labels: [wanted] });
    }
  } catch {
    warn(`Não foi possível aplicar a label \`${wanted}\` (ela existe no repositório?).`);
  }
}

async function run() {
  // ───────────────────────────── 1. Fluxo e nomenclatura (bloqueantes)
  validateFlow(head, base).forEach((e) => fail(e));
  if (base === 'develop') validateBranch(head).forEach((e) => fail(e));
  const titleErrors = validateTitle(pr.title);
  titleErrors.forEach((e) => fail(e));
  if (!titleErrors.length) await syncTypeLabel(pr.title);

  // ───────────────────────────── 2. Descrição do PR
  const body = (pr.body ?? '').trim();
  if (body.length < 50) {
    fail('Descrição do PR vazia ou muito curta. Explique **o que** muda e **por quê** (use o template).');
  }
  if (/<!--\s*TODO/i.test(body) || /\[ \] _preencher_/i.test(body)) {
    warn('A descrição ainda tem trechos do template sem preencher.');
  }

  // ───────────────────────────── 3. Dependências
  const pkgChanged = touched.includes('package.json');
  const lockChanged = touched.includes('package-lock.json');
  if (pkgChanged && !lockChanged) {
    const diff = await danger.git.JSONDiffForFile('package.json');
    if (diff.dependencies || diff.devDependencies) {
      fail('`package.json` alterou dependências, mas o `package-lock.json` não foi commitado. Rode `npm install`.');
    }
  }
  if (lockChanged && !pkgChanged) {
    warn('`package-lock.json` mudou sem alteração no `package.json`. Foi intencional?');
  }
  if (pkgChanged) {
    const pkg = JSON.parse((await danger.github.utils.fileContents('package.json', undefined, pr.head.sha)) || '{}');
    if (pkg.scripts?.['run:all']) {
      fail('Remova o script `run:all` do `package.json` (recolocado pelo gerador de Module Federation; não funciona no Nx).');
    }
    message(
      '📦 Dependências alteradas: dependências são **compartilhadas** entre host e remotes (`singleton` + `strictVersion`). ' +
        'Publique **todos** os apps juntos.',
    );
  }

  // ───────────────────────────── 4. Código esquecido
  const codeFiles = touched.filter(
    (f) => /\.(ts|js|mjs|html)$/.test(f) && f !== 'dangerfile.ts' && !f.startsWith('tools/git-rules/'),
  );
  for (const file of codeFiles) {
    const lines = await addedLines(file);
    if (lines.some((l) => /\b(fdescribe|fit|xit|xdescribe)\(|\b(describe|it|test)\.only\(/.test(l))) {
      fail(`\`${file}\`: teste focado/desabilitado (\`.only\`, \`fit\`, \`xit\`...) adicionado.`);
    }
    if (lines.some((l) => /\bdebugger\b/.test(l))) fail(`\`${file}\`: \`debugger\` adicionado.`);
    if (/^(apps|packages)\//.test(file) && lines.some((l) => /console\.log\(/.test(l))) {
      warn(`\`${file}\`: \`console.log\` adicionado. Use \`console.error\` só para erros reais.`);
    }
  }

  // ───────────────────────────── 5. Tema: sem cores fixas em apps
  const styleFiles = touched.filter((f) => /^apps\/.+\.(scss|ts)$/.test(f) && !isSpec(f));
  for (const file of styleFiles) {
    const lines = await addedLines(file);
    if (lines.some((l) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l) && !/var\(--ef-/.test(l))) {
      warn(`\`${file}\`: cor fixa adicionada. Use os tokens \`var(--ef-*)\` de \`packages/shared/styles/_theme.scss\`.`);
    }
  }

  // ───────────────────────────── 6. Testes
  const codeChanged = touched.filter((f) => isCode(f) && !isSpec(f) && /\.ts$/.test(f));
  const specsChanged = touched.filter(isSpec);
  if (codeChanged.length > 0 && specsChanged.length === 0) {
    warn('Código TypeScript alterado sem nenhum `*.spec.ts` criado ou alterado. Considere adicionar testes.');
  }

  // ───────────────────────────── 7. Arquitetura MFE
  const newRemotes = created
    .map((f) => f.match(/^apps\/([^/]+)\/webpack\.config\.js$/)?.[1])
    .filter((n): n is string => !!n && n !== 'shell');
  for (const remote of newRemotes) {
    const checks: [boolean, string][] = [
      [touched.includes('apps/shell/public/mf.manifest.json'), 'registrado em `apps/shell/public/mf.manifest.json`'],
      [touched.includes('apps/shell/src/app/app.routes.ts'), 'rota em `apps/shell/src/app/app.routes.ts`'],
      [touched.includes('eslint.config.mjs'), 'regra `scope:' + remote + '` em `eslint.config.mjs`'],
      [touched.includes('package.json'), 'script `start:' + remote + '` no `package.json`'],
      [touched.some((f) => f.startsWith('docs/')), 'docs atualizadas (portas/tabelas)'],
    ];
    const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
    if (missing.length) {
      fail(`Remote novo \`${remote}\` sem: ${missing.join('; ')}. Ver docs/05-adicionar-projetos.md (cenário B).`);
    } else {
      message(`🧩 Remote novo \`${remote}\` com checklist de integração completo.`);
    }
  }

  // Imports diretos entre apps (o lint também bloqueia; aqui fica o aviso cedo no PR)
  for (const file of touched.filter((f) => /^apps\/[^/]+\/.+\.ts$/.test(f))) {
    const app = file.split('/')[1];
    const lines = await addedLines(file);
    const cross = lines.find((l) => /from ['"].*apps\/(?!\.)/.test(l) && !l.includes(`apps/${app}/`));
    if (cross) fail(`\`${file}\` importa código de outro app: \`${cross.trim()}\`. Compartilhe via \`packages/shared\`.`);
  }

  if (touched.includes('apps/shell/public/mf.manifest.json')) {
    message('🗺️ `mf.manifest.json` alterado: lembre de atualizar também o **manifesto de produção** usado no deploy do shell.');
  }
  if (changed.some((f) => f.startsWith('packages/shared/'))) {
    message(
      '🔗 Lib compartilhada alterada: ela é singleton em runtime. Publique o **shell e todos os remotes afetados** ' +
        '(`npx nx show projects --affected`).',
    );
  }
  const newProjects = created.filter((f) => /^(apps|packages\/.+)\/[^/]+\/project\.json$/.test(f));
  if (newProjects.length && !touched.some((f) => f.startsWith('docs/'))) {
    warn(`Projeto(s) novo(s) (${newProjects.join(', ')}) sem atualização em \`docs/\`.`);
  }

  // ───────────────────────────── 8. Tamanho e higiene
  const { additions = 0, deletions = 0 } = pr;
  const lockDiff = lockChanged ? await danger.git.structuredDiffForFile('package-lock.json') : null;
  const lockLines = lockDiff ? lockDiff.chunks.reduce((n, c) => n + c.changes.length, 0) : 0;
  const size = additions + deletions - lockLines;
  if (size > 1500) {
    warn(`PR grande (~${size} linhas fora do lockfile). Considere dividir em PRs menores por bloco de implementação.`);
  }

  const badCommits = danger.git.commits.filter((c) => !isConventionalCommit(c.message));
  if (badCommits.length) {
    warn(
      'Commits fora do padrão Conventional Commits:\n' +
        badCommits.map((c) => `- \`${c.sha.slice(0, 7)}\` ${c.message.split('\n')[0]}`).join('\n'),
    );
  }

  if (!pr.assignee && !(pr.assignees?.length)) warn('PR sem responsável (assignee).');

  if (changed.some((f) => f.startsWith('.github/workflows/') || f === 'dangerfile.ts' || f.startsWith('tools/git-rules/'))) {
    message('⚙️ Automação alterada (workflows / Danger / regras de nomenclatura). Revise com atenção.');
  }

  markdown(
    `**Resumo:** ${created.length} criado(s), ${modified.length} modificado(s), ${deleted.length} removido(s) · ` +
      `\`${head}\` → \`${base}\``,
  );
}

schedule(run());
