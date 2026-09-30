// Regras de revisão automática dos PRs (Danger JS).
// 1. Regras padrão da organização (R-xx) e padrões de repositório (P-xx): pacote @elizfab/danger-rules.
//    Aqui o pacote é usado pelo código-fonte (packages/danger-rules), já que ele nasce neste repositório;
//    os demais repositórios instalam o pacote publicado no GitHub Packages.
// 2. Regras específicas do MFE (M-xx), abaixo.
// fail() bloqueia o merge · warn() avisa · message() lembra.
// Documentação: docs/09-fluxo-git.md e docs/12-padroes-de-repositorio.md
import { danger, fail, warn, message, markdown, schedule } from 'danger';
import { elizfabRules } from './packages/danger-rules/src/index.ts';

const created = danger.git.created_files;
const modified = danger.git.modified_files;
const touched = [...modified, ...created];
const changed = [...touched, ...danger.git.deleted_files];

const isSpec = (f: string) => /\.spec\.ts$/.test(f);

async function addedLines(file: string): Promise<string[]> {
  const diff = await danger.git.diffForFile(file);
  if (!diff) return [];
  return diff.added
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1));
}

async function mfeRules() {
  // M-01 · Remote novo com o checklist de integração completo (docs/05, cenário B)
  const newRemotes = created
    .map((f) => f.match(/^apps\/([^/]+)\/webpack\.config\.js$/)?.[1])
    .filter((n): n is string => !!n && n !== 'shell');
  for (const remote of newRemotes) {
    const checks: [boolean, string][] = [
      [touched.includes('apps/shell/public/mf.manifest.json'), 'registro em `apps/shell/public/mf.manifest.json`'],
      [touched.includes('apps/shell/src/app/app.routes.ts'), 'rota em `apps/shell/src/app/app.routes.ts`'],
      [touched.includes('eslint.config.mjs'), `regra \`scope:${remote}\` em \`eslint.config.mjs\``],
      [touched.includes('package.json'), `script \`start:${remote}\` no \`package.json\``],
      [touched.some((f) => f.startsWith('docs/')), 'docs atualizadas (portas/tabelas)'],
    ];
    const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
    if (/-/.test(remote)) fail(`M-01 · Remote \`${remote}\`: use nome sem hífen (vira identificador do container do Module Federation).`);
    if (missing.length) {
      fail(`M-01 · Remote novo \`${remote}\` sem: ${missing.join('; ')}. Ver docs/05-adicionar-projetos.md (cenário B).`);
    } else {
      message(`🧩 M-01 · Remote novo \`${remote}\` com checklist de integração completo.`);
    }
  }

  // M-02 · Imports diretos entre apps (o lint também bloqueia; aqui o aviso chega cedo no PR)
  for (const file of touched.filter((f) => /^apps\/[^/]+\/.+\.ts$/.test(f))) {
    const app = file.split('/')[1];
    const cross = (await addedLines(file)).find((l) => /from ['"].*apps\/(?!\.)/.test(l) && !l.includes(`apps/${app}/`));
    if (cross) fail(`M-02 · \`${file}\` importa código de outro app: \`${cross.trim()}\`. Compartilhe via \`packages/shared\`.`);
  }

  // M-03 · Tema: sem cores fixas nos apps
  for (const file of touched.filter((f) => /^apps\/.+\.(scss|ts)$/.test(f) && !isSpec(f))) {
    if ((await addedLines(file)).some((l) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l) && !/var\(--ef-/.test(l))) {
      warn(`M-03 · \`${file}\`: cor fixa adicionada. Use os tokens \`var(--ef-*)\` de \`packages/shared/styles/_theme.scss\`.`);
    }
  }

  // M-04 · Assets de remote com caminho relativo (quebram dentro do shell — docs/10, I-09)
  for (const file of touched.filter((f) => /^apps\/(?!shell\/).+\.(html|ts|scss)$/.test(f) && !isSpec(f))) {
    if ((await addedLines(file)).some((l) => /(src|href)=["'](assets|images)\/|url\(["']?(assets|images)\//.test(l))) {
      warn(`M-04 · \`${file}\`: asset com caminho relativo. Use \`/assets/<remote>/...\` (docs/10, item I-09).`);
    }
  }

  // M-05 · Testes junto com código de apps/libs
  const code = touched.filter((f) => /^(apps|packages)\/.+\.ts$/.test(f) && !isSpec(f));
  if (code.length > 0 && !touched.some(isSpec)) {
    warn('M-05 · Código TypeScript alterado sem nenhum `*.spec.ts` criado ou alterado. Considere adicionar testes.');
  }

  // M-06 · Lembretes de deploy
  if (touched.includes('apps/shell/public/mf.manifest.json')) {
    message('🗺️ M-06 · `mf.manifest.json` alterado: atualize também o **manifesto de produção** do shell.');
  }
  if (changed.some((f) => f.startsWith('packages/shared/'))) {
    message('🔗 M-06 · Lib compartilhada alterada: é singleton em runtime. Publique o **shell e todos os remotes afetados**.');
  }
  if (touched.includes('package.json')) {
    message('📦 M-06 · Dependências compartilhadas entre host e remotes (`singleton` + `strictVersion`): publique **todos** os apps juntos.');
  }

  // M-07 · Projeto Nx novo documentado
  const newProjects = created.filter((f) => /^(apps\/[^/]+|packages\/.+)\/(project|package)\.json$/.test(f));
  if (newProjects.length && !touched.some((f) => f.startsWith('docs/'))) {
    warn(`M-07 · Projeto(s) novo(s) (${newProjects.join(', ')}) sem atualização em \`docs/\`.`);
  }
}

schedule(async () => {
  await elizfabRules({ danger, fail, warn, message, markdown });
  await mfeRules();
});
