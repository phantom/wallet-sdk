// NOTE: EmbeddedSolanaChain imports @phantom/parsers, which pulls in @solana/web3.js.
// In this Jest setup, some transitive deps ship ESM browser builds that Jest won't transform.
// We only need to test connection state derivation here, so we mock those heavy deps.
jest.mock("@solana/web3.js", () => ({}), { virtual: true });
jest.mock("@phantom/parsers", () => ({
  parseSolanaSignedTransaction: jest.fn(),
}));

describe("EmbeddedSolanaChain", () => {
  let EmbeddedSolanaChain: any;
  let mockProvider: any;
  let solanaChain: any;

  beforeEach(() => {
    // Require after mocks are registered
    ({ EmbeddedSolanaChain } = require("./SolanaChain"));

    mockProvider = {
      isConnected: jest.fn().mockReturnValue(false),
      getAddresses: jest.fn().mockReturnValue([]),
      signMessage: jest.fn().mockResolvedValue({ signature: "3vQB7B6MrGQZaxCuFg4oh" } as any),
      signTransaction: jest.fn().mockResolvedValue({ rawTransaction: "" } as any),
      signAndSendTransaction: jest.fn().mockResolvedValue({ hash: "sig", rawTransaction: "" } as any),
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    solanaChain = new EmbeddedSolanaChain(mockProvider);
  });

  it("derives isConnected from existence of cached publicKey", async () => {
    expect(solanaChain.publicKey).toBeNull();
    expect(solanaChain.isConnected).toBe(false);

    mockProvider.isConnected.mockReturnValue(true);
    mockProvider.getAddresses.mockReturnValue([
      { addressType: "Solana", address: "So11111111111111111111111111111111111111112" },
    ]);

    await solanaChain.connect();

    expect(solanaChain.publicKey).toBe("So11111111111111111111111111111111111111112");
    expect(solanaChain.isConnected).toBe(true);
  });

  it("initializes disconnected when provider is disconnected (even if addresses exist)", () => {
    mockProvider.isConnected.mockReturnValue(false);
    mockProvider.getAddresses.mockReturnValue([
      { addressType: "Solana", address: "So11111111111111111111111111111111111111112" },
    ]);

    expect(solanaChain.publicKey).toBeNull();
    expect(solanaChain.isConnected).toBe(false);
  });
});
