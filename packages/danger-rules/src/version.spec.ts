// Testes sem framework: node packages/danger-rules/src/version.spec.ts
import assert from 'node:assert/strict';
import { bumpFor, nextVersion } from './version.ts';

assert.equal(nextVersion(null, []), '0.1.0');
assert.equal(nextVersion('v0.1.0', ['docs: ajusta readme', 'ci: ajusta workflow']), null);
assert.equal(nextVersion('v0.1.0', ['fix(shell): corrige menu']), '0.1.1');
assert.equal(nextVersion('v0.1.1', ['fix: x', 'feat(pdi): cria remote']), '0.2.0');
assert.equal(nextVersion('v0.2.0', ['feat!: angular 23']), '0.3.0');
assert.equal(nextVersion('v1.2.3', ['feat!: angular 23']), '2.0.0');
assert.equal(nextVersion('v1.2.3', ['refactor: x\n\nBREAKING CHANGE: remove api']), '2.0.0');
assert.equal(nextVersion('v1.2.3', ['feat: y']), '1.3.0');
assert.equal(bumpFor(['Merge #3: algo', 'chore: z']), null);
console.log('version: ok');
