// Test setup for React Native SDK

// Mock console methods to reduce noise in tests
const globalConsole = console;
(globalThis as any).console = {
  ...globalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for important test failures
};
