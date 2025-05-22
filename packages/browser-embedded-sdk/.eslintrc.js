/* eslint-env node */

// @ts-check

// To activate auto-suggestions for Rules of specific plugins, you need to add a `/// <reference types="eslint-plugin-PLUGIN_NAME/define-config-support" />` comment.
// ⚠️ This feature is very new and requires the support of the respective plugin owners.

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

  overrides,
});
