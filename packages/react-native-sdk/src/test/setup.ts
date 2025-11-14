// Test setup for React Native SDK
// eslint-disable-next-line import/no-extraneous-dependencies
import "@testing-library/jest-native/extend-expect";

// Mock console methods to reduce noise in tests
const globalConsole = console;
(globalThis as any).console = {
  ...globalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for important test failures
};

// Mock crypto.subtle for React Native environment
Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
  writable: true,
});

// Mock TextEncoder for React Native environment
Object.defineProperty(global, "TextEncoder", {
  value: class TextEncoder {
    encode(str: string) {
      return new Uint8Array(Array.from(str).map(char => char.charCodeAt(0)));
    }
  },
  writable: true,
});
