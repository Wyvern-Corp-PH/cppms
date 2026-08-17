/**
 * ESLint flat config — pack preset (warn burn-down + agent-strict on new code).
 * Copy to repo root as `eslint.config.mjs`. Adjust ignores / TS project for your layout.
 *
 * Requires: eslint, @eslint/js, typescript-eslint, globals
 * Optional React: eslint-plugin-react-hooks, eslint-plugin-react-refresh
 */
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Align with rules/lint-strategy.mdc § Recommended thresholds (warn burn-down).
      complexity: ['warn', 10],
      'max-depth': ['warn', 1],
      'max-lines': ['warn', 300],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['warn', 3],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/tests/**', '**/__tests__/**'],
    rules: {
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    },
  },
)
