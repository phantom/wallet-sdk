import { Ethereum, createEthereumPlugin } from "./plugin";
import * as getProviderModule from "./getProvider";
import * as connectModule from "./connect";
import * as disconnectModule from "./disconnect";
import * as getAccountsModule from "./getAccounts";
import * as chainUtilsModule from "./chainUtils";
import * as signMessageModule from "./signMessage";
import * as sendTransactionModule from "./sendTransaction";
import * as eventListenersModule from "./eventListeners";
import type { ProviderRpcError } from "./types";

jest.mock("./getProvider");
jest.mock("./connect");
jest.mock("./disconnect");
jest.mock("./getAccounts");
jest.mock("./chainUtils");
jest.mock("./signMessage");
jest.mock("./sendTransaction");
jest.mock("./eventListeners");

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;
const mockConnect = connectModule.connect as jest.MockedFunction<typeof connectModule.connect>;
const mockDisconnect = disconnectModule.disconnect as jest.MockedFunction<typeof disconnectModule.disconnect>;
const mockGetAccounts = getAccountsModule.getAccounts as jest.MockedFunction<typeof getAccountsModule.getAccounts>;
const mockGetChainId = chainUtilsModule.getChainId as jest.MockedFunction<typeof chainUtilsModule.getChainId>;
const mockSwitchChain = chainUtilsModule.switchChain as jest.MockedFunction<typeof chainUtilsModule.switchChain>;
const mockSignPersonalMessage = signMessageModule.signPersonalMessage as jest.MockedFunction<
  typeof signMessageModule.signPersonalMessage
>;
const mockSignTypedData = signMessageModule.signTypedData as jest.MockedFunction<
  typeof signMessageModule.signTypedData
>;
const mockSignTransaction = sendTransactionModule.signTransaction as jest.MockedFunction<
  typeof sendTransactionModule.signTransaction
>;
const mockSendTransaction = sendTransactionModule.sendTransaction as jest.MockedFunction<
  typeof sendTransactionModule.sendTransaction
>;
const mockTriggerEvent = eventListenersModule.triggerEvent as jest.MockedFunction<
  typeof eventListenersModule.triggerEvent
>;

