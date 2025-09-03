/** @type {import('jest').Config} */
const sharedConfig = require("../../sharedJestConfig.js");

const config = {
  ...sharedConfig, // Spread the shared configuration
  displayName: "react-sdk",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.js"],
  transformIgnorePatterns: ["node_modules/(?!(@solana|@noble|uuid|jayson|superstruct|@phantom)/)"],
};

module.exports = config;
