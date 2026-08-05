import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/server/__tests__/**/*.test.ts'],
    env: {
      // Tests that touch the pool need DATABASE_URL set; using a fake value
      // here is enough for module-load assertions and keeps suite-level
      // tests like `participants-pagination.test.ts` and
      // `audit-hardening.test.ts` from throwing "DATABASE_URL is required"
      // unhandled rejections.
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    },
  },
});
