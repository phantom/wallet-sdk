/** @type {import('jest').Config} */
const config = {
  projects: [
    // we specify each package individually to avoid running tests twice due to what seems like a bug in jest
    "<rootDir>/packages/browser-sdk",
    "<rootDir>/packages/react-sdk",
    "<rootDir>/packages/browser-embedded-sdk",
    "<rootDir>/packages/demo/browser-embedded-sdk-demo-app",
    "<rootDir>/packages/demo/react-sdk-demo-app",
    "<rootDir>/packages/demo/browser-sdk-demo-app",
  ],
};

module.exports = config;
