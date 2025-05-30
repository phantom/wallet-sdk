const sharedConfig = require("./sharedJestConfig.js");

/** @type {import('jest').Config} */
const config = {
  projects: [
    "<rootDir>/packages/react-sdk/jest.config.js",
    "<rootDir>/packages/browser-sdk/jest.config.js",
    "<rootDir>/packages/browser-embedded-sdk/jest.config.js",
    "<rootDir>/packages/demo/browser-embedded-sdk-demo-app",
    "<rootDir>/packages/demo/react-sdk-demo-app",
    "<rootDir>/packages/demo/browser-sdk-demo-app",
  ],
  
  // Add a top-level testEnvironment as a fallback, though it should be per-project.
  testEnvironment: "jsdom",
 
};

module.exports = config;
