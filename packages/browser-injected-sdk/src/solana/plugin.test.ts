import { Solana, createSolanaPlugin } from "./plugin";
import * as getProviderModule from "./getProvider";
import * as connectModule from "./connect";
import * as disconnectModule from "./disconnect";
import * as signMessageModule from "./signMessage";
import * as signTransactionModule from "./signTransaction";
import * as signAndSendTransactionModule from "./signAndSendTransaction";
import * as signAllTransactionsModule from "./signAllTransactions";
import * as signAndSendAllTransactionsModule from "./signAndSendAllTransactions";
import * as getAccountModule from "./getAccount";
import type { Transaction } from "@phantom/sdk-types";
import { TextEncoder } from "util";
import { clearAllEventListeners } from "./eventListeners";

// Polyfill TextEncoder for Node.js test environment
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder as any;
}

jest.mock("./getProvider");
jest.mock("./connect");
jest.mock("./disconnect");
jest.mock("./signMessage");
jest.mock("./signTransaction");
jest.mock("./signAndSendTransaction");
jest.mock("./signAllTransactions");
jest.mock("./signAndSendAllTransactions");
jest.mock("./getAccount");

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;
const mockConnect = connectModule.connect as jest.MockedFunction<typeof connectModule.connect>;
const mockDisconnect = disconnectModule.disconnect as jest.MockedFunction<typeof disconnectModule.disconnect>;
const mockSignMessage = signMessageModule.signMessage as jest.MockedFunction<typeof signMessageModule.signMessage>;
const mockSignTransaction = signTransactionModule.signTransaction as jest.MockedFunction<
  typeof signTransactionModule.signTransaction
>;
const mockSignAndSendTransaction = signAndSendTransactionModule.signAndSendTransaction as jest.MockedFunction<
  typeof signAndSendTransactionModule.signAndSendTransaction
>;
const mockSignAllTransactions = signAllTransactionsModule.signAllTransactions as jest.MockedFunction<
  typeof signAllTransactionsModule.signAllTransactions
>;
const mockSignAndSendAllTransactions =
  signAndSendAllTransactionsModule.signAndSendAllTransactions as jest.MockedFunction<
    typeof signAndSendAllTransactionsModule.signAndSendAllTransactions
  >;
const mockGetAccount = getAccountModule.getAccount as jest.MockedFunction<typeof getAccountModule.getAccount>;

