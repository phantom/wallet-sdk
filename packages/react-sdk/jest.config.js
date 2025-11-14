/** @type {import('jest').Config} */
const path = require("path");

const config = {
  displayName: "react-sdk",
  // Ensure jsdom environment so test-setup (and Solana mocks) run in a DOM-like env
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
  // This file runs AFTER the environment is set up (includes jest-dom + Solana web3 mock)
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!(@solana|@noble|uuid|jayson|superstruct|@phantom|rpc-websockets|eventemitter3)/)",
  ],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Force React to resolve from this package's node_modules, not ui package's
    "^react$": path.resolve(__dirname, "node_modules/react"),
    "^react-dom$": path.resolve(__dirname, "node_modules/react-dom"),
    "^react/(.*)$": path.resolve(__dirname, "node_modules/react/$1"),
    "^react-dom/(.*)$": path.resolve(__dirname, "node_modules/react-dom/$1"),
  },
  // Ignore these test patterns
  testPathIgnorePatterns: ["/node_modules/", "/__mocks__/"],
};

module.exports = config;
