/** End-to-end tests against a real PostgreSQL database (TEST_DATABASE_URL). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testRegex: '\\.e2e-spec\\.ts$',
  setupFiles: ['<rootDir>/test/e2e/setup-env.ts'],
  testTimeout: 30000,
};
