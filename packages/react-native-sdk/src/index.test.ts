// Mock dependencies before imports
jest.mock("@phantom/embedded-provider-core", () => ({
  EmbeddedProvider: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({ addresses: [], walletId: "mock-id" }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    getAddresses: jest.fn().mockReturnValue([]),
    signMessage: jest.fn().mockResolvedValue({ signature: "mock-signature" }),
    signTransaction: jest.fn().mockResolvedValue({ rawTransaction: "mock-raw-tx" }),
    signAndSendTransaction: jest.fn().mockResolvedValue({ hash: "mock-hash", rawTransaction: "mock-raw-tx" }),
  })),
}));

import { PhantomProvider, usePhantom, useConnect, useDisconnect, useAccounts, useSolana, useEthereum } from "./index";

describe("React Native SDK Exports", () => {
  it("should export PhantomProvider", () => {
    expect(PhantomProvider).toBeDefined();
    expect(typeof PhantomProvider).toBe("function");
  });

  it("should export usePhantom hook", () => {
    expect(usePhantom).toBeDefined();
    expect(typeof usePhantom).toBe("function");
  });

  it("should export individual hooks", () => {
    expect(useConnect).toBeDefined();
    expect(typeof useConnect).toBe("function");

    expect(useDisconnect).toBeDefined();
    expect(typeof useDisconnect).toBe("function");

    expect(useAccounts).toBeDefined();
    expect(typeof useAccounts).toBe("function");

    expect(useSolana).toBeDefined();
    expect(typeof useSolana).toBe("function");

    expect(useEthereum).toBeDefined();
    expect(typeof useEthereum).toBe("function");
  });

  it("should have consistent API structure", async () => {
    // Test that our main exports match expected patterns
    const indexModule = await import("./index");
    const exports = Object.keys(indexModule);

    expect(exports).toContain("PhantomProvider");
    expect(exports).toContain("usePhantom");
    expect(exports).toContain("useConnect");
    expect(exports).toContain("useDisconnect");
    expect(exports).toContain("useAccounts");
    expect(exports).toContain("useSolana");
    expect(exports).toContain("useEthereum");
  });
});
