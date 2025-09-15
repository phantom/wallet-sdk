/** @type {import('jest').Config} */
const config = {
  projects: [
    "<rootDir>/packages/api-key-stamper/jest.config.js",
    "<rootDir>/packages/base64url/jest.config.js",
    "<rootDir>/packages/browser-embedded-sdk/jest.config.js",
    "<rootDir>/packages/browser-injected-sdk/jest.config.js",
    "<rootDir>/packages/browser-sdk/jest.config.js",
    "<rootDir>/packages/client/jest.config.js",
    "<rootDir>/packages/crypto/jest.config.js",
    "<rootDir>/packages/parsers/jest.config.js",
    "<rootDir>/packages/react-sdk/jest.config.js",
    "<rootDir>/packages/react-native-sdk/jest.config.js",
    "<rootDir>/packages/embedded-provider-core/jest.config.js",
    "<rootDir>/packages/server-sdk/jest.config.js",
    "<rootDir>/packages/utils/jest.config.js",
    "<rootDir>/packages/chain-interfaces/jest.config.js",
    "<rootDir>/examples/browser-embedded-sdk-demo-app",
    "<rootDir>/examples/react-sdk-demo-app",
    "<rootDir>/examples/browser-sdk-demo-app",
    "<rootDir>/packages/indexed-db-stamper/jest.config.js",
  ],
};

module.exports = config;
