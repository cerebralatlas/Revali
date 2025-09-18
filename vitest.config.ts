import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 10000,
    hookTimeout: 10000,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'examples/**/*',
        'tests/**/*',
        'node_modules/**/*',
        'dist/**/*',
        'coverage/**/*',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
  },
})