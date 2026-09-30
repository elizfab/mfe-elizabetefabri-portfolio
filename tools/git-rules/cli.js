#!/usr/bin/env node
// Uso:
//   node tools/git-rules/cli.js branch <nome>            → valida a branch (exit 1 se inválida)
//   node tools/git-rules/cli.js title <título>           → valida o título do PR
//   node tools/git-rules/cli.js title-from-branch <nome> → imprime o título sugerido para o PR
const rules = require('./rules');

const [command, ...rest] = process.argv.slice(2);
const value = rest.join(' ');

const report = (errors) => {
  if (errors.length) {
    errors.forEach((e) => console.error(`::error::${e}`));
    process.exit(1);
  }
  console.log(`✔ "${value}" válido`);
};

switch (command) {
  case 'branch':
    report(rules.validateBranch(value));
    break;
  case 'title':
    report(rules.validateTitle(value));
    break;
  case 'title-from-branch':
    console.log(rules.titleFromBranch(value));
    break;
  default:
    console.error('Comandos: branch <nome> | title <título> | title-from-branch <nome>');
    process.exit(2);
}
