// Setup file for Jest tests
// eslint-disable-next-line import/no-extraneous-dependencies
import "fake-indexeddb/auto";

// Mock jose library to avoid ESM issues
jest.mock("jose", () => ({
  base64url: {
    encode: jest.fn((data: Uint8Array) => {
      // Simple base64url encoding mock using btoa
      const binary = Array.from(data)
        .map(byte => String.fromCharCode(byte))
        .join("");
      const base64 = btoa(binary);
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }),
    decode: jest.fn((str: string) => {
      // Simple base64url decoding mock using atob
      const base64 = str
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
      const binary = atob(base64);
      return new Uint8Array(Array.from(binary).map(char => char.charCodeAt(0)));
    }),
  },
}));

// Add fetch polyfill for testing
(globalThis as any).fetch = jest.fn();

// Setup crypto for jsdom environment
if (typeof globalThis.crypto === "undefined") {
  // Mock crypto for testing
  Object.defineProperty(globalThis, "crypto", {
    value: {
      subtle: {},
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
}

// Setup TextEncoder/TextDecoder for jsdom test environment only
// Note: This is ONLY for testing - production code remains isomorphic
// and uses native TextEncoder/TextDecoder available in browsers and Node.js
if (typeof globalThis.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("util");
  Object.defineProperty(globalThis, "TextEncoder", {
    value: TextEncoder,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "TextDecoder", {
    value: TextDecoder,
    writable: true,
    configurable: true,
  });
}

// Mock console.warn to avoid noise in tests
// eslint-disable-next-line no-console
const originalWarn = console.warn;
beforeEach(() => {
  // Mock console.warn during tests
  (console as any).warn = jest.fn();
});

afterEach(() => {
  // Restore original console.warn
  (console as any).warn = originalWarn;
  jest.resetAllMocks();
});
