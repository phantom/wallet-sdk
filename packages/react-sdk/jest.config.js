/** @type {import('jest').Config} */
const sharedConfig = require("../../sharedJestConfig.js");

const config = {
  ...sharedConfig, // Spread the shared configuration
  displayName: "react-sdk",
};

module.exports = config;
