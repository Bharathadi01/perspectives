/** Unit tests: pure domain logic, no database. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testRegex: '\\.spec\\.ts$',
};
