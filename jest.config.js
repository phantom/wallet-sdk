const sharedConfig = require("./sharedJestConfig.js");

/** @type {import('jest').Config} */
const config = {
  // The 'projects' option is correct. The warning is mysterious if Jest version is current.
  // We will rely on per-project jest.config.js files to spread sharedConfig
  // and set their own displayName and any specific overrides if necessary.
  // The primary issue seems to be how sharedConfig is interpreted by each project.
  projects: [
    // Ensure each project config correctly inherits testEnvironment and transform.
    // Example for one project, assuming each package has a jest.config.js that spreads sharedConfig:
    "<rootDir>/packages/react-sdk/jest.config.js",
    "<rootDir>/packages/browser-sdk/jest.config.js",
    "<rootDir>/packages/browser-embedded-sdk/jest.config.js",
    // Add other packages here if they have tests and a jest.config.js
  ],
  
  // Add a top-level testEnvironment as a fallback, though it should be per-project.
  testEnvironment: "jsdom",
 
};

module.exports = config;
