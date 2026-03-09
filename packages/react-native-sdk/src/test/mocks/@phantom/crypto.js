module.exports = {
  generateKeyPair: jest.fn(() => ({
    publicKey: "mock-public-key-ed25519",
    secretKey: "mock-secret-key-ed25519",
  })),
  signWithSecret: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
  createKeyPairFromSecret: jest.fn(secretKey => ({
    publicKey: "derived-public-key",
    secretKey: secretKey,
  })),
  sha256: jest.fn(() => Promise.resolve(new Uint8Array(32).fill(0xab))),
};
