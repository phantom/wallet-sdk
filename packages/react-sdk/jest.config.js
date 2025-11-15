/** @type {import('jest').Config} */
const sharedConfig = require("../../sharedJestConfig.js");
const path = require("path");

const config = {
  ...sharedConfig, // Spread the shared configuration
  displayName: "react-sdk",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.js"],
  transformIgnorePatterns: ["node_modules/(?!(@solana|@noble|uuid|jayson|superstruct|@phantom)/)"],
  moduleNameMapper: {
    // Force React to resolve from this package's node_modules, not ui package's
    "^react$": path.resolve(__dirname, "node_modules/react"),
    "^react-dom$": path.resolve(__dirname, "node_modules/react-dom"),
    "^react/(.*)$": path.resolve(__dirname, "node_modules/react/$1"),
    "^react-dom/(.*)$": path.resolve(__dirname, "node_modules/react-dom/$1"),
  },
};

module.exports = config;
