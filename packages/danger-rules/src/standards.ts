// Padrões obrigatórios de repositório da organização elizfab.
// Cada padrão tem um id estável (P-xx), usado no Danger, na auditoria (`elizfab-rules audit`) e na documentação.
// A verificação é agnóstica de origem: recebe um RepoFiles (checkout local ou API do GitHub).

export type RepoType = 'mfe-host' | 'mfe-remote' | 'app-angular' | 'backend-go' | 'lib' | 'org';
export const REPO_TYPES: RepoType[] = ['mfe-host', 'mfe-remote', 'app-angular', 'backend-go', 'lib', 'org'];

export interface ElizfabConfig {
  tipo: RepoType;
  nome?: string;
  /** Padrões desligados conscientemente, com justificativa: { "P-12": "motivo" } */
  excecoes?: Record<string, string>;
}

export interface RepoFiles {
  /** Caminhos relativos à raiz (sem node_modules/.git/dist). */
  paths: string[];
  read(path: string): Promise<string | null>;
}

export type Level = 'fail' | 'warn';

export interface Standard {
  id: string;
  title: string;
  level: Level;
  types: RepoType[] | 'all';
  /** Como corrigir (aparece no Danger e na auditoria). */
  fix: string;
  check(ctx: Ctx): Promise<boolean> | boolean;
}

export interface Ctx {
  files: RepoFiles;
  has(path: string): boolean;
  find(pattern: RegExp): string[];
  read(path: string): Promise<string | null>;
  json<T = Record<string, unknown>>(path: string): Promise<T | null>;
}

export interface Result {
  id: string;
  title: string;
  level: Level;
  ok: boolean;
  skipped?: string;
  fix: string;
}

const NODE: RepoType[] = ['mfe-host', 'mfe-remote', 'app-angular', 'lib'];
const APPS: RepoType[] = ['mfe-host', 'mfe-remote', 'app-angular', 'backend-go', 'lib'];
const WORKFLOWS = ['ci', 'branch-name', 'auto-pr', 'danger'];

