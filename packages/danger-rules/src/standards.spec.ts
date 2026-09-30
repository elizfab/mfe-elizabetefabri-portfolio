// Testes sem framework: node packages/danger-rules/src/standards.spec.ts
import assert from 'node:assert/strict';
import { checkStandards, type RepoFiles } from './standards.ts';

const repo = (files: Record<string, string>): RepoFiles => ({
  paths: Object.keys(files),
  read: async (p) => files[p] ?? null,
});

const base = {
  'README.md': '# Projeto\n\n## Como executar\n\nnpm start\n\n## Stack\n\nAngular',
  'elizfab.json': '{ "tipo": "mfe-remote" }',
  '.gitignore': 'node_modules\ndist\n.env\n',
  '.editorconfig': 'root = true',
  '.github/pull_request_template.md': '## Resumo',
  '.github/workflows/ci.yml': '', '.github/workflows/branch-name.yml': '', '.github/workflows/auto-pr.yml': '',
  '.github/workflows/danger.yml': '', '.github/workflows/release.yml': '', '.github/release.yml': '',
  'dangerfile.ts': "import { elizfabRules } from '@elizfab/danger-rules';",
  'package.json': JSON.stringify({ scripts: { build: 'x', test: 'x', lint: 'x' }, engines: { node: '>=22' },
    dependencies: { '@angular-architects/module-federation': '^22' } }),
  'package-lock.json': '{}', LICENSE: 'MIT', 'docs/arquitetura.md': '#',
  'webpack.config.js': "exposes: { './Routes': './src/app/remote-entry/entry.routes.ts' }",
  'src/app/remote-entry/entry.routes.ts': 'export const remoteRoutes = [];',
};

const ok = await checkStandards(repo(base));
assert.equal(ok.config?.tipo, 'mfe-remote');
assert.deepEqual(ok.results.filter((r) => !r.ok).map((r) => r.id), []);

const bad = await checkStandards(repo({ ...base, '.env': 'SECRET=1', 'README.md': '# Só título' }));
assert.deepEqual(bad.results.filter((r) => !r.ok).map((r) => r.id).sort(), ['P-01', 'P-06']);

const example = await checkStandards(repo({ ...base, '.env.example': 'A=' }));
assert.equal(example.results.find((r) => r.id === 'P-06')?.ok, true);

const skipped = await checkStandards(repo({ ...base, 'elizfab.json': '{ "tipo": "mfe-remote", "excecoes": { "P-03": "licença em definição" } }', LICENSE: undefined as unknown as string }));
assert.equal(skipped.results.find((r) => r.id === 'P-03')?.skipped, 'licença em definição');

const none = await checkStandards(repo({ 'README.md': '# x' }));
assert.equal(none.config, null);
assert.ok(none.results.every((r) => r.id <= 'P-12' || r.id === 'P-05'), 'sem tipo: só padrões "all"');
console.log('standards: ok');
