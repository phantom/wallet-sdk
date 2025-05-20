/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

const rootConfig = require("../../.eslintrc.js");

const { overrides } = rootConfig;

overrides?.push({
  files: ["./**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-misused-promises": "off",
  },
});

module.exports = defineConfig({
  ...rootConfig,
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.eslint.json",
  },

  overrides,
});
