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
      "ts-jest",
      {
        // Point to the tsconfig.json within this package
        tsconfig: "tsconfig.json", 
        // Ensure Babel processing is definitely on and uses the root babel.config.js
        babelConfig: {
          presets: [
            ["@babel/preset-env", { targets: { node: "current" } }],
            ["@babel/preset-react", { "runtime": "automatic" }],
            "@babel/preset-typescript",
          ],
        },
      },
    ],
  },
};

module.exports = config;
