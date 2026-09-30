// Regras de nomenclatura do fluxo Git — fonte única usada pelos workflows (.github/workflows)
// e pelo Danger (dangerfile.ts). Alterou uma regra? Atualize também docs/09-fluxo-git.md.

/** Branches permanentes: não seguem o padrão de feature. */
const PROTECTED_BRANCHES = ['main', 'develop'];

/** feature/<nome-da-atividade> — kebab-case, minúsculas, números permitidos. */
const BRANCH_PATTERN = /^feature\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BRANCH_MAX_LENGTH = 60;

/** Conventional Commits: tipo(escopo opcional)!: descrição */
const COMMIT_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const TITLE_PATTERN = new RegExp(`^(${COMMIT_TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.{8,}$`);
const TITLE_MAX_LENGTH = 72;

function validateBranch(name) {
  const errors = [];
  if (PROTECTED_BRANCHES.includes(name)) return errors;
  if (!BRANCH_PATTERN.test(name)) {
    errors.push(
      `Branch "${name}" fora do padrão. Use "feature/<nome-da-atividade>" em kebab-case (ex.: feature/remote-certificados).`,
    );
  }
  if (name.length > BRANCH_MAX_LENGTH) {
    errors.push(`Branch "${name}" tem ${name.length} caracteres (máximo ${BRANCH_MAX_LENGTH}).`);
  }
  return errors;
}

function validateTitle(title) {
  const errors = [];
  if (!TITLE_PATTERN.test(title)) {
    errors.push(
      `Título "${title}" fora do padrão Conventional Commits. Use "<tipo>(<escopo>): <descrição>" ` +
        `com tipo em: ${COMMIT_TYPES.join(', ')} (ex.: "feat(shell): adiciona rota de certificados").`,
    );
  }
  if (title.length > TITLE_MAX_LENGTH) {
    errors.push(`Título tem ${title.length} caracteres (máximo ${TITLE_MAX_LENGTH}).`);
  }
  return errors;
}

/** Fluxo permitido: feature/* → develop, develop → main. */
function validateFlow(head, base) {
  if (base === 'develop' && BRANCH_PATTERN.test(head)) return [];
  if (base === 'main' && head === 'develop') return [];
  return [`Fluxo "${head}" → "${base}" não permitido. Use feature/* → develop e develop → main.`];
}

/** feature/estrutura-inicial-mfe → "feat: estrutura inicial mfe" */
function titleFromBranch(name) {
  const activity = name.replace(/^feature\//, '').replace(/-/g, ' ');
  return `feat: ${activity}`.slice(0, TITLE_MAX_LENGTH);
}

function isConventionalCommit(message) {
  const firstLine = message.split('\n')[0];
  return TITLE_PATTERN.test(firstLine) || /^Merge /.test(firstLine);
}

module.exports = {
  PROTECTED_BRANCHES,
  BRANCH_PATTERN,
  BRANCH_MAX_LENGTH,
  COMMIT_TYPES,
  TITLE_PATTERN,
  TITLE_MAX_LENGTH,
  validateBranch,
  validateTitle,
  validateFlow,
  titleFromBranch,
  isConventionalCommit,
};
