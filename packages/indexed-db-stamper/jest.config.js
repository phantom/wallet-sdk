module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  collectCoverageFrom: ["<rootDir>/src/**/*.ts", "!<rootDir>/src/**/*.test.ts", "!<rootDir>/src/test-setup.ts"],
  coverageReporters: ["text", "lcov"],
  testTimeout: 10000,
};
