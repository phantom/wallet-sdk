// Add TextEncoder and TextDecoder to the global scope for tests
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add crypto for PublicKey generation
global.crypto = require('crypto');
