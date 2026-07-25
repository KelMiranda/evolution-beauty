import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/server/__tests__/**/*.test.ts'],
  },
});
