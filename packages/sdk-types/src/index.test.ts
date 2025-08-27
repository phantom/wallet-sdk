import type { Stamper, StamperWithKeyManagement, StamperKeyInfo } from "./index";
import { Algorithm } from "./index";

describe("SDK Types", () => {
  it("should export Stamper interface", () => {
    // This is a type-only test - if it compiles, the types are working
    const stamper: Stamper = {
      algorithm: Algorithm.ed25519,
      stamp: async (_params: any) => {
        await Promise.resolve(); // Add await to satisfy linter
        return "mock-stamp";
      },
    };

    expect(stamper).toBeDefined();
  });

  it("should export StamperWithKeyManagement interface", () => {
    // This is a type-only test - if it compiles, the types are working
    const stamperWithKeyManagement: StamperWithKeyManagement = {
      algorithm: Algorithm.ed25519,
      stamp: async (_params: any) => {
        await Promise.resolve(); // Add await to satisfy linter
        return "mock-stamp";
      },
      init: async () => {
        await Promise.resolve(); // Add await to satisfy linter
        return { keyId: "test", publicKey: "test" };
      },
      getKeyInfo: () => {
        return { keyId: "test", publicKey: "test" };
      },
    };

    expect(stamperWithKeyManagement).toBeDefined();
  });

  it("should export StamperKeyInfo interface", () => {
    const keyInfo: StamperKeyInfo = {
      keyId: "test-key-id",
      publicKey: "test-public-key",
    };

    expect(keyInfo.keyId).toBe("test-key-id");
    expect(keyInfo.publicKey).toBe("test-public-key");
  });
});
