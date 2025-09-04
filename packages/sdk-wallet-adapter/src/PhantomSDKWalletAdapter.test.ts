import { PhantomSDKWalletAdapter, PhantomSDKWalletName } from "./PhantomSDKWalletAdapter";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";

// Mock the BrowserSDK
jest.mock("@phantom/browser-sdk", () => ({
  BrowserSDK: jest.fn().mockImplementation(() => ({
    isConnected: jest.fn().mockReturnValue(false),
    getAddresses: jest.fn().mockReturnValue([]),
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    autoConnect: jest.fn(),
    solana: {
      signMessage: jest.fn(),
      signTransaction: jest.fn(),
      signAndSendTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
    },
  })),
  AddressType: {
    Solana: "solana",
    Ethereum: "ethereum",
    Bitcoin: "bitcoin",
  },
}));

describe("PhantomSDKWalletAdapter", () => {
  let adapter: PhantomSDKWalletAdapter;

  beforeEach(() => {
    adapter = new PhantomSDKWalletAdapter({
      appId: "test-app-id",
      embeddedWalletType: "app-wallet",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct properties", () => {
      expect(adapter.name).toBe(PhantomSDKWalletName);
      expect(adapter.url).toBe("https://phantom.app");
      expect(adapter.icon).toContain("data:image/svg+xml");
      expect(adapter.supportedTransactionVersions).toEqual(new Set(["legacy", 0]));
    });

    it("should initialize with Installed ready state", () => {
      expect(adapter.readyState).toBe(WalletReadyState.Installed);
    });

    it("should start with null public key", () => {
      expect(adapter.publicKey).toBeNull();
    });

    it("should start disconnected", () => {
      expect(adapter.connected).toBe(false);
      expect(adapter.connecting).toBe(false);
    });
  });

  describe("connect", () => {
    it("should attempt auto-connect first", async () => {
      const mockAutoConnect = jest.fn().mockResolvedValue(undefined);
      const mockConnect = jest.fn().mockResolvedValue({
        status: "success",
        addresses: [
          {
            type: "solana",
            address: "11111111111111111111111111111111",
          },
        ],
      });

      (adapter as any)._sdk = {
        autoConnect: mockAutoConnect,
        connect: mockConnect,
        isConnected: jest.fn().mockReturnValue(false),
        getAddresses: jest.fn().mockReturnValue([]),
        on: jest.fn(),
        off: jest.fn(),
      };

      await adapter.connect();

      expect(mockAutoConnect).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
    });

    it("should set public key on successful connection", async () => {
      const testAddress = "11111111111111111111111111111111";
      const mockConnect = jest.fn().mockResolvedValue({
        status: "success",
        addresses: [
          {
            type: "solana",
            address: testAddress,
          },
        ],
      });

      (adapter as any)._sdk = {
        autoConnect: jest.fn().mockRejectedValue(new Error("No session")),
        connect: mockConnect,
        isConnected: jest.fn().mockReturnValue(true),
        getAddresses: jest.fn().mockReturnValue([]),
        on: jest.fn(),
        off: jest.fn(),
      };

      await adapter.connect();

      expect(adapter.publicKey).toBeInstanceOf(PublicKey);
      expect(adapter.publicKey?.toString()).toBe(testAddress);
    });

    it("should emit connect event on successful connection", async () => {
      const testAddress = "11111111111111111111111111111111";
      const mockConnect = jest.fn().mockResolvedValue({
        status: "success",
        addresses: [
          {
            type: "solana",
            address: testAddress,
          },
        ],
      });

      (adapter as any)._sdk = {
        autoConnect: jest.fn().mockRejectedValue(new Error("No session")),
        connect: mockConnect,
        isConnected: jest.fn().mockReturnValue(true),
        getAddresses: jest.fn().mockReturnValue([]),
        on: jest.fn(),
        off: jest.fn(),
      };

      const connectHandler = jest.fn();
      adapter.on("connect", connectHandler);

      await adapter.connect();

      expect(connectHandler).toHaveBeenCalledWith(expect.any(PublicKey));
    });

    it("should throw error if connection fails", async () => {
      const mockConnect = jest.fn().mockResolvedValue({
        status: "error",
        error: "Connection failed",
      });

      (adapter as any)._sdk = {
        autoConnect: jest.fn().mockRejectedValue(new Error("No session")),
        connect: mockConnect,
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      await expect(adapter.connect()).rejects.toThrow("Failed to connect to wallet");
    });
  });

  describe("disconnect", () => {
    it("should call SDK disconnect", async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      (adapter as any)._sdk = {
        disconnect: mockDisconnect,
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      await adapter.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should clear public key on disconnect", async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      (adapter as any)._publicKey = new PublicKey("11111111111111111111111111111111");
      (adapter as any)._sdk = {
        disconnect: mockDisconnect,
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      await adapter.disconnect();

      expect(adapter.publicKey).toBeNull();
    });

    it("should emit disconnect event", async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      (adapter as any)._sdk = {
        disconnect: mockDisconnect,
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      const disconnectHandler = jest.fn();
      adapter.on("disconnect", disconnectHandler);

      await adapter.disconnect();

      expect(disconnectHandler).toHaveBeenCalled();
    });
  });

  describe("signMessage", () => {
    it("should sign message through SDK", async () => {
      const message = new Uint8Array([1, 2, 3, 4]);
      const signature = new Uint8Array([5, 6, 7, 8]);
      
      const mockSignMessage = jest.fn().mockResolvedValue({
        signature,
        publicKey: "11111111111111111111111111111111",
      });

      (adapter as any)._sdk = {
        isConnected: jest.fn().mockReturnValue(true),
        solana: {
          signMessage: mockSignMessage,
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const result = await adapter.signMessage(message);

      expect(mockSignMessage).toHaveBeenCalledWith(message);
      expect(result).toBe(signature);
    });

    it("should throw error if not connected", async () => {
      (adapter as any)._sdk = {
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      const message = new Uint8Array([1, 2, 3, 4]);
      await expect(adapter.signMessage(message)).rejects.toThrow("not connected");
    });
  });

  describe("autoConnect", () => {
    it("should attempt to auto-connect through SDK", async () => {
      const mockAutoConnect = jest.fn().mockResolvedValue(undefined);
      const mockIsConnected = jest.fn().mockReturnValue(true);
      const mockGetAddresses = jest.fn().mockReturnValue([
        {
          type: "solana",
          address: "11111111111111111111111111111111",
        },
      ]);

      (adapter as any)._sdk = {
        autoConnect: mockAutoConnect,
        isConnected: mockIsConnected,
        getAddresses: mockGetAddresses,
        on: jest.fn(),
        off: jest.fn(),
      };

      await adapter.autoConnect();

      expect(mockAutoConnect).toHaveBeenCalled();
      expect(adapter.publicKey?.toString()).toBe("11111111111111111111111111111111");
    });

    it("should not throw if auto-connect fails", async () => {
      const mockAutoConnect = jest.fn().mockRejectedValue(new Error("No session"));

      (adapter as any)._sdk = {
        autoConnect: mockAutoConnect,
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      await expect(adapter.autoConnect()).resolves.toBeUndefined();
    });
  });
});