type Pkg = { scripts?: Record<string, string>; engines?: { node?: string }; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

export const STANDARDS: Standard[] = [
  // ── Identidade e documentação
  {
    id: 'P-01', title: 'README.md com título, "Como executar" e stack/arquitetura', level: 'fail', types: 'all',
    fix: 'Crie o README.md com um título (#), a seção "## Como executar" e "## Stack" (ou "## Arquitetura"/"## Tecnologias").',
    async check({ read }) {
      const md = await read('README.md');
      if (!md) return false;
      return /^# .+/m.test(md) && /^##+ .*como executar/im.test(md) && /^##+ .*(stack|arquitetura|tecnologias)/im.test(md);
    },
  },
  {
    id: 'P-02', title: 'elizfab.json válido (tipo do repositório)', level: 'fail', types: 'all',
    fix: `Crie elizfab.json na raiz: { "tipo": "<${REPO_TYPES.join('|')}>" }.`,
    async check({ json }) {
      const cfg = await json<ElizfabConfig>('elizfab.json');
      return !!cfg && REPO_TYPES.includes(cfg.tipo);
    },
  },
  {
    id: 'P-03', title: 'LICENSE', level: 'warn', types: APPS,
    fix: 'Adicione um arquivo LICENSE (ex.: MIT) — sem licença, ninguém pode reutilizar o código legalmente.',
    check: ({ find }) => find(/^LICEN[SC]E(\.md|\.txt)?$/i).length > 0,
  },
  {
    id: 'P-04', title: 'Documentação em docs/ ou ROADMAP.md', level: 'warn', types: APPS,
    fix: 'Crie docs/ (arquitetura, como adicionar funcionalidades) ou um ROADMAP.md a partir do template da org.',
    check: ({ find, has }) => has('ROADMAP.md') || find(/^docs\/.+\.md$/).length > 0,
  },

  // ── Higiene
  {
    id: 'P-05', title: '.gitignore com node_modules, dist e .env', level: 'fail', types: 'all',
    fix: 'Crie/complete o .gitignore com node_modules, dist e .env.',
    async check({ read, files }) {
      const gi = await read('.gitignore');
      if (!gi) return false;
      const needsNode = files.paths.includes('package.json');
      return /(^|\n)\/?\.env\b/.test(gi) && (!needsNode || (/node_modules/.test(gi) && /dist/.test(gi)));
    },
  },
  {
    id: 'P-06', title: 'Nenhum arquivo .env versionado', level: 'fail', types: 'all',
    fix: 'Remova o .env do Git (`git rm --cached .env`), mantenha só .env.example e revogue segredos expostos.',
    check: ({ find }) => find(/(^|\/)\.env(\.(?!example$)[^/]+)?$/).length === 0,
  },
  {
    id: 'P-07', title: '.editorconfig', level: 'warn', types: 'all',
    fix: 'Adicione o .editorconfig padrão (UTF-8, 2 espaços, newline final).',
    check: ({ has }) => has('.editorconfig'),
  },

  // ── Fluxo de trabalho (GitHub)
  {
    id: 'P-08', title: 'Template de PR (.github/pull_request_template.md)', level: 'fail', types: 'all',
    fix: 'Copie .github/pull_request_template.md do template elizfab/template-remote-mfe.',
    check: ({ has }) => has('.github/pull_request_template.md'),
  },
  {
    id: 'P-09', title: `Workflows ${WORKFLOWS.join(', ')}`, level: 'fail', types: 'all',
    fix: `Adicione em .github/workflows/: ${WORKFLOWS.map((w) => `${w}.yml`).join(', ')} (copie do template).`,
    check: ({ has }) => WORKFLOWS.every((w) => has(`.github/workflows/${w}.yml`)),
  },
  {
    id: 'P-10', title: 'Workflow de release (.github/workflows/release.yml)', level: 'warn', types: APPS,
    fix: 'Adicione .github/workflows/release.yml (versão + tag + release a cada merge na main).',
    check: ({ has }) => has('.github/workflows/release.yml'),
  },
  {
    id: 'P-11', title: 'Categorias das notas de release (.github/release.yml)', level: 'warn', types: 'all',
    fix: 'Copie .github/release.yml do template (categorias por label tipo:*).',
    check: ({ has }) => has('.github/release.yml'),
  },
  {
    id: 'P-12', title: 'dangerfile.ts usando @elizfab/danger-rules', level: 'fail', types: 'all',
    fix: 'Crie dangerfile.ts chamando elizfabRules(...) de @elizfab/danger-rules (ver README do pacote).',
    async check({ read }) {
      const df = await read('dangerfile.ts');
      return !!df && /elizfabRules|@elizfab\/danger-rules|danger-rules\/src/.test(df);
    },
  },

  // ── Node / Angular
  {
    id: 'P-13', title: 'package-lock.json versionado', level: 'fail', types: NODE,
    fix: 'Rode `npm install` e commite o package-lock.json (o CI usa `npm ci`).',
    check: ({ has }) => has('package-lock.json'),
  },
  {
    id: 'P-14', title: 'Scripts npm build, test e lint', level: 'fail', types: NODE,
    fix: 'Declare os scripts "build", "test" e "lint" no package.json.',
    async check({ json }) {
      const s = (await json<Pkg>('package.json'))?.scripts ?? {};
      return ['build', 'test', 'lint'].every((k) => !!s[k]);
    },
  },
  {
    id: 'P-15', title: 'Versão do Node declarada (.nvmrc ou engines.node)', level: 'warn', types: NODE,
    fix: 'Crie .nvmrc com "22" ou declare "engines": { "node": ">=22" } no package.json.',
    async check({ has, json }) {
      return has('.nvmrc') || !!(await json<Pkg>('package.json'))?.engines?.node;
    },
  },

  // ── Micro frontends
  {
    id: 'P-16', title: 'Remote expõe ./Routes no webpack.config.js', level: 'fail', types: ['mfe-remote'],
    fix: "No webpack.config.js: exposes: { './Routes': './src/app/remote-entry/entry.routes.ts' }.",
    async check({ find, read }) {
      for (const f of find(/(^|\/)webpack\.config\.js$/)) {
        if (/['"]\.\/Routes['"]\s*:/.test((await read(f)) ?? '')) return true;
      }
      return false;
    },
  },
  {
    id: 'P-17', title: 'remote-entry/entry.routes.ts exportando remoteRoutes', level: 'fail', types: ['mfe-remote'],
    fix: 'Crie src/app/remote-entry/entry.routes.ts com `export const remoteRoutes: Route[] = [...]`.',
    async check({ find, read }) {
      for (const f of find(/(^|\/)remote-entry\/entry\.routes\.ts$/)) {
        if (/export const remoteRoutes\b/.test((await read(f)) ?? '')) return true;
      }
      return false;
    },
  },
  {
    id: 'P-18', title: 'Dependência @angular-architects/module-federation', level: 'fail', types: ['mfe-host', 'mfe-remote'],
    fix: 'Instale @angular-architects/module-federation na mesma versão major do Angular do MFE.',
    async check({ json }) {
      const p = await json<Pkg>('package.json');
      return !!(p?.dependencies?.['@angular-architects/module-federation'] || p?.devDependencies?.['@angular-architects/module-federation']);
    },
  },
  {
    id: 'P-19', title: 'Sem script run:all (não funciona fora de angular.json)', level: 'fail', types: ['mfe-host', 'mfe-remote'],
    fix: 'Remova o script "run:all" do package.json.',
    async check({ json }) {
      return !(await json<Pkg>('package.json'))?.scripts?.['run:all'];
    },
  },
  {
    id: 'P-20', title: 'Host com mf.manifest.json', level: 'fail', types: ['mfe-host'],
    fix: 'Crie public/mf.manifest.json no app host com o mapa nome → remoteEntry.js.',
    check: ({ find }) => find(/(^|\/)public\/mf\.manifest\.json$/).length > 0,
  },

  // ── Backend Go
  {
    id: 'P-21', title: 'go.mod', level: 'fail', types: ['backend-go'],
    fix: 'Inicialize o módulo: `go mod init github.com/elizfab/<repo>`.',
    check: ({ find }) => find(/(^|\/)go\.mod$/).length > 0,
  },
  {
    id: 'P-22', title: 'Dockerfile e .env.example', level: 'warn', types: ['backend-go'],
    fix: 'Adicione Dockerfile (imagem publicada no ghcr.io) e .env.example com as variáveis esperadas.',
    check: ({ find }) => find(/(^|\/)Dockerfile$/).length > 0 && find(/(^|\/)\.env\.example$/).length > 0,
  },
];

function makeCtx(files: RepoFiles): Ctx {
  const set = new Set(files.paths);
  const cache = new Map<string, Promise<string | null>>();
  const read = (p: string) => {
    if (!set.has(p)) return Promise.resolve(null);
    if (!cache.has(p)) cache.set(p, files.read(p));
    return cache.get(p) as Promise<string | null>;
  };
  return {
    files,
    has: (p) => set.has(p),
    find: (re) => files.paths.filter((p) => re.test(p)),
    read,
    json: async <T>(p: string) => {
      const raw = await read(p);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
  };
}

/** Lê o elizfab.json (ou null) e avalia os padrões aplicáveis ao tipo do repositório. */
export async function checkStandards(files: RepoFiles): Promise<{ config: ElizfabConfig | null; results: Result[] }> {
  const ctx = makeCtx(files);
  const config = await ctx.json<ElizfabConfig>('elizfab.json');
  const type = config && REPO_TYPES.includes(config.tipo) ? config.tipo : null;
  const results: Result[] = [];
  for (const s of STANDARDS) {
    const applies = s.types === 'all' || (type !== null && s.types.includes(type));
    if (!applies) continue;
    const exception = config?.excecoes?.[s.id];
    if (exception) {
      results.push({ id: s.id, title: s.title, level: s.level, ok: true, skipped: exception, fix: s.fix });
      continue;
    }
    results.push({ id: s.id, title: s.title, level: s.level, ok: await s.check(ctx), fix: s.fix });
  }
  return { config, results };
}

const IGNORED = /(^|\/)(node_modules|\.git|dist|\.nx|\.angular|coverage|tmp)(\/|$)/;

/** RepoFiles a partir de um diretório local (checkout do PR). */
export async function localFiles(root = '.'): Promise<RepoFiles> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join, relative } = await import('node:path');
  const paths: string[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(root, full).split('\\').join('/');
      if (IGNORED.test(rel)) continue;
      if (entry.isDirectory()) await walk(full);
      else paths.push(rel);
    }
  }
  await walk(root);
  return { paths, read: (p) => readFile(join(root, p), 'utf8').catch(() => null) };
}

/** RepoFiles de um repositório no GitHub (auditoria), via API REST. */
export async function githubFiles(repo: string, token?: string, ref?: string): Promise<RepoFiles> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'elizfab-rules' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = async <T>(url: string): Promise<T> => {
    const res = await fetch(`https://api.github.com${url}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status} em ${url}`);
    return (await res.json()) as T;
  };
  const branch = ref ?? (await api<{ default_branch: string }>(`/repos/${repo}`)).default_branch;
  const tree = await api<{ tree: { path: string; type: string }[] }>(
    `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  const paths = tree.tree
    .filter((t) => t.type === 'blob' && !IGNORED.test(t.path))
    .map((t) => t.path);
  return {
    paths,
    read: async (p) => {
      try {
        const file = await api<{ content: string }>(`/repos/${repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
        return Buffer.from(file.content, 'base64').toString('utf8');
      } catch {
        return null;
      }
    },
  };
}

/** Tabela markdown dos resultados (Danger e auditoria). */
export function standardsTable(results: Result[]): string {
  const icon = (r: Result) => (r.skipped ? '⏭️' : r.ok ? '✅' : r.level === 'fail' ? '❌' : '⚠️');
  const rows = results.map(
    (r) => `| ${icon(r)} | ${r.id} | ${r.title} | ${r.skipped ? `Exceção: ${r.skipped}` : r.ok ? '' : r.fix} |`,
  );
  return ['| | ID | Padrão | Como corrigir |', '| --- | --- | --- | --- |', ...rows].join('\n');
}
