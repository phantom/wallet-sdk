// Mock IndexedDB for testing environment
// eslint-disable-next-line import/no-extraneous-dependencies
import "fake-indexeddb/auto";
import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder for Node.js test environment
Object.defineProperty(global, "TextEncoder", {
  value: TextEncoder,
  writable: true,
});

Object.defineProperty(global, "TextDecoder", {
  value: TextDecoder,
  writable: true,
});

// Polyfill structuredClone for Node.js test environment
Object.defineProperty(global, "structuredClone", {
  value: (obj: any) => JSON.parse(JSON.stringify(obj)),
  writable: true,
});

// Mock crypto.subtle for tests
Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      generateKey: jest.fn(),
      sign: jest.fn(),
      exportKey: jest.fn(),
      digest: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
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
