const config = require("../../sharedJestConfig");

module.exports = {
  ...config,
  displayName: "@phantom/phantom-connector",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!(@solana|@noble|uuid|jayson|superstruct)/)"
  ],
};