import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 25000,
    hookTimeout: 25000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_jwt_secret_antigravity_2026'
    }
  }
});
