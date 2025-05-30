/** @type {import('jest').Config} */
const sharedConfig = require("../../sharedJestConfig.js");

const config = {
  ...sharedConfig, // Spread the shared configuration
  displayName: "react-sdk",
  // Explicitly define transform for this project to ensure JSX is handled,
  // overriding the one from sharedConfig if necessary, or just being more specific.
  transform: {
    // Ensure this path matches what's in sharedJestConfig or is appropriate
    "^.+\\.(ts|tsx)$": [
      "ts-jest"
    ],
  },
};

module.exports = config;
