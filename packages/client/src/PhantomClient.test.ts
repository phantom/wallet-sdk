import { PhantomClient } from "./PhantomClient";
import type { UserConfig, CreateAuthenticatorParams, AuthenticatorConfig } from "./types";
import { NetworkId } from "@phantom/constants";
import axios from "axios";

// Mock axios to prevent actual HTTP requests
jest.mock("axios");

describe("PhantomClient Name Length Validation", () => {
  let client: PhantomClient;

  beforeEach(() => {
    client = new PhantomClient({
      apiBaseUrl: "https://api.phantom.app",
      organizationId: "test-org-id",
      headers: {},
    });
  });

  describe("createOrganization", () => {
    const validUserConfig: UserConfig = {
      username: "validuser",
      role: "ADMIN",
      authenticators: [
        {
          authenticatorName: "validauth",
          authenticatorKind: "keypair",
          publicKey: "test-public-key",
          algorithm: "Ed25519",
        } as AuthenticatorConfig,
      ],
    };

    describe("organization name validation", () => {
      it("should throw error for organization name exceeding 64 characters", async () => {
        const longOrgName = "a".repeat(65); // 65 characters

        await expect(client.createOrganization(longOrgName, [validUserConfig])).rejects.toThrow(
          "Organization name cannot exceed 64 characters. Current length: 65",
        );
      });

      it("should accept organization name with exactly 64 characters", async () => {
        const exactLengthOrgName = "a".repeat(64); // 64 characters

        // Mock the API call to avoid actual HTTP request
        const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } },
        });

        await expect(client.createOrganization(exactLengthOrgName, [validUserConfig])).resolves.toBeDefined();

        expect(mockPost).toHaveBeenCalled();
      });

      it("should accept organization name under 64 characters", async () => {
        const shortOrgName = "short-org-name"; // < 64 characters

        const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } },
        });

        await expect(client.createOrganization(shortOrgName, [validUserConfig])).resolves.toBeDefined();

        expect(mockPost).toHaveBeenCalled();
      });
    });

    describe("username validation", () => {
      it("should throw error for username exceeding 64 characters", async () => {
        const longUsername = "a".repeat(65); // 65 characters
        const userConfigWithLongName: UserConfig = {
          ...validUserConfig,
          username: longUsername,
        };

        await expect(client.createOrganization("valid-org", [userConfigWithLongName])).rejects.toThrow(
          "Username name cannot exceed 64 characters. Current length: 65",
        );
      });

      it("should accept username with exactly 64 characters", async () => {
        const exactLengthUsername = "a".repeat(64); // 64 characters
        const userConfigWithExactName: UserConfig = {
          ...validUserConfig,
          username: exactLengthUsername,
        };

        const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } },
        });

        await expect(client.createOrganization("valid-org", [userConfigWithExactName])).resolves.toBeDefined();

        expect(mockPost).toHaveBeenCalled();
      });
    });

    describe("authenticator name validation", () => {
      it("should throw error for authenticator name exceeding 64 characters", async () => {
        const longAuthName = "a".repeat(65); // 65 characters
        const userConfigWithLongAuth: UserConfig = {
          ...validUserConfig,
          authenticators: [
            {
              authenticatorName: longAuthName,
              authenticatorKind: "keypair",
              publicKey: "test-public-key",
              algorithm: "Ed25519",
            } as AuthenticatorConfig,
          ],
        };

        await expect(client.createOrganization("valid-org", [userConfigWithLongAuth])).rejects.toThrow(
          "Authenticator name cannot exceed 64 characters. Current length: 65",
        );
      });

      it("should accept authenticator name with exactly 64 characters", async () => {
        const exactLengthAuthName = "a".repeat(64); // 64 characters
        const userConfigWithExactAuth: UserConfig = {
          ...validUserConfig,
          authenticators: [
            {
              authenticatorName: exactLengthAuthName,
              authenticatorKind: "keypair",
              publicKey: "test-public-key",
              algorithm: "Ed25519",
            } as AuthenticatorConfig,
          ],
        };

        const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } },
        });

        await expect(client.createOrganization("valid-org", [userConfigWithExactAuth])).resolves.toBeDefined();

        expect(mockPost).toHaveBeenCalled();
      });
    });
  });

  describe("createAuthenticator", () => {
    const validAuthParams: CreateAuthenticatorParams = {
      organizationId: "test-org-id",
      username: "validuser",
      authenticatorName: "validauth",
      authenticator: {
        authenticatorName: "validauth",
        authenticatorKind: "keypair",
        publicKey: "test-public-key",
        algorithm: "Ed25519",
      } as AuthenticatorConfig,
    };

    it("should throw error for username exceeding 64 characters", async () => {
      const longUsername = "a".repeat(65); // 65 characters
      const paramsWithLongUsername = {
        ...validAuthParams,
        username: longUsername,
      };

      await expect(client.createAuthenticator(paramsWithLongUsername)).rejects.toThrow(
        "Username name cannot exceed 64 characters. Current length: 65",
      );
    });

    it("should throw error for authenticatorName exceeding 64 characters", async () => {
      const longAuthName = "a".repeat(65); // 65 characters
      const paramsWithLongAuthName = {
        ...validAuthParams,
        authenticatorName: longAuthName,
      };

      await expect(client.createAuthenticator(paramsWithLongAuthName)).rejects.toThrow(
        "Authenticator name cannot exceed 64 characters. Current length: 65",
      );
    });

    it("should throw error for authenticator.authenticatorName exceeding 64 characters", async () => {
      const longAuthName = "a".repeat(65); // 65 characters
      const paramsWithLongNestedAuthName = {
        ...validAuthParams,
        authenticator: {
          ...validAuthParams.authenticator,
          authenticatorName: longAuthName,
        },
      };

      await expect(client.createAuthenticator(paramsWithLongNestedAuthName)).rejects.toThrow(
        "Authenticator name cannot exceed 64 characters. Current length: 65",
      );
    });

    it("should accept all names with exactly 64 characters", async () => {
      const exactLengthName = "a".repeat(64); // 64 characters
      const paramsWithExactLengthNames = {
        ...validAuthParams,
        username: exactLengthName,
        authenticatorName: exactLengthName,
        authenticator: {
          ...validAuthParams.authenticator,
          authenticatorName: exactLengthName,
        },
      };

      const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
        data: { result: { authenticatorId: "test-auth-id" } },
      });

      await expect(client.createAuthenticator(paramsWithExactLengthNames)).resolves.toBeDefined();

      expect(mockPost).toHaveBeenCalled();
    });

    it("should accept all names under 64 characters", async () => {
      const shortName = "short-name"; // < 64 characters
      const paramsWithShortNames = {
        ...validAuthParams,
        username: shortName,
        authenticatorName: shortName,
        authenticator: {
          ...validAuthParams.authenticator,
          authenticatorName: shortName,
        },
      };

      const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
        data: { result: { authenticatorId: "test-auth-id" } },
      });

      await expect(client.createAuthenticator(paramsWithShortNames)).resolves.toBeDefined();

      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings gracefully", async () => {
      const mockPost = jest.spyOn((client as any).kmsApi, "postKmsRpc").mockResolvedValue({
        data: { result: { organizationId: "test-org-id" } },
      });

      const userConfigWithEmptyAuth: UserConfig = {
        username: "validuser",
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: "", // Empty string
            authenticatorKind: "keypair",
            publicKey: "test-public-key",
            algorithm: "Ed25519",
          } as AuthenticatorConfig,
        ],
      };

      // Empty strings should pass length validation (they're under 64 chars)
      await expect(client.createOrganization("valid-org", [userConfigWithEmptyAuth])).resolves.toBeDefined();

      expect(mockPost).toHaveBeenCalled();
    });

    it("should validate multiple users and authenticators", async () => {
      const longUsername = "a".repeat(65); // 65 characters
      const validUser: UserConfig = {
        username: "validuser",
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: "validauth",
            authenticatorKind: "keypair",
            publicKey: "test-public-key",
            algorithm: "Ed25519",
          } as AuthenticatorConfig,
        ],
      };

      const invalidUser: UserConfig = {
        username: longUsername, // This should cause the error
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: "validauth",
            authenticatorKind: "keypair",
            publicKey: "test-public-key",
            algorithm: "Ed25519",
          } as AuthenticatorConfig,
        ],
      };

      await expect(client.createOrganization("valid-org", [validUser, invalidUser])).rejects.toThrow(
        "Username name cannot exceed 64 characters. Current length: 65",
      );
    });
  });
});

