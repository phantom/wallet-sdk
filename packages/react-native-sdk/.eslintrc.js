/* eslint-env node */

// @ts-check

const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig({
  root: false, // Inherit from workspace root
  env: {
    "react-native/react-native": true,
  },
  plugins: ["react", "react-native"],
  extends: [
    "../../.eslintrc.js", // Inherit from workspace root
    "plugin:react/recommended",
    "plugin:react-native/all",
  ],
  settings: {
    react: {
      version: "19.1.1",
    },
  },
  rules: {
    // React Native specific overrides
    "no-console": [
      "warn", // Allow console in RN for debugging
      {
        allow: ["error", "warn", "info", "log"],
      },
    ],
    // Allow React Native platform checks
    "react-native/no-unused-styles": "error",
    "react-native/split-platform-components": "warn",
    "react-native/no-inline-styles": "warn",
    "react-native/no-raw-text": "off", // Allow raw text in RN
    "react-native/no-single-element-style-arrays": "error",

    // React specific
    "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
    "react/prop-types": "off", // We use TypeScript
    "react/display-name": "off",

    // Adjust security rules for React Native
    "security/detect-object-injection": "off", // Common pattern in RN
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "no-console": "off", // Allow console in tests
        "@typescript-eslint/no-explicit-any": "off", // Allow any in tests
      },
    },
  ],
});
