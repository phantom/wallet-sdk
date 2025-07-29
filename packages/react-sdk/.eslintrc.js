/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

const rootConfig = require("../../.eslintrc.js");

const { overrides } = rootConfig;

module.exports = defineConfig({
  ...rootConfig,
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },

  overrides: [
    ...(overrides || []),
    {
      files: ["tsup.config.ts"],
      rules: {
        "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
      },
    },
  ],
});
