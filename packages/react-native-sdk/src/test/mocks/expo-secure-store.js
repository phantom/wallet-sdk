// Mock for expo-secure-store with storage simulation
const mockStorage = new Map();

module.exports = {
  getItemAsync: jest.fn(key => {
    if (key.includes("info")) {
      return Promise.resolve(
        JSON.stringify({
          keyId: "mock-key-id-1234",
          publicKey: "mock-public-key-ed25519",
        }),
      );
    }
    if (key.includes("secret")) {
      return Promise.resolve("mock-secret-key-ed25519");
    }
    return Promise.resolve(mockStorage.get(key) || null);
  }),
  setItemAsync: jest.fn((key, value) => {
    mockStorage.set(key, value);
    return Promise.resolve(undefined);
  }),
  deleteItemAsync: jest.fn(key => {
    mockStorage.delete(key);
    return Promise.resolve(undefined);
  }),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "whenUnlockedThisDeviceOnly",
};
