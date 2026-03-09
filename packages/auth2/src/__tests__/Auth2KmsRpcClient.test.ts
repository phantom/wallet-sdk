const mockBase64urlEncode = jest.fn((data: Uint8Array) => Buffer.from(data).toString("base64url"));
jest.mock("@phantom/base64url", () => ({
  base64urlEncode: mockBase64urlEncode,
}));

const mockPostKmsRpc = jest.fn();
jest.mock("@phantom/openapi-wallet-service", () => ({
  Configuration: jest.fn().mockImplementation((cfg: unknown) => cfg),
  KMSRPCApi: jest.fn().mockImplementation(() => ({ postKmsRpc: mockPostKmsRpc })),
  GetOrCreatePhantomOrganizationMethodEnum: {
    getOrCreatePhantomOrganization: "getOrCreatePhantomOrganization",
  },
  GetOrganizationWalletsMethodEnum: { getOrganizationWallets: "getOrganizationWallets" },
  CreateWalletMethodEnum: { createWallet: "createWallet" },
}));

let capturedRequestInterceptor: ((config: Record<string, unknown>) => Promise<Record<string, unknown>>) | null = null;
jest.mock("axios", () => ({
  create: jest.fn(),
}));

import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import axios from "axios";
import { KMSRPCApi } from "@phantom/openapi-wallet-service";
import { Auth2KmsRpcClient } from "../index";

function makeStamper(
  overrides: Partial<{
    stamp: jest.Mock;
    getKeyInfo: jest.Mock;
    init: jest.Mock;
  }> = {},
) {
  return {
    stamp: jest.fn().mockResolvedValue("mock-stamp"),
    getKeyInfo: jest.fn().mockReturnValue({
      keyId: "key-id-1",
      publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
      createdAt: Date.now(),
    }),
    init: jest.fn().mockResolvedValue({
      keyId: "key-id-1",
      publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
      createdAt: Date.now(),
    }),
    rotateKeyPair: jest.fn(),
    commitRotation: jest.fn(),
    rollbackRotation: jest.fn(),
    resetKeyPair: jest.fn(),
    clear: jest.fn(),
    algorithm: "ECDSA_P256",
    type: "OIDC" as const,
    ...overrides,
  };
}

