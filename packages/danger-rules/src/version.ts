// Cálculo da próxima versão (SemVer) a partir de Conventional Commits.
//   feat          → minor
//   fix/perf/...  → patch
//   breaking (!)  → major (em 0.x vira minor: a série 0.x é "em construção"; o 1.0.0 é promovido manualmente)

export type Bump = 'major' | 'minor' | 'patch' | null;

const BREAKING = /^[a-z]+(\([a-z0-9-]+\))?!:|BREAKING[ -]CHANGE:/m;
const RELEASABLE = /^(feat|fix|perf|refactor|revert|build|deps)(\([a-z0-9-]+\))?!?:/;

/** Maior bump exigido por um conjunto de mensagens de commit (assunto + corpo). */
export function bumpFor(messages: string[]): Bump {
  let bump: Bump = null;
  for (const message of messages) {
    if (BREAKING.test(message)) return 'major';
    const subject = message.split('\n')[0];
    if (/^feat(\(|!|:)/.test(subject)) bump = 'minor';
    else if (!bump && RELEASABLE.test(subject)) bump = 'patch';
  }
  return bump;
}

export function parseVersion(tag: string): [number, number, number] | null {
  const m = tag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Próxima versão. Sem tag anterior → 0.1.0. Retorna null quando não há commit que gere release
 * (ex.: só docs/ci/chore).
 */
export function nextVersion(lastTag: string | null, messages: string[]): string | null {
  const current = lastTag ? parseVersion(lastTag) : null;
  if (!current) return '0.1.0';
  const bump = bumpFor(messages);
  if (!bump) return null;
  const [major, minor, patch] = current;
  if (bump === 'major') return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}
