/* eslint-disable @typescript-eslint/no-var-requires */
// Polyfill fetch for node test environment
(globalThis as any).fetch = jest.fn();

// Provide TextEncoder / TextDecoder for buffer operations (Node 18+ has them,
// but older environments used in CI may not expose them on globalThis).
if (typeof (globalThis as any).TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("util") as typeof import("util");
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder, writable: true, configurable: true });
  Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder, writable: true, configurable: true });
}

afterEach(() => {
  jest.resetAllMocks();
});
