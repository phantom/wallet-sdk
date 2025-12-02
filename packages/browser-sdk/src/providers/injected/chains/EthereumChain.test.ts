import { PhantomEthereumChain } from "./EthereumChain";

describe("PhantomEthereumChain", () => {
  let mockPhantom: any;
  let ethereumChain: PhantomEthereumChain;

  beforeEach(() => {
    // Store event listeners for testing
    const eventListeners = new Map<string, any[]>();

    // Create mock Phantom object
    mockPhantom = {
      extension: {
        isInstalled: () => true,
      },
      ethereum: {
        getProvider: jest.fn().mockResolvedValue({
          request: jest.fn(),
        }),
        signPersonalMessage: jest.fn().mockResolvedValue("0xmocksignature"),
        signTypedData: jest.fn().mockResolvedValue("0xmocktypedsignature"),
        signTransaction: jest.fn().mockResolvedValue("0xsignedtx"),
        sendTransaction: jest.fn().mockResolvedValue("0xtxhash"),
        switchChain: jest.fn().mockResolvedValue(undefined),
        getChainId: jest.fn().mockResolvedValue("0x1"),
        getAccounts: jest.fn().mockResolvedValue(["0x1234567890abcdef1234567890abcdef12345678"]),
        disconnect: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (!eventListeners.has(event)) {
            eventListeners.set(event, []);
          }
          eventListeners.get(event)!.push(listener);
          return () => {
            const listeners = eventListeners.get(event);
            if (listeners) {
              const index = listeners.indexOf(listener);
              if (index > -1) {
                listeners.splice(index, 1);
              }
            }
          };
        }),
        removeEventListener: jest.fn(),
      },
    };

    // Store eventListeners on mockPhantom for test access
    (mockPhantom.ethereum as any)._eventListeners = eventListeners;

    ethereumChain = new PhantomEthereumChain(mockPhantom);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("switchChain", () => {
    it("should call underlying provider with hex chainId and emit event", async () => {
      const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

      await ethereumChain.switchChain(137); // Polygon mainnet

      // Verify underlying provider was called with hex format
      expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith("0x89");

      // Verify chainChanged event was emitted with hex format
      expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");

      // Verify internal state was updated
      expect((ethereumChain as any)._chainId).toBe("0x89");
    });

    it("should update _chainId property when switching chains", async () => {
      await ethereumChain.switchChain(1); // Ethereum mainnet
      expect((ethereumChain as any)._chainId).toBe("0x1");

      await ethereumChain.switchChain(8453); // Base mainnet
      expect((ethereumChain as any)._chainId).toBe("0x2105");

      await ethereumChain.switchChain(42161); // Arbitrum One
      expect((ethereumChain as any)._chainId).toBe("0xa4b1");
    });

    describe("supported networks", () => {
      const testCases = [
        { decimal: 1, hex: "0x1", name: "Ethereum Mainnet" },
        { decimal: 11155111, hex: "0xaa36a7", name: "Ethereum Sepolia" },
        { decimal: 137, hex: "0x89", name: "Polygon Mainnet" },
        { decimal: 80002, hex: "0x13882", name: "Polygon Amoy" },
        { decimal: 8453, hex: "0x2105", name: "Base Mainnet" },
        { decimal: 84532, hex: "0x14a34", name: "Base Sepolia" },
        { decimal: 42161, hex: "0xa4b1", name: "Arbitrum One" },
        { decimal: 421614, hex: "0x66eee", name: "Arbitrum Sepolia" },
        { decimal: 143, hex: "0x8f", name: "Monad Mainnet" },
        { decimal: 10143, hex: "0x279f", name: "Monad Testnet" },
      ];

      testCases.forEach(({ decimal, hex, name }) => {
        it(`should switch to ${name} (${decimal} / ${hex})`, async () => {
          const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

          await ethereumChain.switchChain(decimal);

          // Verify underlying provider was called with correct hex format
          expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith(hex);

          // Verify event was emitted with correct hex format
          expect(emitSpy).toHaveBeenCalledWith("chainChanged", hex);

          // Verify internal state
          expect((ethereumChain as any)._chainId).toBe(hex);
        });
      });
    });

    describe("hex string chainId support", () => {
      it("should accept hex string with 0x prefix (0x89 for Polygon)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

        await ethereumChain.switchChain("0x89"); // Polygon as hex string

        // Verify underlying provider was called with hex format
        expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith("0x89");

        // Verify event was emitted with hex format
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");

        // Verify internal state
        expect((ethereumChain as any)._chainId).toBe("0x89");
      });

      it("should handle all supported networks as hex strings", async () => {
        const testCases = [
          { hex: "0x1", decimal: 1, name: "Ethereum Mainnet" },
          { hex: "0xaa36a7", decimal: 11155111, name: "Ethereum Sepolia" },
          { hex: "0x89", decimal: 137, name: "Polygon Mainnet" },
          { hex: "0x13882", decimal: 80002, name: "Polygon Amoy" },
          { hex: "0x2105", decimal: 8453, name: "Base Mainnet" },
          { hex: "0x14a34", decimal: 84532, name: "Base Sepolia" },
          { hex: "0xa4b1", decimal: 42161, name: "Arbitrum One" },
          { hex: "0x66eee", decimal: 421614, name: "Arbitrum Sepolia" },
          { hex: "0x8f", decimal: 143, name: "Monad Mainnet" },
          { hex: "0x279f", decimal: 10143, name: "Monad Testnet" },
        ];

        for (const { hex } of testCases) {
          const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

          await ethereumChain.switchChain(hex);

          // Verify underlying provider was called with correct hex format
          expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith(hex);

          // Verify event was emitted with correct hex format
          expect(emitSpy).toHaveBeenCalledWith("chainChanged", hex);

          // Verify internal state
          expect((ethereumChain as any)._chainId).toBe(hex);

          emitSpy.mockRestore();
        }
      });

      it("should handle uppercase hex strings (0X89)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

        await ethereumChain.switchChain("0X89"); // Uppercase X

        // Should keep the original format but recognize as hex
        expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith("0X89");
        expect((ethereumChain as any)._chainId).toBe("0X89");
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0X89");
      });

      it("should handle hex strings with uppercase letters (0xA4B1)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

        await ethereumChain.switchChain("0xA4B1"); // Arbitrum with uppercase

        expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith("0xA4B1");
        expect((ethereumChain as any)._chainId).toBe("0xA4B1");
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0xA4B1");
      });

      it("should handle decimal strings by converting to hex", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

        await ethereumChain.switchChain("137"); // Polygon as decimal string

        // Should convert to hex
        expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith("0x89");
        expect((ethereumChain as any)._chainId).toBe("0x89");
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
      });

      it("should handle various decimal string formats", async () => {
        const testCases = [
          { decimal: "1", hex: "0x1" },
          { decimal: "137", hex: "0x89" },
          { decimal: "8453", hex: "0x2105" },
          { decimal: "42161", hex: "0xa4b1" },
        ];

        for (const { decimal, hex } of testCases) {
          mockPhantom.ethereum.switchChain.mockClear();
          const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

          await ethereumChain.switchChain(decimal);

          expect(mockPhantom.ethereum.switchChain).toHaveBeenCalledWith(hex);
          expect((ethereumChain as any)._chainId).toBe(hex);

          emitSpy.mockRestore();
        }
      });
    });
  });

  describe("chainId property", () => {
    it("should return chainId in hex format", async () => {
      await ethereumChain.switchChain(137); // Polygon

      const hexChainId = ethereumChain.chainId;
      expect(hexChainId).toBe("0x89");
    });

    it("should update when chain is switched", async () => {
      await ethereumChain.switchChain(1); // Ethereum
      expect(ethereumChain.chainId).toBe("0x1");

      await ethereumChain.switchChain(8453); // Base
      expect(ethereumChain.chainId).toBe("0x2105");

      await ethereumChain.switchChain(42161); // Arbitrum
      expect(ethereumChain.chainId).toBe("0xa4b1");
    });

    it("should default to 0x1 (Ethereum mainnet)", () => {
      // Fresh instance should default to 0x1
      const newEthereumChain = new PhantomEthereumChain(mockPhantom);
      expect(newEthereumChain.chainId).toBe("0x1");
    });
  });

  describe("getChainId", () => {
    it("should return chainId as decimal number", async () => {
      mockPhantom.ethereum.getChainId.mockResolvedValue("0x89"); // Polygon in hex

      const chainId = await ethereumChain.getChainId();

      expect(chainId).toBe(137); // Polygon in decimal
      expect(mockPhantom.ethereum.getChainId).toHaveBeenCalled();
    });

    it("should correctly convert various hex chainIds to decimal", async () => {
      const testCases = [
        { hex: "0x1", decimal: 1 },
        { hex: "0xaa36a7", decimal: 11155111 },
        { hex: "0x89", decimal: 137 },
        { hex: "0x2105", decimal: 8453 },
        { hex: "0xa4b1", decimal: 42161 },
      ];

      for (const { hex, decimal } of testCases) {
        mockPhantom.ethereum.getChainId.mockResolvedValue(hex);
        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(decimal);
      }
    });
  });

  describe("chainChanged event listener", () => {
    it("should update internal state when chainChanged event is received", () => {
      // Verify initial state
      expect((ethereumChain as any)._chainId).toBe("0x1");

      // Get the chainChanged listeners from the stored event listeners
      const eventListeners = (mockPhantom.ethereum as any)._eventListeners;
      const chainChangedListeners = eventListeners.get("chainChanged") || [];

      expect(chainChangedListeners.length).toBeGreaterThan(0);
      const chainChangedListener = chainChangedListeners[chainChangedListeners.length - 1]; // Get the last one

      // Simulate chainChanged event from provider by calling the listener directly
      // The listener is an arrow function that captures 'this', so it should work
      chainChangedListener("0x89"); // Polygon

      // Verify internal state was updated
      expect((ethereumChain as any)._chainId).toBe("0x89");
    });

    it("should emit chainChanged event when received from provider", () => {
      const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

      // Get the chainChanged listeners
      const eventListeners = (mockPhantom.ethereum as any)._eventListeners;
      const chainChangedListeners = eventListeners.get("chainChanged") || [];
      expect(chainChangedListeners.length).toBeGreaterThan(0);

      // Get the last one (from PhantomEthereumChain.setupEventListeners)
      const chainChangedListener = chainChangedListeners[chainChangedListeners.length - 1];

      // Simulate chainChanged event from provider
      chainChangedListener("0x2105"); // Base

      // Verify event was emitted
      expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x2105");

      // Also verify internal state was updated
      expect((ethereumChain as any)._chainId).toBe("0x2105");
    });
  });

  describe("EIP-1193 compliance", () => {
    it("should have connected property", async () => {
      await ethereumChain.connect();
      expect(ethereumChain.connected).toBe(true);
    });

    it("should have chainId property in hex format", () => {
      expect(ethereumChain.chainId).toMatch(/^0x[0-9a-f]+$/);
    });

    it("should have accounts property", () => {
      expect(Array.isArray(ethereumChain.accounts)).toBe(true);
    });

    it("should support on/off event methods", () => {
      const mockListener = jest.fn();

      ethereumChain.on("chainChanged", mockListener);
      (ethereumChain as any).eventEmitter.emit("chainChanged", "0x1");
      expect(mockListener).toHaveBeenCalledWith("0x1");

      ethereumChain.off("chainChanged", mockListener);
      (ethereumChain as any).eventEmitter.emit("chainChanged", "0x89");
      expect(mockListener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe("integration with underlying provider", () => {
    it("should delegate signPersonalMessage to phantom.ethereum", async () => {
      const message = "0x48656c6c6f"; // "Hello" in hex
      const address = "0x1234567890abcdef1234567890abcdef12345678";

      await ethereumChain.signPersonalMessage(message, address);

      expect(mockPhantom.ethereum.signPersonalMessage).toHaveBeenCalledWith(message, address);
    });

    it("should delegate signTypedData to phantom.ethereum", async () => {
      const typedData = { types: {}, domain: {}, message: {} };
      const address = "0x1234567890abcdef1234567890abcdef12345678";

      await ethereumChain.signTypedData(typedData, address);

      expect(mockPhantom.ethereum.signTypedData).toHaveBeenCalledWith(typedData, address);
    });

    it("should delegate sendTransaction to phantom.ethereum", async () => {
      const transaction = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
      };

      await ethereumChain.sendTransaction(transaction);

      expect(mockPhantom.ethereum.sendTransaction).toHaveBeenCalledWith(transaction);
    });
  });
});
