/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig({
  extends: ["../../.eslintrc.js"],
  overrides: [
    {
      files: ["tsup.config.ts"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
});