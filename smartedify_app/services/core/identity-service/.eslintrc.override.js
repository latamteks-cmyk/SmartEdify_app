/**
 * ESLint Override Configuration for CI/CD Readiness
 * CTO Decision: Temporary relaxation of non-critical rules to unblock pipeline
 * while maintaining security and type safety for production code
 */

module.exports = {
  extends: ['./.eslintrc.js'],
  overrides: [
    {
      // Production code - strict rules
      files: ['src/**/*.ts'],
      excludeFiles: ['**/*.spec.ts', '**/*.test.ts'],
      rules: {
        // Keep strict for production code
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unsafe-call': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
      },
    },
    {
      // Test files - relaxed rules for CI/CD
      files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
      rules: {
        // Relax for tests to unblock CI/CD
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/require-await': 'warn',
        '@typescript-eslint/await-thenable': 'warn',
        '@typescript-eslint/no-require-imports': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/unbound-method': 'warn',
        '@typescript-eslint/no-base-to-string': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
      },
    },
  ],
};