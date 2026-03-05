// ============================================================
// Commitlint Configuration — Mugiwara Agents v1.7
// Enforces Conventional Commits format
// See: https://www.conventionalcommits.org/
// ============================================================

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types allowed in mugiwara-agents
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature (agent, pipeline, skill)
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, no code change
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'ci',       // CI/CD changes (pipeline, hooks)
        'chore',    // Maintenance (deps, config)
        'build',    // Build system changes
        'revert',   // Revert a previous commit
      ],
    ],
    // Scopes: agent names, infrastructure areas
    'scope-enum': [
      1, // warning only — new scopes are expected as agents grow
      'always',
      [
        // Infrastructure
        'cli', 'hooks', 'dashboard', 'registry', 'ci', 'schema', 'changelog',
        'monitoring', 'feature-flags', 'release',
        // Core agents
        'luffy', 'zorro', 'nami', 'sanji', 'usopp', 'chopper', 'robin',
        'franky', 'brook', 'jinbe',
        // Extended agents
        'vegapunk', 'morgans', 'vivi', 'yamato', 'ace', 'law', 'shanks',
        'one_piece', 'bon-clay', 'perona', 'senor-pink', 'bartholomew',
      ],
    ],
    // Subject must not be empty and not end with period
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Header max length
    'header-max-length': [2, 'always', 100],
  },
};
