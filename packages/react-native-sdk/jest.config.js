module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/*.(test|spec).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/*.test.{ts,tsx}", "!src/**/index.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    "^react$": "<rootDir>/node_modules/react",
    "^react/jsx-runtime$": "<rootDir>/node_modules/react/jsx-runtime",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@phantom/crypto$": "<rootDir>/src/test/mocks/@phantom/crypto.js",
    "^@phantom/base64url$": "<rootDir>/src/test/mocks/@phantom/base64url.js",
    "^@phantom/wallet-sdk-ui$": "<rootDir>/../ui/src/index.ts",
    "^expo-secure-store$": "<rootDir>/src/test/mocks/expo-secure-store.js",
    "^expo-web-browser$": "<rootDir>/src/test/mocks/expo-web-browser.js",
    "^expo-auth-session$": "<rootDir>/src/test/mocks/expo-auth-session.js",
    "^expo-router$": "<rootDir>/src/test/mocks/expo-router.js",
    "^react-native$": "<rootDir>/src/test/mocks/react-native.js",
  },
  moduleDirectories: ["node_modules", "<rootDir>/../../node_modules"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transformIgnorePatterns: ["node_modules/(?!(react-native|@react-native|expo-.*|@phantom)/)"],
};
