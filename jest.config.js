module.exports = {
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 85,
      lines: 100,
      statements: 99,
    },
  },
};
