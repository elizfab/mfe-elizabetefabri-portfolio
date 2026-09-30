// Teste rápido sem framework: node tools/git-rules/rules.spec.ts
import assert from 'node:assert/strict';
import * as r from './rules.ts';

assert.deepEqual(r.validateBranch('feature/remote-certificados'), []);
assert.deepEqual(r.validateBranch('feature/abc123'), []);
assert.deepEqual(r.validateBranch('develop'), []);
for (const bad of ['feat/x', 'feature/Remote', 'feature/remote_x', 'feature/', 'feature/a--b', 'bugfix/x', 'feature/a/b']) {
  assert.equal(r.validateBranch(bad).length > 0, true, bad);
}
assert.deepEqual(r.validateTitle('feat(shell): adiciona rota de certificados'), []);
assert.deepEqual(r.validateTitle('feat: estrutura inicial mfe'), []);
for (const bad of ['Adiciona rota', 'feat:sem espaco', 'feature: x', 'feat: curto', 'feat(Shell): escopo maiúsculo']) {
  assert.equal(r.validateTitle(bad).length > 0, true, bad);
}
assert.deepEqual(r.validateFlow('feature/x', 'develop'), []);
assert.deepEqual(r.validateFlow('develop', 'main'), []);
assert.equal(r.validateFlow('feature/x', 'main').length, 1);
assert.equal(r.titleFromBranch('feature/estrutura-inicial-mfe'), 'feat: estrutura inicial mfe');
console.log('git-rules: ok');
