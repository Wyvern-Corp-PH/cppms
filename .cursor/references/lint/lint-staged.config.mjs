/**
 * lint-staged — pack preset. Copy to repo root as `lint-staged.config.mjs`.
 * Default: Oxlint + Oxfmt. Swap blocks for Biome / ESLint+Prettier / Ruff
 * to match docs/agents/lint.md.
 *
 * Policy: lint --fix → format on staged paths only.
 */

/** @type {import('lint-staged').Configuration} */
export default {
  // --- Oxlint + Oxfmt (recommended) ---
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': ['oxlint --fix --deny-warnings', 'oxfmt'],
  '*.{json,jsonc,md,mdx,yml,yaml,css,html,vue,svelte}': ['oxfmt'],

  // --- Biome (uncomment when that preset is chosen; remove Oxc blocks) ---
  // '*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc}': [
  //   'biome check --write --no-errors-on-unmatched',
  // ],

  // --- ESLint + Prettier (uncomment when that preset is chosen; remove Oxc blocks) ---
  // '*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  // '*.{json,md,yml,yaml,css,html}': ['prettier --write'],

  // --- Ruff (Python; keep alongside JS preset when mixed) ---
  // '*.py': ['ruff check --fix', 'ruff format'],
}