describe("PhantomClient Spending Limits Integration", () => {
  let client: PhantomClient;
  let mockAxiosPost: jest.Mock;
  let mockKmsPost: jest.Mock;
  let mockGetOrganization: jest.Mock;

  // Helper to create org data with spending limits
  const createOrgDataWithSpendingLimits = (walletId: string) => ({
    users: [
      {
        username: "spending-limit-user",
        policy: {
          type: "CEL",
          cel: {
            preset: "DAPP_CONNECTION_USER",
            walletId,
            usdLimit: {
              memoryAccount: "MemAcc123",
              memoryId: 0,
              memoryBump: 255,
            },
          },
        },
      },
    ],
  });

  // Helper for org data without spending limits
  const createOrgDataWithoutLimits = () => ({
    users: [
      {
        username: "admin-user",
        policy: { type: "ADMIN" },
      },
    ],
  });

  beforeEach(() => {
    mockAxiosPost = jest.fn();
    const mockAxiosInstance = {
      post: mockAxiosPost,
      interceptors: {
        request: { use: jest.fn() },
      },
    };

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    client = new PhantomClient({
      apiBaseUrl: "https://api.phantom.app",
      organizationId: "test-org-id",
      headers: {},
    });

    mockKmsPost = jest.fn();
    mockGetOrganization = jest.fn();

    // Override private methods for testing
    Object.defineProperty(client, "kmsApi", {
      value: { postKmsRpc: mockKmsPost },
      writable: true,
    });
    Object.defineProperty(client, "getOrganization", {
      value: mockGetOrganization,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("augmentWithSpendingLimit method", () => {
    const spendingConfig = {
      memoryAccount: "MemAcc123",
      memoryId: 0,
      memoryBump: 255,
    };

    const solanaSubmissionConfig = {
      chain: "solana" as const,
      network: "mainnet",
    };

    it("should call augment endpoint with correct request structure", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          transaction: "augmented-tx",
          simulationResult: { aggregated: { totalSpendUsd: 1.5 } },
          memoryConfigUsed: spendingConfig,
        },
      });

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);
      const result = await augmentMethod(
        "original-tx-base64",
        spendingConfig,
        solanaSubmissionConfig,
        "UserAccount123",
      );

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        {
          transaction: { Solana: "original-tx-base64" },
          spendingLimitConfig: spendingConfig,
          submissionConfig: solanaSubmissionConfig,
          simulationConfig: { account: "UserAccount123" },
        },
        { headers: { "Content-Type": "application/json" } },
      );
    });

    it("should throw error when augment endpoint fails", async () => {
      mockAxiosPost.mockRejectedValueOnce({
        response: {
          data: {
            message: "Invalid transaction format",
          },
        },
      });

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);

      await expect(augmentMethod("bad-tx", spendingConfig, solanaSubmissionConfig, "UserAccount123")).rejects.toThrow(
        "Failed to augment transaction",
      );
    });
  });

  describe("checkUserSpendingLimit", () => {
    const checkSpendingLimit = (orgData: any, walletId: string) => {
      return client["checkUserSpendingLimit"](orgData, walletId);
    };

    it("should return spending limit config when user has limits", () => {
      const orgData = createOrgDataWithSpendingLimits("wallet-123");
      const result = checkSpendingLimit(orgData, "wallet-123");

      expect(result.hasSpendingLimit).toBe(true);
      if (result.hasSpendingLimit) {
        expect(result.config.memoryAccount).toBe("MemAcc123");
        expect(result.config.memoryId).toBe(0);
        expect(result.config.memoryBump).toBe(255);
      }
    });

    describe.each([
      {
        testName: "no user has spending limits",
        orgData: createOrgDataWithoutLimits(),
        walletId: "wallet-123",
      },
      {
        testName: "wallet ID doesn't match",
        orgData: createOrgDataWithSpendingLimits("wallet-456"),
        walletId: "wallet-123",
      },
      {
        testName: "policy is not CEL type",
        orgData: {
          users: [
            {
              username: "user",
              policy: {
                type: "ADMIN",
                cel: { walletId: "wallet-123", usdLimit: {} },
              },
            },
          ],
        },
        walletId: "wallet-123",
      },
      {
        testName: "preset is not DAPP_CONNECTION_USER",
        orgData: {
          users: [
            {
              username: "user",
              policy: {
                type: "CEL",
                cel: {
                  preset: "OTHER_PRESET",
                  walletId: "wallet-123",
                  usdLimit: {},
                },
              },
            },
          ],
        },
        walletId: "wallet-123",
      },
      {
        testName: "usdLimit is missing",
        orgData: {
          users: [
            {
              username: "user",
              policy: {
                type: "CEL",
                cel: {
                  preset: "DAPP_CONNECTION_USER",
                  walletId: "wallet-123",
                },
              },
            },
          ],
        },
        walletId: "wallet-123",
      },
      {
        testName: "usdLimit is null",
        orgData: {
          users: [
            {
              username: "user",
              policy: {
                type: "CEL",
                cel: {
                  preset: "DAPP_CONNECTION_USER",
                  walletId: "wallet-123",
                  usdLimit: null,
                },
              },
            },
          ],
        },
        walletId: "wallet-123",
      },
      {
        testName: "usdLimit properties are missing",
        orgData: {
          users: [
            {
              username: "user",
              policy: {
                type: "CEL",
                cel: {
                  preset: "DAPP_CONNECTION_USER",
                  walletId: "wallet-123",
                  usdLimit: {
                    memoryAccount: "MemAcc123",
                    // Missing memoryId and memoryBump
                  },
                },
              },
            },
          ],
        },
        walletId: "wallet-123",
      },
    ])("should return hasSpendingLimit false when $testName", ({ orgData, walletId }) => {
      it(`${walletId}`, () => {
        const result = checkSpendingLimit(orgData, walletId);
        expect(result.hasSpendingLimit).toBe(false);
      });
    });
  });

  describe("conditions for calling augment endpoint", () => {
    const performSigning = (params: any, includeSubmissionConfig: boolean) => {
      return client["performTransactionSigning"](params, includeSubmissionConfig);
    };

    describe.each([
      {
        testName: "user has no spending limits",
        orgData: createOrgDataWithoutLimits(),
        params: {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        includeSubmissionConfig: true,
      },
      {
        testName: "includeSubmissionConfig is false",
        orgData: createOrgDataWithSpendingLimits("wallet-123"),
        params: {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        includeSubmissionConfig: false,
      },
      {
        testName: "account parameter is missing",
        orgData: createOrgDataWithSpendingLimits("wallet-123"),
        params: { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET },
        includeSubmissionConfig: true,
      },
      {
        testName: "transaction is EVM (not Solana)",
        orgData: createOrgDataWithSpendingLimits("wallet-123"),
        params: {
          walletId: "wallet-123",
          transaction: "0x1234",
          networkId: NetworkId.ETHEREUM_MAINNET,
          account: "0xUser",
        },
        includeSubmissionConfig: true,
      },
    ])("should NOT call augment when $testName", ({ orgData, params, includeSubmissionConfig }) => {
      it(`${params.networkId}`, async () => {
        mockGetOrganization.mockResolvedValue(orgData);
        mockKmsPost.mockResolvedValue({
          data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
        });

        await performSigning(params, includeSubmissionConfig);

        expect(mockAxiosPost).not.toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should fail when augmentation fails for user with spending limits", async () => {
      mockGetOrganization.mockResolvedValue(createOrgDataWithSpendingLimits("wallet-123"));

      mockAxiosPost.mockRejectedValueOnce(new Error("Augmentation service unavailable"));

      const performSigning = client["performTransactionSigning"].bind(client);

      await expect(
        performSigning(
          { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
          true,
        ),
      ).rejects.toThrow("Failed to apply spending limits for this transaction");
    });

    it("should fail when getOrganization fails for Solana transaction", async () => {
      mockGetOrganization.mockRejectedValue(new Error("API connection timeout"));

      const performSigning = client["performTransactionSigning"].bind(client);

      await expect(
        performSigning(
          { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
          true,
        ),
      ).rejects.toThrow("Failed to fetch organization data for spending limit validation");
    });

    it("should continue signing when getOrganization fails for EVM transaction", async () => {
      mockGetOrganization.mockRejectedValue(new Error("Failed to fetch organization"));

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        { walletId: "wallet-123", transaction: "0x1234", networkId: NetworkId.ETHEREUM_MAINNET, account: "0xUser" },
        true,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      expect(mockGetOrganization).not.toHaveBeenCalled();
    });

    it("should continue signing when includeSubmissionConfig is false (no org fetch needed)", async () => {
      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET },
        false,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      expect(mockGetOrganization).not.toHaveBeenCalled();
    });
  });

  describe("uses augmented transaction for signing", () => {
    it("should use augmented transaction returned from augment endpoint", async () => {
      const spendingConfig = {
        memoryAccount: "MemAcc123",
        memoryId: 0,
        memoryBump: 255,
      };

      const submissionConfig = {
        chain: "solana" as const,
        network: "mainnet",
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          transaction: "augmented-tx-with-lighthouse-instructions",
          simulationResult: {},
          memoryConfigUsed: {},
        },
      });

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);
      const result = await augmentMethod("original-tx", spendingConfig, submissionConfig, "UserAccount123");

      expect(result.transaction).toBe("augmented-tx-with-lighthouse-instructions");
    });

    it("should include spending limit config in sign request when present", async () => {
      mockGetOrganization.mockResolvedValue(createOrgDataWithSpendingLimits("wallet-123"));

      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "augmented-tx", simulationResult: {}, memoryConfigUsed: {} },
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
        true,
      );

      expect(mockKmsPost).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            spendingLimitConfig: {
              memoryAccount: "MemAcc123",
              memoryId: 0,
              memoryBump: 255,
            },
          }),
        }),
      );
    });

    it("should NOT include spending limit config when user has no limits", async () => {
      mockGetOrganization.mockResolvedValue(createOrgDataWithoutLimits());

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
        true,
      );

      expect(mockKmsPost).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.not.objectContaining({
            spendingLimitConfig: expect.anything(),
          }),
        }),
      );
    });
  });

  describe("augment endpoint request structure", () => {
    const spendingConfig = {
      memoryAccount: "MemAcc123",
      memoryId: 0,
      memoryBump: 255,
    };

    it("should send Solana transactions in ChainTransaction format", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "augmented-tx", simulationResult: {}, memoryConfigUsed: {} },
      });

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);
      const result = await augmentMethod(
        "solana-tx-base64",
        spendingConfig,
        { chain: "solana", network: "mainnet" },
        "UserAccount123",
      );

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        expect.objectContaining({
          transaction: { Solana: "solana-tx-base64" },
        }),
        expect.any(Object),
      );
    });

    it("should reject EVM transactions with clear error", async () => {
      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);

      await expect(
        augmentMethod("evm-tx", spendingConfig, { chain: "ethereum", network: "mainnet" }, "0xUserAccount"),
      ).rejects.toThrow("Spending limits are only supported for Solana transactions");

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("should include all required fields in augment request", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "augmented-tx", simulationResult: {}, memoryConfigUsed: {} },
      });

      const submissionConfig = {
        chain: "solana" as const,
        network: "mainnet",
      };

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);
      await augmentMethod("tx-base64", spendingConfig, submissionConfig, "UserAccount123");

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        {
          transaction: { Solana: "tx-base64" },
          spendingLimitConfig: spendingConfig,
          submissionConfig,
          simulationConfig: { account: "UserAccount123" },
        },
        { headers: { "Content-Type": "application/json" } },
      );
    });
  });
});
