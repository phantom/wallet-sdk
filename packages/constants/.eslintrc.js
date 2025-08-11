/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig({
  extends: ["../../.eslintrc.js"],
  rules: {
    // Override strict type rules for this package since it needs to export both types and values
    "@typescript-eslint/consistent-type-exports": "off",
    "@typescript-eslint/consistent-type-imports": "off",
  },
  overrides: [
    {
      files: ["tsup.config.ts"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
});
