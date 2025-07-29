module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "https://localhost:3000",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    pretendToBeVisual: true,
    resources: "usable",
    // Enable newer Web APIs including TextEncoder/TextDecoder
    runScripts: "dangerously",
    includeNodeLocations: true,
  },
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts", "!src/**/__tests__/**"],
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/setup.ts"],
  // Transform ESM modules from node_modules
  transformIgnorePatterns: ["node_modules/(?!(jose|@solana)/)"],
  // Handle ESM modules properly
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  // Module name mapping for browser polyfills (none needed currently)
};
