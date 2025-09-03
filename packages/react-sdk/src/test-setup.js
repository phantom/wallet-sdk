// Polyfills for Solana Web3.js in Node.js test environment
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock EventTarget if not available
if (typeof global.EventTarget === "undefined") {
  global.EventTarget = class EventTarget {
    constructor() {
      this.listeners = new Map();
    }

    addEventListener(type, listener) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      this.listeners.get(type).push(listener);
    }

    removeEventListener(type, listener) {
      if (this.listeners.has(type)) {
        const listeners = this.listeners.get(type);
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }

    dispatchEvent(event) {
      if (this.listeners.has(event.type)) {
        const listeners = this.listeners.get(event.type);
        listeners.forEach(listener => listener(event));
      }
      return true;
    }
  };
}

if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}
