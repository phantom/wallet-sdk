/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

const rootConfig = require("../../.eslintrc.js");

module.exports = defineConfig({
  ...rootConfig,
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  extends: [...rootConfig.extends, "@react-native"],
  ignorePatterns: ["node_modules/", "lib/", "dist/", ".eslintrc.js", "babel.config.js", "*.config.js"],
});
