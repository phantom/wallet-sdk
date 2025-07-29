import { EmbeddedProvider } from "./index";
import { IndexedDBStorage } from "./storage";
import { PhantomClient, AddressType } from "@phantom/client";

// Mock dependencies
jest.mock("./storage");
jest.mock("@phantom/client");
jest.mock("@phantom/api-key-stamper", () => ({
  ApiKeyStamper: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./auth");

const MockedIndexedDBStorage = IndexedDBStorage as jest.MockedClass<typeof IndexedDBStorage>;
const MockedPhantomClient = PhantomClient as jest.MockedClass<typeof PhantomClient>;

describe("EmbeddedProvider", () => {
  let provider: EmbeddedProvider;
  let mockStorage: jest.Mocked<IndexedDBStorage>;
  let mockClient: jest.Mocked<PhantomClient>;

  const config = {
    apiBaseUrl: "https://api.phantom.app",
    organizationId: "org-123",
    embeddedWalletType: "app-wallet" as const,
    addressTypes: [AddressType.solana, AddressType.ethereum],
    solanaProvider: "web3js" as const,
  };

  const mockSession = {
    walletId: "wallet-123",
    organizationId: "org-123",
    keypair: {
      secretKey: "mock-secret-key",
      publicKey: "mock-public-key",
    },
  };

  const mockWalletAddresses = [
    {
      addressType: AddressType.solana,
      address: "So11111111111111111111111111111111111111112",
    },
    {
      addressType: AddressType.ethereum,
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
    },
    {
      addressType: AddressType.bitcoinSegwit,
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockStorage = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
    } as any;

    mockClient = {
      getWalletAddresses: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    } as any;

    MockedIndexedDBStorage.mockImplementation(() => mockStorage);
    MockedPhantomClient.mockImplementation(() => mockClient);

    provider = new EmbeddedProvider(config);
  });

  describe("connect with existing session", () => {
    it("should check session, call client getWalletAddresses, and return filtered address types", async () => {
      // Arrange: Mock existing session
      mockStorage.getSession.mockResolvedValue(mockSession);

      // Mock client.getWalletAddresses to return multiple address types
      mockClient.getWalletAddresses.mockResolvedValue(mockWalletAddresses);

      // Act: Call connect
      const result = await provider.connect();

      // Assert: Check that session was retrieved
      expect(mockStorage.getSession).toHaveBeenCalledTimes(1);

      // Assert: Check that PhantomClient was created with session data
      expect(MockedPhantomClient).toHaveBeenCalledWith(
        {
          apiBaseUrl: config.apiBaseUrl,
          organizationId: mockSession.organizationId,
        },
        expect.any(Object), // ApiKeyStamper instance
      );

      // Assert: Check that getWalletAddresses was called with the wallet ID
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith(mockSession.walletId);

      // Assert: Check that only configured address types are returned (filtered)
      expect(result).toEqual({
        walletId: mockSession.walletId,
        addresses: [
          {
            addressType: AddressType.solana,
            address: "So11111111111111111111111111111111111111112",
          },
          {
            addressType: AddressType.ethereum,
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
          },
          // Bitcoin address should be filtered out since it's not in config.addressTypes
        ],
      });

      // Assert: Check that provider internal state is updated
      expect(provider.isConnected()).toBe(true);
      expect(provider.getAddresses()).toEqual(result.addresses);
    });

    it("should filter addresses correctly when only one address type is configured", async () => {
      // Arrange: Create provider with only Solana addresses
      const solanOnlyConfig = {
        ...config,
        addressTypes: [AddressType.solana],
      };
      const solanaOnlyProvider = new EmbeddedProvider(solanOnlyConfig);

      mockStorage.getSession.mockResolvedValue(mockSession);
      mockClient.getWalletAddresses.mockResolvedValue(mockWalletAddresses);

      // Act
      const result = await solanaOnlyProvider.connect();

      // Assert: Only Solana addresses should be returned
      expect(result.addresses).toEqual([
        {
          addressType: AddressType.solana,
          address: "So11111111111111111111111111111111111111112",
        },
      ]);
    });

    it("should handle empty address list from client", async () => {
      // Arrange
      mockStorage.getSession.mockResolvedValue(mockSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      // Act
      const result = await provider.connect();

      // Assert
      expect(result).toEqual({
        walletId: mockSession.walletId,
        addresses: [],
      });
    });
  });
});
