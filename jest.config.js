/** @type {import('jest').Config} */
const config = {
  projects: [
    "<rootDir>/packages/react-sdk/jest.config.js",
    "<rootDir>/packages/browser-sdk/jest.config.js",
    "<rootDir>/packages/browser-embedded-sdk/jest.config.js",
    "<rootDir>/examples/browser-embedded-sdk-demo-app",
    "<rootDir>/examples/react-sdk-demo-app",
    "<rootDir>/examples/browser-sdk-demo-app",
  ],
};

module.exports = config;
