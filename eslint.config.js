import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  // Base configuration for TypeScript files
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.worker,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
    },
  },
  // Test files configuration - relaxed rules for testing
  {
    files: ['tests/**/*.test.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.worker,
      },
    },
    rules: {
      // Disable TypeScript strict rules that are problematic in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      // Keep other useful rules
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
);