describe("Auth2KmsRpcClient", () => {
  const kmsOptions = { apiBaseUrl: "https://kms.example.com", appId: "app-123" };
  const bearerToken = "Bearer id-token";
  const authUserId = "user-id";

  function makeAxiosFake() {
    return {
      interceptors: {
        request: {
          use: jest.fn((fn: (config: Record<string, unknown>) => Promise<Record<string, unknown>>) => {
            capturedRequestInterceptor = fn;
          }),
        },
      },
    };
  }

  function makeClient(stamperOverrides = {}) {
    capturedRequestInterceptor = null;
    (axios.create as jest.Mock).mockReturnValueOnce(makeAxiosFake());
    return new Auth2KmsRpcClient(makeStamper(stamperOverrides) as unknown as StamperWithKeyManagement, kmsOptions);
  }

  beforeEach(() => {
    mockPostKmsRpc.mockReset();
    (axios.create as jest.Mock).mockReturnValue(makeAxiosFake());
    (KMSRPCApi as jest.Mock).mockImplementation(() => ({ postKmsRpc: mockPostKmsRpc }));
  });

  describe("axios request interceptor", () => {
    it("sets x-app-id, x-api-version, and x-phantom-stamp headers", async () => {
      const stamper = makeStamper();
      makeClient(stamper);

      expect(capturedRequestInterceptor).not.toBeNull();

      const config = { data: '{"method":"test"}', headers: {} as Record<string, string> };
      const result = await capturedRequestInterceptor!(config);

      const headers = result["headers"] as Record<string, string>;
      expect(headers["x-app-id"]).toBe("app-123");
      expect(headers["x-api-version"]).toBe("2025-11-24");
      expect(headers["x-phantom-stamp"]).toBe("mock-stamp");
      expect(stamper.stamp).toHaveBeenCalledWith(expect.objectContaining({ data: expect.anything() }));
    });

    it("stamps an empty string body when config.data is undefined", async () => {
      const stamper = makeStamper();
      makeClient(stamper);
      const config = { headers: {} as Record<string, string> };
      await capturedRequestInterceptor!(config);
      expect(stamper.stamp).toHaveBeenCalledWith(expect.objectContaining({ data: expect.anything() }));
    });
  });

  describe("discoverOrganizationAndWalletId", () => {
    /** Sets up the two happy-path RPC responses (org lookup + wallet list). */
    function mockOrgAndWallet(orgId = "org-abc", walletId = "wallet-1") {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: orgId } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [{ walletId }] } } });
    }

    it("returns organizationId and walletId when both are found", async () => {
      mockOrgAndWallet();
      const client = makeClient();

      expect(await client.discoverOrganizationAndWalletId(bearerToken)).toEqual({
        organizationId: "org-abc",
        walletId: "wallet-1",
      });
    });

    it("accepts snake_case organization_id from the org response", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organization_id: "org-snake" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [{ walletId: "w1" }] } } });
      const client = makeClient();

      const result = await client.discoverOrganizationAndWalletId(bearerToken);

      expect(result?.organizationId).toBe("org-snake");
    });

    it("throws before any RPC call when stamper has no keyInfo", async () => {
      const client = makeClient({ getKeyInfo: jest.fn().mockReturnValue(null) });

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow("Stamper not initialized");
      expect(mockPostKmsRpc).not.toHaveBeenCalled();
    });

    it("passes authorization and x-auth-user-id headers to postKmsRpc", async () => {
      mockOrgAndWallet();
      const client = makeClient();

      await client.discoverOrganizationAndWalletId(bearerToken, authUserId);

      const callHeaders = (mockPostKmsRpc.mock.calls[0] as [unknown, { headers: Record<string, string> }])[1].headers;
      expect(callHeaders["authorization"]).toBe(bearerToken);
      expect(callHeaders["x-auth-user-id"]).toBe(authUserId);
    });

    it("omits x-auth-user-id header when authUserId is not provided", async () => {
      mockOrgAndWallet();
      const client = makeClient();

      await client.discoverOrganizationAndWalletId(bearerToken);

      const callHeaders = (mockPostKmsRpc.mock.calls[0] as [unknown, { headers: Record<string, string> }])[1].headers;
      expect(callHeaders["x-auth-user-id"]).toBeUndefined();
    });

    it("encodes the stamper public key as base64url in getOrCreate params", async () => {
      mockOrgAndWallet();
      mockBase64urlEncode.mockReturnValueOnce("base64url-pubkey");
      const client = makeClient();

      await client.discoverOrganizationAndWalletId(bearerToken);

      const getOrCreateRequest = mockPostKmsRpc.mock.calls[0][0] as { params: { publicKey: string } };
      expect(getOrCreateRequest.params.publicKey).toBe("base64url-pubkey");
    });

    it("throws when getOrCreate returns no organizationId", async () => {
      mockPostKmsRpc.mockResolvedValueOnce({ data: { result: {} } });
      const client = makeClient();

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow(
        "Unable to resolve organizationId",
      );
    });

    it("throws on KMS-level RPC error during org lookup (HTTP 200 with error body)", async () => {
      mockPostKmsRpc.mockResolvedValueOnce({ data: { error: { code: -32000, message: "Unauthorized" } } });
      const client = makeClient();

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow("KMS RPC error");
    });

    it("returns the first wallet's walletId when wallets exist", async () => {
      mockPostKmsRpc.mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } }).mockResolvedValueOnce({
        data: { result: { wallets: [{ walletId: "wallet-existing" }, { walletId: "wallet-other" }] } },
      });
      const client = makeClient();

      const result = await client.discoverOrganizationAndWalletId(bearerToken);

      expect(result?.walletId).toBe("wallet-existing");
      expect(mockPostKmsRpc).toHaveBeenCalledTimes(2);
    });

    it("creates a wallet when none exist and returns the new walletId", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [] } } })
        .mockResolvedValueOnce({ data: { result: { walletId: "wallet-new" } } });

      const client = makeClient();

      const result = await client.discoverOrganizationAndWalletId(bearerToken);

      expect(result?.walletId).toBe("wallet-new");
      expect(mockPostKmsRpc).toHaveBeenCalledTimes(3);
    });

    it("creates a wallet with 4 accounts covering Sol, Eth, BTC, and Sui", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [] } } })
        .mockResolvedValueOnce({ data: { result: { walletId: "w1" } } });

      const client = makeClient();

      await client.discoverOrganizationAndWalletId(bearerToken);

      const createRequest = mockPostKmsRpc.mock.calls[2][0] as {
        params: { accounts: Array<{ addressFormat: string }> };
      };
      const formats = createRequest.params.accounts.map(a => a.addressFormat);
      expect(formats).toEqual(expect.arrayContaining(["Solana", "Ethereum", "BitcoinSegwit", "Sui"]));
      expect(createRequest.params.accounts).toHaveLength(4);
    });

    it("accepts snake_case wallet_id in the list response", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [{ wallet_id: "wallet-snake" }] } } });
      const client = makeClient();

      const result = await client.discoverOrganizationAndWalletId(bearerToken);

      expect(result?.walletId).toBe("wallet-snake");
    });

    it("throws when createWallet returns no walletId", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [] } } })
        .mockResolvedValueOnce({ data: { result: {} } });
      const client = makeClient();

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow("Unable to resolve walletId");
    });

    it("passes organizationId and pagination params to the wallet list call", async () => {
      mockOrgAndWallet("org-abc", "w");
      const client = makeClient();

      await client.discoverOrganizationAndWalletId(bearerToken, authUserId);

      const listRequest = mockPostKmsRpc.mock.calls[1][0] as {
        params: { organizationId: string; limit: number; offset: number };
      };
      expect(listRequest.params.organizationId).toBe("org-abc");
      expect(listRequest.params.limit).toBe(20);
      expect(listRequest.params.offset).toBe(0);
    });

    it("throws on KMS-level RPC error during wallet list", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { error: { code: -32001, message: "Forbidden" } } });
      const client = makeClient();

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow("KMS RPC error");
    });

    it("throws on KMS-level RPC error during wallet creation", async () => {
      mockPostKmsRpc
        .mockResolvedValueOnce({ data: { result: { organizationId: "org-abc" } } })
        .mockResolvedValueOnce({ data: { result: { wallets: [] } } })
        .mockResolvedValueOnce({ data: { error: { code: -32002, message: "Create failed" } } });
      const client = makeClient();

      await expect(client.discoverOrganizationAndWalletId(bearerToken)).rejects.toThrow("KMS RPC error");
    });
  });
});