describe("Solana Plugin", () => {
  const testPublicKey = "Exb31jgzHxCJokKdeCkbCNEX6buTZxEFLXCaUWXe4VSM";
  let mockProvider: any;
  let solana: Solana;

  beforeEach(() => {
    jest.clearAllMocks();
    triggerEventSpy.mockClear();
    // Clear event listeners between tests
    clearAllEventListeners();

    // Create mock provider
    mockProvider = {
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock getProvider to return a strategy with the mock provider
    mockGetProvider.mockResolvedValue({
      getProvider: () => mockProvider,
    } as any);

    // Create new Solana instance
    solana = new Solana();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with connected=false and publicKey=null", () => {
      expect(solana.connected).toBe(false);
      expect(solana.publicKey).toBeNull();
    });

    it("should set up event listeners asynchronously", async () => {
      // Wait for async event binding
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockGetProvider).toHaveBeenCalled();
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("accountChanged", expect.any(Function));
    });
  });

  describe("connected property", () => {
    it("should return false when not connected", () => {
      expect(solana.connected).toBe(false);
    });

    it("should return true when connected", async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      expect(solana.connected).toBe(true);
    });
  });

  describe("publicKey property", () => {
    it("should return null when not connected", () => {
      expect(solana.publicKey).toBeNull();
    });

    it("should return publicKey when connected", async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      expect(solana.publicKey).toBe(testPublicKey);
    });
  });

  describe("connect", () => {
    it("should connect and update internal state", async () => {
      mockConnect.mockResolvedValue(testPublicKey);

      const result = await solana.connect();

      expect(mockConnect).toHaveBeenCalled();
      expect(result.publicKey).toBe(testPublicKey);
      expect(solana.publicKey).toBe(testPublicKey);
      expect(solana.connected).toBe(true);
    });

    it("should handle connect with onlyIfTrusted option", async () => {
      mockConnect.mockResolvedValue(testPublicKey);

      await solana.connect({ onlyIfTrusted: true });

      expect(mockConnect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    });

    it("should throw error if connect fails", async () => {
      mockConnect.mockResolvedValue(undefined as any);

      await expect(solana.connect()).rejects.toThrow("Failed to connect to Solana wallet");
    });

    it("should update publicKey when connecting", async () => {
      mockConnect.mockResolvedValue(testPublicKey);

      await solana.connect();

      expect(solana.publicKey).toBe(testPublicKey);
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
    });

    it("should disconnect and clear internal state", async () => {
      mockDisconnect.mockResolvedValue(undefined);

      await solana.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(solana.publicKey).toBeNull();
      expect(solana.connected).toBe(false);
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
    });

    it("should sign message using string", async () => {
      const message = "Hello from Phantom SDK!";
      const signature = new Uint8Array(64).fill(146);
      mockSignMessage.mockResolvedValue({
        signature,
        address: testPublicKey,
      });

      const result = await solana.signMessage(message);

      expect(mockSignMessage).toHaveBeenCalledWith(new TextEncoder().encode(message));
      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should handle Uint8Array message", async () => {
      const messageBytes = new Uint8Array([72, 101, 108, 108, 111]);
      const signature = new Uint8Array(64).fill(146);
      mockSignMessage.mockResolvedValue({
        signature,
        address: testPublicKey,
      });

      const result = await solana.signMessage(messageBytes);

      expect(mockSignMessage).toHaveBeenCalledWith(messageBytes);
      expect(result.signature).toBeInstanceOf(Uint8Array);
    });

    it("should handle signature as Uint8Array", async () => {
      const signature = new Uint8Array(64).fill(146);
      mockSignMessage.mockResolvedValue({
        signature,
        address: testPublicKey,
      });

      const result = await solana.signMessage("Hello");

      expect(result.signature).toBe(signature);
    });

    it("should handle signature as array-like object", async () => {
      const signatureBytes = new Uint8Array([1, 2, 3, 4, 5]);
      // Mock signature as array-like object (some implementations return this)
      const arrayLikeSignature = Array.from(signatureBytes);
      mockSignMessage.mockResolvedValue({
        signature: arrayLikeSignature as any,
        address: testPublicKey,
      });

      const result = await solana.signMessage("Hello");

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature).toEqual(signatureBytes);
    });
  });

  describe("signTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      mockTransaction = {} as Transaction;
    });

    it("should sign transaction when connected", async () => {
      const signedTx = {} as Transaction;
      mockSignTransaction.mockResolvedValue(signedTx);

      const result = await solana.signTransaction(mockTransaction);

      expect(mockSignTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(signedTx);
    });
  });

  describe("signAndSendTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      mockTransaction = {} as unknown as Transaction;
    });

    it("should sign and send transaction when connected", async () => {
      const signature = "5j7s8K9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8z";
      mockSignAndSendTransaction.mockResolvedValue({ signature });

      const result = await solana.signAndSendTransaction(mockTransaction);

      expect(mockSignAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result.signature).toBe(signature);
    });
  });

  describe("signAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign all transactions when connected", async () => {
      const signedTxs = [{} as Transaction, {} as Transaction];
      mockSignAllTransactions.mockResolvedValue(signedTxs);

      const result = await solana.signAllTransactions(mockTransactions);

      expect(mockSignAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.length).toBe(2);
    });
  });

  describe("signAndSendAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign and send all transactions when connected", async () => {
      const signatures = ["sig1", "sig2"];
      mockSignAndSendAllTransactions.mockResolvedValue({ signatures });

      const result = await solana.signAndSendAllTransactions(mockTransactions);

      expect(mockSignAndSendAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.signatures.length).toBe(2);
    });
  });

  describe("switchNetwork", () => {
    it("should resolve without error for mainnet", async () => {
      await expect(solana.switchNetwork("mainnet")).resolves.toBeUndefined();
    });

    it("should resolve without error for devnet", async () => {
      await expect(solana.switchNetwork("devnet")).resolves.toBeUndefined();
    });
  });

  describe("getPublicKey", () => {
    it("should return null when not connected", async () => {
      const result = await solana.getPublicKey();
      expect(result).toBeNull();
    });

    it("should return publicKey when connected", async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      const result = await solana.getPublicKey();
      expect(result).toBe(testPublicKey);
    });

    it("should fetch account if publicKey is not set", async () => {
      mockGetAccount.mockResolvedValue(testPublicKey);

      const result = await solana.getPublicKey();

      expect(mockGetAccount).toHaveBeenCalled();
      expect(result).toBe(testPublicKey);
      expect(solana.publicKey).toBe(testPublicKey);
      expect(solana.connected).toBe(true);
    });

    it("should return null if getAccount fails", async () => {
      mockGetAccount.mockRejectedValue(new Error("Failed"));

      const result = await solana.getPublicKey();

      expect(result).toBeNull();
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(solana.isConnected()).toBe(false);
    });

    it("should return true when connected", async () => {
      mockConnect.mockResolvedValue(testPublicKey);
      await solana.connect();
      expect(solana.isConnected()).toBe(true);
    });
  });

  describe("event handling", () => {
    beforeEach(async () => {
      // Wait for async event binding to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      // Ensure handlers are set up by checking mock calls
      expect(mockProvider.on).toHaveBeenCalled();
    });

    it("should emit connect event when provider emits connect", () => {
      const listener = jest.fn();
      solana.on("connect", listener);

      // Get the connect handler from the provider.on mock
      const connectCalls = mockProvider.on.mock.calls;
      const connectHandler = connectCalls.find((call: any[]) => call[0] === "connect")?.[1];

      if (connectHandler) {
        connectHandler({ toString: () => testPublicKey });
      }

      expect(listener).toHaveBeenCalledWith(testPublicKey);
      expect(solana.publicKey).toBe(testPublicKey);
      expect(solana.connected).toBe(true);
      expect(triggerEventSpy).toHaveBeenCalledWith("connect", testPublicKey);
    });

    it("should emit disconnect event when provider emits disconnect", () => {
      // First connect to set up state
      (solana as any)._publicKey = testPublicKey;

      const listener = jest.fn();
      solana.on("disconnect", listener);

      // Get the disconnect handler from the provider.on mock
      const disconnectCalls = mockProvider.on.mock.calls;
      const disconnectHandler = disconnectCalls.find((call: any[]) => call[0] === "disconnect")?.[1];

      if (disconnectHandler) {
        disconnectHandler();
      }

      expect(listener).toHaveBeenCalled();
      expect(solana.publicKey).toBeNull();
      expect(solana.connected).toBe(false);
      expect(triggerEventSpy).toHaveBeenCalledWith("disconnect");
    });

    it("should emit accountChanged event when provider emits accountChanged", () => {
      const listener = jest.fn();
      solana.on("accountChanged", listener);

      const newPublicKey = "NewPublicKey123";
      // Get the accountChanged handler from the provider.on mock
      const accountChangedCalls = mockProvider.on.mock.calls;
      const accountChangedHandler = accountChangedCalls.find((call: any[]) => call[0] === "accountChanged")?.[1];

      if (accountChangedHandler) {
        accountChangedHandler({ toString: () => newPublicKey });
      }

      expect(listener).toHaveBeenCalledWith(newPublicKey);
      expect(solana.publicKey).toBe(newPublicKey);
      expect(solana.connected).toBe(true);
      expect(triggerEventSpy).toHaveBeenCalledWith("accountChanged", newPublicKey);
      expect(triggerEventSpy).toHaveBeenCalledWith("connect", newPublicKey);
    });

    it("should handle accountChanged with null publicKey", () => {
      const listener = jest.fn();
      solana.on("accountChanged", listener);

      // Get the accountChanged handler from the provider.on mock
      const accountChangedCalls = mockProvider.on.mock.calls;
      const accountChangedHandler = accountChangedCalls.find((call: any[]) => call[0] === "accountChanged")?.[1];

      if (accountChangedHandler) {
        accountChangedHandler(null);
      }

      expect(listener).toHaveBeenCalledWith(null);
      expect(solana.publicKey).toBeNull();
      expect(solana.connected).toBe(false);
    });

    it("should allow removing event listeners", () => {
      const listener = jest.fn();
      solana.on("connect", listener);
      solana.off("connect", listener);

      // Get the connect handler from the provider.on mock
      const connectCalls = mockProvider.on.mock.calls;
      const connectHandler = connectCalls.find((call: any[]) => call[0] === "connect")?.[1];

      if (connectHandler) {
        connectHandler({ toString: () => testPublicKey });
      }

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("createSolanaPlugin", () => {
    it("should create a plugin that returns a Solana instance", () => {
      const plugin = createSolanaPlugin();
      expect(plugin.name).toBe("solana");

      const instance = plugin.create();
      expect(instance).toBeInstanceOf(Solana);
    });
  });
});
