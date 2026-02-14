import { InjectedWalletSolanaChain } from "./InjectedWalletSolanaChain";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Transaction } from "@phantom/sdk-types";

describe("InjectedWalletSolanaChain", () => {
  let mockProvider: any;
  let chain: InjectedWalletSolanaChain;
  const walletId = "test-wallet";
  const walletName = "Test Wallet";
  const testPublicKey = "Exb31jgzHxCJokKdeCkbCNEX6buTZxEFLXCaUWXe4VSM";

  beforeEach(() => {
    mockProvider = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signTransaction: jest.fn(),
      signAndSendTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
      signAndSendAllTransactions: jest.fn(),
      switchNetwork: jest.fn(),
      isConnected: false,
      publicKey: null,
      on: jest.fn(),
      off: jest.fn(),
    };

    chain = new InjectedWalletSolanaChain(mockProvider as ISolanaChain, walletId, walletName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with provider, walletId, and walletName", () => {
      expect(chain).toBeDefined();
      expect((chain as any).provider).toBe(mockProvider);
      expect((chain as any).walletId).toBe(walletId);
      expect((chain as any).walletName).toBe(walletName);
    });

    it("should initialize with isConnected=false and publicKey=null", () => {
      expect(chain.isConnected).toBe(false);
      expect(chain.publicKey).toBeNull();
    });

    it("should set up event listeners if provider supports them", () => {
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("accountChanged", expect.any(Function));
    });
  });

  describe("connect", () => {
    describe("standard provider state extraction", () => {
      it("should extract publicKey from provider state (string)", async () => {
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = testPublicKey;

        const result = await chain.connect();

        expect(result).toEqual({ publicKey: testPublicKey });
        expect(chain.publicKey).toBe(testPublicKey);
        expect(chain.isConnected).toBe(true);
      });

      it("should extract publicKey from provider state (PublicKey object with toString)", async () => {
        const mockPublicKey = {
          toString: jest.fn().mockReturnValue(testPublicKey),
        };
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = mockPublicKey;

        const result = await chain.connect();

        expect(result).toEqual({ publicKey: testPublicKey });
        expect(chain.publicKey).toBe(testPublicKey);
        expect(chain.isConnected).toBe(true);
        expect(mockPublicKey.toString).toHaveBeenCalled();
      });
    });

    describe("error handling", () => {
      it("should throw error if provider is not connected after connect()", async () => {
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = false;
        mockProvider.publicKey = testPublicKey;

        await expect(chain.connect()).rejects.toThrow("Provider not connected after connect() call");
      });

      it("should throw error if provider publicKey is null", async () => {
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = null;

        await expect(chain.connect()).rejects.toThrow("Provider not connected after connect() call");
      });

      it("should throw error if publicKey toString returns empty string", async () => {
        const mockPublicKey = {
          toString: jest.fn().mockReturnValue(""),
        };
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = mockPublicKey;

        await expect(chain.connect()).rejects.toThrow("Empty publicKey from provider");
      });

      it("should propagate provider errors", async () => {
        const error = new Error("Provider connection failed");
        (mockProvider.connect as jest.Mock).mockRejectedValue(error);

        await expect(chain.connect()).rejects.toThrow("Provider connection failed");
      });
    });

    describe("options", () => {
      it("should pass onlyIfTrusted option to provider", async () => {
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = testPublicKey;

        await chain.connect({ onlyIfTrusted: true });

        expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
      });

      it("should pass undefined options if not provided", async () => {
        (mockProvider.connect as jest.Mock).mockResolvedValue(undefined);
        mockProvider.isConnected = true;
        mockProvider.publicKey = testPublicKey;

        await chain.connect();

        expect(mockProvider.connect).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("disconnect", () => {
    it("should call provider disconnect and update state", async () => {
      (chain as any)._publicKey = testPublicKey;
      (mockProvider.disconnect as jest.Mock).mockResolvedValue(undefined);

      await chain.disconnect();

      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(chain.isConnected).toBe(false);
      expect(chain.publicKey).toBeNull();
    });

    it("should propagate provider errors", async () => {
      const error = new Error("Disconnect failed");
      (mockProvider.disconnect as jest.Mock).mockRejectedValue(error);

      await expect(chain.disconnect()).rejects.toThrow("Disconnect failed");
    });
  });

  describe("signMessage", () => {
    it("should call provider signMessage and return signature", async () => {
      const message = "Hello, World!";
      const signature = new Uint8Array(64).fill(1);
      (mockProvider.signMessage as jest.Mock).mockResolvedValue({
        signature,
        publicKey: testPublicKey,
      });

      const result = await chain.signMessage(message);

      expect(mockProvider.signMessage).toHaveBeenCalledWith(message);
      expect(result.signature).toEqual(signature);
      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should handle base64 signature", async () => {
      const message = "Hello, World!";
      const signatureBase64 = Buffer.from(new Uint8Array(64).fill(1)).toString("base64");
      (mockProvider.signMessage as jest.Mock).mockResolvedValue({
        signature: signatureBase64,
        publicKey: testPublicKey,
      });

      const result = await chain.signMessage(message);

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature.length).toBe(64);
    });

    it("should use stored publicKey if not returned", async () => {
      (chain as any)._publicKey = testPublicKey;
      const message = "Hello, World!";
      const signature = new Uint8Array(64).fill(1);
      (mockProvider.signMessage as jest.Mock).mockResolvedValue({
        signature,
      });

      const result = await chain.signMessage(message);

      expect(result.publicKey).toBe(testPublicKey);
    });
  });

  describe("signTransaction", () => {
    it("should call provider signTransaction and return signed transaction", async () => {
      const transaction = {} as Transaction;
      const signedTransaction = {} as Transaction;
      (mockProvider.signTransaction as jest.Mock).mockResolvedValue(signedTransaction);

      const result = await chain.signTransaction(transaction);

      expect(mockProvider.signTransaction).toHaveBeenCalledWith(transaction);
      expect(result).toBe(signedTransaction);
    });
  });

  describe("signAndSendTransaction", () => {
    it("should call provider signAndSendTransaction and return signature", async () => {
      const transaction = {} as Transaction;
      const signature = "test-signature";
      (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue({ signature });

      const result = await chain.signAndSendTransaction(transaction);

      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(transaction);
      expect(result).toEqual({ signature });
    });
  });

  describe("event listeners", () => {
    it("should update state when provider emits connect event", () => {
      const connectHandler = (mockProvider.on as jest.Mock).mock.calls.find(call => call[0] === "connect")?.[1];

      expect(connectHandler).toBeDefined();
      connectHandler(testPublicKey);

      expect(chain.isConnected).toBe(true);
      expect(chain.publicKey).toBe(testPublicKey);
    });

    it("should update state when provider emits disconnect event", () => {
      (chain as any)._publicKey = testPublicKey;

      const disconnectHandler = (mockProvider.on as jest.Mock).mock.calls.find(call => call[0] === "disconnect")?.[1];

      expect(disconnectHandler).toBeDefined();
      disconnectHandler();

      expect(chain.isConnected).toBe(false);
      expect(chain.publicKey).toBeNull();
    });

    it("should update publicKey when provider emits accountChanged event", () => {
      const newPublicKey = "NewPublicKey123";
      const accountChangedHandler = (mockProvider.on as jest.Mock).mock.calls.find(
        call => call[0] === "accountChanged",
      )?.[1];

      expect(accountChangedHandler).toBeDefined();
      accountChangedHandler(newPublicKey);

      expect(chain.publicKey).toBe(newPublicKey);
      expect(chain.isConnected).toBe(true);
    });

    it("should set isConnected=false when provider emits accountChanged with null", () => {
      const accountChangedHandler = (mockProvider.on as jest.Mock).mock.calls.find(
        call => call[0] === "accountChanged",
      )?.[1];

      expect(accountChangedHandler).toBeDefined();

      // First set a valid key
      accountChangedHandler(testPublicKey);
      expect(chain.isConnected).toBe(true);

      // Then clear it
      accountChangedHandler(null as any);
      expect(chain.publicKey).toBeNull();
      expect(chain.isConnected).toBe(false);
    });

    it("should set isConnected=false when provider emits accountChanged with empty string", () => {
      const accountChangedHandler = (mockProvider.on as jest.Mock).mock.calls.find(
        call => call[0] === "accountChanged",
      )?.[1];

      expect(accountChangedHandler).toBeDefined();

      // First set a valid key
      accountChangedHandler(testPublicKey);
      expect(chain.isConnected).toBe(true);

      // Then set to empty string
      accountChangedHandler("");
      expect(chain.publicKey).toBeNull();
      expect(chain.isConnected).toBe(false);
    });

    it("should emit accountChanged event when provider emits accountChanged", () => {
      const listener = jest.fn();
      chain.on("accountChanged", listener);

      const accountChangedHandler = (mockProvider.on as jest.Mock).mock.calls.find(
        call => call[0] === "accountChanged",
      )?.[1];

      expect(accountChangedHandler).toBeDefined();
      accountChangedHandler(testPublicKey);

      expect(listener).toHaveBeenCalledWith(testPublicKey);
    });

    it("should handle switching between different accounts", () => {
      const accountChangedHandler = (mockProvider.on as jest.Mock).mock.calls.find(
        call => call[0] === "accountChanged",
      )?.[1];

      expect(accountChangedHandler).toBeDefined();

      const firstPublicKey = testPublicKey;
      const secondPublicKey = "DifferentSolanaPublicKeyHere123456789ABCDEF";

      accountChangedHandler(firstPublicKey);
      expect(chain.publicKey).toBe(firstPublicKey);
      expect(chain.isConnected).toBe(true);

      accountChangedHandler(secondPublicKey);
      expect(chain.publicKey).toBe(secondPublicKey);
      expect(chain.isConnected).toBe(true);
    });
  });

  describe("on/off", () => {
    it("should allow subscribing to events", () => {
      const listener = jest.fn();
      chain.on("connect", listener);

      // Trigger event through internal emitter
      (chain as any).eventEmitter.emit("connect", testPublicKey);

      expect(listener).toHaveBeenCalledWith(testPublicKey);
    });

    it("should allow unsubscribing from events", () => {
      const listener = jest.fn();
      chain.on("connect", listener);
      chain.off("connect", listener);

      // Trigger event through internal emitter
      (chain as any).eventEmitter.emit("connect", testPublicKey);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