// Test cases shared across multiple test suites
const CHAIN_TEST_CASES = [
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

describe("Ethereum Plugin", () => {
  const testAccount = "0x1234567890abcdef1234567890abcdef12345678";
  let mockProvider: any;
  let ethereum: Ethereum;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock provider
    mockProvider = {
      on: jest.fn(),
      off: jest.fn(),
      request: jest.fn(),
    };

    // Mock getProvider to return a strategy with the mock provider
    mockGetProvider.mockResolvedValue({
      getProvider: () => mockProvider,
    } as any);

    // Create new Ethereum instance
    ethereum = new Ethereum();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with connected=false, chainId=0x1, and empty accounts", () => {
      expect(ethereum.connected).toBe(false);
      expect(ethereum.chainId).toBe("0x1");
      expect(ethereum.accounts).toEqual([]);
    });

    it("should set up event listeners asynchronously", async () => {
      // Wait for async event binding
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockGetProvider).toHaveBeenCalled();
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("accountsChanged", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("chainChanged", expect.any(Function));
    });
  });

  describe("switchChain", () => {
    it("should call underlying provider with hex chainId and update state", async () => {
      mockSwitchChain.mockResolvedValue(undefined);

      await ethereum.switchChain(137); // Polygon mainnet

      // Verify underlying provider was called with hex format
      expect(mockSwitchChain).toHaveBeenCalledWith("0x89");

      // Verify internal state was updated
      expect(ethereum.chainId).toBe("0x89");
    });

    describe("supported networks", () => {
      it.each(CHAIN_TEST_CASES)("should switch to $name ($decimal / $hex)", async ({ decimal, hex }) => {
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain(decimal);

        // Verify underlying provider was called with correct hex format
        expect(mockSwitchChain).toHaveBeenCalledWith(hex);

        // Verify internal state
        expect(ethereum.chainId).toBe(hex);
      });
    });

    describe("hex string chainId support", () => {
      it("should accept hex string with 0x prefix (0x89 for Polygon)", async () => {
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain("0x89"); // Polygon as hex string

        // Verify underlying provider was called with hex format
        expect(mockSwitchChain).toHaveBeenCalledWith("0x89");

        // Verify internal state
        expect(ethereum.chainId).toBe("0x89");
      });

      it.each(CHAIN_TEST_CASES)("should handle $name as hex string ($hex)", async ({ hex }) => {
        mockSwitchChain.mockClear();
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain(hex);

        // Verify underlying provider was called with correct hex format
        expect(mockSwitchChain).toHaveBeenCalledWith(hex);

        // Verify internal state
        expect(ethereum.chainId).toBe(hex);
      });

      it("should normalize uppercase hex strings (0X89 -> 0x89)", async () => {
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain("0X89"); // Uppercase X

        // Should normalize to lowercase
        expect(mockSwitchChain).toHaveBeenCalledWith("0x89");
        expect(ethereum.chainId).toBe("0x89");
      });

      it("should normalize hex strings with uppercase letters (0xA4B1 -> 0xa4b1)", async () => {
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain("0xA4B1"); // Arbitrum with uppercase

        expect(mockSwitchChain).toHaveBeenCalledWith("0xa4b1");
        expect(ethereum.chainId).toBe("0xa4b1");
      });

      it("should handle decimal strings by converting to hex", async () => {
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain("137"); // Polygon as decimal string

        // Should convert to hex
        expect(mockSwitchChain).toHaveBeenCalledWith("0x89");
        expect(ethereum.chainId).toBe("0x89");
      });

      it.each(CHAIN_TEST_CASES)("should handle decimal string format ($decimal -> $hex)", async ({ decimal, hex }) => {
        mockSwitchChain.mockClear();
        mockSwitchChain.mockResolvedValue(undefined);

        await ethereum.switchChain(String(decimal));

        expect(mockSwitchChain).toHaveBeenCalledWith(hex);
        expect(ethereum.chainId).toBe(hex);
      });
    });
  });

  describe("chainId property", () => {
    it("should default to 0x1 (Ethereum mainnet)", () => {
      // Fresh instance should default to 0x1
      const newEthereum = new Ethereum();
      expect(newEthereum.chainId).toBe("0x1");
    });
  });

  describe("getChainId", () => {
    it("should return chainId as decimal number", async () => {
      mockGetChainId.mockResolvedValue("0x89"); // Polygon in hex

      const chainId = await ethereum.getChainId();

      expect(chainId).toBe(137); // Polygon in decimal
      expect(mockGetChainId).toHaveBeenCalled();
      expect(ethereum.chainId).toBe("0x89");
    });

    it.each(CHAIN_TEST_CASES)(
      "should correctly convert hex chainId $hex to decimal $decimal",
      async ({ hex, decimal }) => {
        mockGetChainId.mockResolvedValue(hex);
        const chainId = await ethereum.getChainId();
        expect(chainId).toBe(decimal);
        expect(ethereum.chainId).toBe(hex);
      },
    );
  });

  describe("chainChanged event listener", () => {
    beforeEach(async () => {
      // Wait for async event binding to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      // Ensure handlers are set up by checking mock calls
      expect(mockProvider.on).toHaveBeenCalled();
    });

    it("should update internal state when chainChanged event is received", () => {
      // Verify initial state
      expect(ethereum.chainId).toBe("0x1");

      // Get the chainChanged handler from the provider.on mock
      const chainChangedCalls = mockProvider.on.mock.calls;
      const chainChangedHandler = chainChangedCalls.find((call: any[]) => call[0] === "chainChanged")?.[1];

      if (chainChangedHandler) {
        chainChangedHandler("0x89");
      }

      expect(ethereum.chainId).toBe("0x89");
      expect(mockTriggerEvent).toHaveBeenCalledWith("chainChanged", "0x89");
    });
  });

  describe("connect", () => {
    it("should connect and update internal state", async () => {
      const accounts = [testAccount];
      mockConnect.mockResolvedValue(accounts);

      const result = await ethereum.connect();

      expect(mockConnect).toHaveBeenCalled();
      expect(result).toEqual(accounts);
      expect(ethereum.accounts).toEqual(accounts);
      expect(ethereum.connected).toBe(true);
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValue([testAccount]);
      await ethereum.connect();
    });

    it("should disconnect and clear internal state", async () => {
      mockDisconnect.mockResolvedValue(undefined);

      await ethereum.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(ethereum.accounts).toEqual([]);
      expect(ethereum.connected).toBe(false);
    });
  });

  describe("getAccounts", () => {
    it("should get accounts and update internal state", async () => {
      const accounts = [testAccount];
      mockGetAccounts.mockResolvedValue(accounts);

      const result = await ethereum.getAccounts();

      expect(mockGetAccounts).toHaveBeenCalled();
      expect(result).toEqual(accounts);
      expect(ethereum.accounts).toEqual(accounts);
      expect(ethereum.connected).toBe(true);
    });
  });

  describe("accountsChanged event listener", () => {
    beforeEach(async () => {
      // Wait for async event binding to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      // Ensure handlers are set up by checking mock calls
      expect(mockProvider.on).toHaveBeenCalled();
    });

    it("should update internal state when accountsChanged event is received", () => {
      const newAccounts = [testAccount];
      // Get the accountsChanged handler from the provider.on mock
      const accountsChangedCalls = mockProvider.on.mock.calls;
      const accountsChangedHandler = accountsChangedCalls.find((call: any[]) => call[0] === "accountsChanged")?.[1];

      if (accountsChangedHandler) {
        accountsChangedHandler(newAccounts);
      }

      expect(ethereum.accounts).toEqual(newAccounts);
      expect(ethereum.connected).toBe(true);
      expect(mockTriggerEvent).toHaveBeenCalledWith("accountsChanged", newAccounts);
      expect(mockTriggerEvent).toHaveBeenCalledWith("connect", newAccounts);
    });

    it("should handle empty accounts array", () => {
      // Get the accountsChanged handler from the provider.on mock
      const accountsChangedCalls = mockProvider.on.mock.calls;
      const accountsChangedHandler = accountsChangedCalls.find((call: any[]) => call[0] === "accountsChanged")?.[1];

      if (accountsChangedHandler) {
        accountsChangedHandler([]);
      }

      expect(ethereum.accounts).toEqual([]);
      expect(ethereum.connected).toBe(false);
    });
  });

  describe("connect event listener", () => {
    beforeEach(async () => {
      // Wait for async event binding to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      // Ensure handlers are set up by checking mock calls
      expect(mockProvider.on).toHaveBeenCalled();
    });

    it("should update internal state when connect event is received", async () => {
      const accounts = [testAccount];
      mockProvider.request.mockResolvedValue(accounts);

      // Get the connect handler from the provider.on mock
      const connectCalls = mockProvider.on.mock.calls;
      const connectHandler = connectCalls.find((call: any[]) => call[0] === "connect")?.[1];

      if (connectHandler) {
        await connectHandler();
      }

      expect(ethereum.accounts).toEqual(accounts);
      expect(ethereum.connected).toBe(true);
      expect(mockTriggerEvent).toHaveBeenCalledWith("connect", accounts);
    });
  });

  describe("disconnect event listener", () => {
    beforeEach(async () => {
      // Wait for async event binding to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      // Ensure handlers are set up by checking mock calls
      expect(mockProvider.on).toHaveBeenCalled();
      // Set up connected state
      (ethereum as any)._accounts = [testAccount];
    });

    it("should update internal state when disconnect event is received", () => {
      // Get the disconnect handler from the provider.on mock
      const disconnectCalls = mockProvider.on.mock.calls;
      const disconnectHandler = disconnectCalls.find((call: any[]) => call[0] === "disconnect")?.[1];

      if (disconnectHandler) {
        disconnectHandler();
      }

      expect(ethereum.accounts).toEqual([]);
      expect(ethereum.connected).toBe(false);
      const expectedError: ProviderRpcError = {
        code: 4900,
        message: "Provider disconnected",
      };
      expect(mockTriggerEvent).toHaveBeenCalledWith("disconnect", expectedError);
    });
  });

  describe("request", () => {
    it("should forward request to provider", async () => {
      const requestArgs = { method: "eth_blockNumber", params: [] };
      mockProvider.request.mockResolvedValue("0x123");

      const result = await ethereum.request(requestArgs);

      expect(mockProvider.request).toHaveBeenCalledWith(requestArgs);
      expect(result).toBe("0x123");
    });

    it("should throw error if provider not found", async () => {
      mockGetProvider.mockRejectedValue(new Error("Provider not found."));

      await expect(ethereum.request({ method: "eth_blockNumber" })).rejects.toThrow("Provider not found.");
    });
  });

  describe("signPersonalMessage", () => {
    it("should sign personal message", async () => {
      const message = "Hello";
      const signature = "0xmocksignature";
      mockSignPersonalMessage.mockResolvedValue(signature);

      const result = await ethereum.signPersonalMessage(message, testAccount);

      expect(mockSignPersonalMessage).toHaveBeenCalledWith(message, testAccount);
      expect(result).toBe(signature);
    });
  });

  describe("signTypedData", () => {
    it("should sign typed data", async () => {
      const data = { types: {}, domain: {}, message: {} };
      const signature = "0xmocktypedsignature";
      mockSignTypedData.mockResolvedValue(signature);

      const result = await ethereum.signTypedData(data, testAccount);

      expect(mockSignTypedData).toHaveBeenCalledWith(data, testAccount);
      expect(result).toBe(signature);
    });
  });

  describe("signTransaction", () => {
    it("should sign transaction", async () => {
      const transaction = { to: testAccount, value: "0x0" };
      const signature = "0xsignedtx";
      mockSignTransaction.mockResolvedValue(signature);

      const result = await ethereum.signTransaction(transaction);

      expect(mockSignTransaction).toHaveBeenCalledWith(transaction);
      expect(result).toBe(signature);
    });
  });

  describe("sendTransaction", () => {
    it("should send transaction", async () => {
      const transaction = { to: testAccount, value: "0x0" };
      const txHash = "0xtxhash";
      mockSendTransaction.mockResolvedValue(txHash);

      const result = await ethereum.sendTransaction(transaction);

      expect(mockSendTransaction).toHaveBeenCalledWith(transaction);
      expect(result).toBe(txHash);
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(ethereum.isConnected()).toBe(false);
    });

    it("should return true when connected", async () => {
      mockConnect.mockResolvedValue([testAccount]);
      await ethereum.connect();
      expect(ethereum.isConnected()).toBe(true);
    });
  });

  describe("createEthereumPlugin", () => {
    it("should create a plugin that returns an Ethereum instance", () => {
      const plugin = createEthereumPlugin();
      expect(plugin.name).toBe("ethereum");

      const instance = plugin.create();
      expect(instance).toBeInstanceOf(Ethereum);
    });
  });
});
