#!/usr/bin/env node
// CLI das regras da org (bin "elizfab-rules" no pacote @elizfab/danger-rules).
//   elizfab-rules branch <nome>             valida feature/<nome-da-atividade> (exit 1 se inválida)
//   elizfab-rules title <título>            valida o título do PR (Conventional Commits)
//   elizfab-rules title-from-branch <nome>  imprime o título sugerido para o PR
//   elizfab-rules next-version              imprime a próxima versão (vazio se não houver release) a partir do git local
//   elizfab-rules standards [diretório]     verifica os padrões de repositório no diretório (exit 1 se falhar)
//   elizfab-rules audit <owner/repo>...     verifica os padrões de repositórios no GitHub (usa GITHUB_TOKEN/GH_TOKEN)
import { execFileSync } from 'node:child_process';
import * as naming from './naming.ts';
import { nextVersion } from './version.ts';
import { checkStandards, githubFiles, localFiles, standardsTable, type Result } from './standards.ts';

const [command, ...rest] = process.argv.slice(2);
const value = rest.join(' ');

const report = (errors: string[]) => {
  if (errors.length) {
    errors.forEach((e) => console.error(`::error::${e}`));
    process.exit(1);
  }
  console.log(`✔ "${value}" válido`);
};

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function summarize(label: string, tipo: string | undefined, results: Result[]): boolean {
  const failed = results.filter((r) => !r.ok && r.level === 'fail').length;
  const warned = results.filter((r) => !r.ok && r.level === 'warn').length;
  const status = failed ? '❌' : warned ? '⚠️' : '✅';
  console.log(`\n## ${status} ${label} (${tipo ?? 'sem elizfab.json'}) — ${failed} obrigatório(s) e ${warned} recomendado(s) pendente(s)\n`);
  console.log(standardsTable(results));
  return failed === 0;
}

async function main() {
  switch (command) {
    case 'branch':
      return report(naming.validateBranch(value));
    case 'title':
      return report(naming.validateTitle(value));
    case 'title-from-branch':
      return console.log(naming.titleFromBranch(value));
    case 'next-version': {
      let last: string | null = null;
      try {
        last = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*');
      } catch {
        last = null;
      }
      const log = last ? git('log', '--format=%B%x1e', `${last}..HEAD`) : '';
      const messages = log.split('\x1e').map((m) => m.trim()).filter(Boolean);
      return console.log(nextVersion(last, messages) ?? '');
    }
    case 'standards': {
      const { config, results } = await checkStandards(await localFiles(rest[0] ?? '.'));
      if (!summarize(rest[0] ?? '.', config?.tipo, results)) process.exit(1);
      return;
    }
    case 'audit': {
      const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
      let ok = true;
      for (const repo of rest) {
        try {
          const { config, results } = await checkStandards(await githubFiles(repo, token));
          ok = summarize(repo, config?.tipo, results) && ok;
        } catch (e) {
          ok = false;
          console.log(`\n## ❌ ${repo}\n\nNão foi possível ler o repositório: ${(e as Error).message}`);
        }
      }
      if (!ok) process.exit(1);
      return;
    }
    default:
      console.error('Comandos: branch | title | title-from-branch | next-version | standards [dir] | audit <owner/repo>...');
      process.exit(2);
  }
}

main();
