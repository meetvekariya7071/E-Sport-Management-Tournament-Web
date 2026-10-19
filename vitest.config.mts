import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_jwt_secret_key_1234567890'
    },
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['tests/**/*.test.ts']
  }
});
