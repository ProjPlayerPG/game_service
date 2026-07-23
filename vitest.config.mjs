import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'services/gameSafety.js',
        'services/igdbQueryUtils.js',
        'services/chatRequestUtils.js',
        'services/chatSimilarity.js',
        'services/chatUtils.js',
        'services/translationUtils.js',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
