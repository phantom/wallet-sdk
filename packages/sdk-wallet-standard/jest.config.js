const sharedConfig = require("../../sharedJestConfig");

module.exports = {
  ...sharedConfig,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
