/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig({
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "check-file", "import", "react-hooks", "security"],
  settings: {
    "import/resolver": {
      typescript: true,
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended",
    "plugin:import/typescript",
    "prettier", // Use this last to override conflicting rules
  ],
  rules: {
    "no-console": [
      "error",
      {
        allow: ["error"],
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-empty-interface": 0,
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-shadow": "off",
    "@typescript-eslint/consistent-type-exports": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "import/no-duplicates": "error",
    "@typescript-eslint/no-inferrable-types": "off",
    "prefer-const": [
      "error",
      {
        destructuring: "all",
      },
    ],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: [
          "**/*.test.*",
          "**/__test__/**",
          "**/__tests__/**",
          "**/testUtils.*",
          "**/e2e/**",
          "**/__mocks__/**",
          "**/vite.config.mts",
          "**/jestSetup.ts",
          "**/tsup.config.ts",
        ],
        includeTypes: false,
      },
    ],
    "check-file/folder-naming-convention": [
      "error",
      {
        "src/**/!(__tests__|__fixtures__|__mocks__)": "KEBAB_CASE",
      },
    ],
    "security/detect-unsafe-regex": "off",
    "security/detect-non-literal-regexp": "off",
    "security/detect-object-injection": "off",
    "@typescript-eslint/consistent-type-imports": "error",
    "no-return-await": "off",
    "@typescript-eslint/return-await": "off",
    "@typescript-eslint/no-for-in-array": "error",
    "require-await": "off",
    "@typescript-eslint/require-await": "error",
    "import/no-cycle": [
      "error",
      {
        maxDepth: 50,
      },
    ],
  },
});
