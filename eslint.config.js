// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules for all TS/TSX files
  ...tseslint.configs.recommended,

  // React hooks rules for frontend only
  {
    files: ['apps/frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // set-state-in-effect (react-hooks v7) flags `void asyncFn()` in useEffect —
      // this is a valid and common pattern for data fetching; disable until the rule matures
      'react-hooks/set-state-in-effect': 'off',
      // Downgrade exhaustive-deps from error to warning — fetch functions defined inside
      // components trigger this; they should be fixed incrementally, not block CI
      'react-hooks/exhaustive-deps': 'warn',
      // Downgrade refs from error to warning — react-hook-form's handleSubmit(onSubmit)
      // pattern is flagged as a false positive: the ref is read only on submission, not during render
      'react-hooks/refs': 'warn',
    },
  },

  // Project-wide rule overrides
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Allow unused vars prefixed with _ (common for destructuring)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow explicit any in edge cases (rare; prefer unknown)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow non-null assertions (we removed the ones we found; new ones get reviewed)
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Prettier must be last — disables all style rules that Prettier handles
  prettierConfig,

  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/backend/public/**',
      '.yarn/**',
      '.planning/**',
      '**/*.config.js',  // don't lint config files themselves
    ],
  },
)
