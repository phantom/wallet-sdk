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
        authenticators: [{ publicKey: "default-test-public-key" }],
        policy: {
          type: "CEL",
          cel: {
            preset: "DAPP_CONNECTION_USER",
            walletId,
            usdLimit: {
              usdCentsLimitPerDay: 1000, // $10.00 per day
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
        authenticators: [{ publicKey: "admin-public-key" }],
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
      usdCentsLimitPerDay: 1000, // $10.00 per day
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
        "org-123",
        "wallet-123",
        solanaSubmissionConfig,
        "UserAccount123",
      );

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        {
          transaction: { solana: "original-tx-base64" },
          organizationId: "org-123",
          walletId: "wallet-123",
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

      await expect(
        augmentMethod("bad-tx", "org-123", "wallet-123", solanaSubmissionConfig, "UserAccount123"),
      ).rejects.toThrow("Failed to augment transaction");
    });
  });

  describe("conditions for calling augment endpoint", () => {
    const performSigning = (params: any, includeSubmissionConfig: boolean) => {
      return client["performTransactionSigning"](params, includeSubmissionConfig);
    };

    it("should call augment but proceed without limits when no spending limits found", async () => {
      // Mock augment endpoint to reject with "No spending limit configuration found"
      mockAxiosPost.mockRejectedValueOnce({
        message: "Failed to augment transaction: No spending limit configuration found for wallet wallet-123",
      });

      mockKmsPost.mockResolvedValue({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      await performSigning(
        {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        true,
      );

      // Augment should be called but error is caught and we proceed
      expect(mockAxiosPost).toHaveBeenCalled();
      expect(mockKmsPost).toHaveBeenCalled();
    });

    describe.each([
      {
        testName: "includeSubmissionConfig is false",
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
        params: { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET },
        includeSubmissionConfig: true,
      },
      {
        testName: "transaction is EVM (not Solana)",
        params: {
          walletId: "wallet-123",
          transaction: "0x1234",
          networkId: NetworkId.ETHEREUM_MAINNET,
          account: "0xUser",
        },
        includeSubmissionConfig: true,
      },
    ])("should NOT call augment when $testName", ({ params, includeSubmissionConfig }) => {
      it(`${params.networkId}`, async () => {
        mockKmsPost.mockResolvedValue({
          data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
        });

        await performSigning(params, includeSubmissionConfig);

        expect(mockAxiosPost).not.toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should fail when augmentation service fails with non-spending-limit error", async () => {
      // Mock augment endpoint to fail with a real error (not "No spending limit configuration found")
      mockAxiosPost.mockRejectedValueOnce(new Error("Augmentation service unavailable"));

      const performSigning = client["performTransactionSigning"].bind(client);

      await expect(
        performSigning(
          { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
          true,
        ),
      ).rejects.toThrow("Failed to apply spending limits for this transaction");
    });

    it("should continue signing when augment endpoint returns no spending limits", async () => {
      // Mock augment endpoint to return "No spending limit configuration found"
      mockAxiosPost.mockRejectedValueOnce({
        message:
          "Failed to augment transaction: No spending limit configuration found for wallet wallet-123 in organization org-123",
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
        true,
      );

      // Should proceed with original transaction when no spending limits found
      expect(result.signedTransaction).toBe("signed-tx");
    });

    it("should not call augment endpoint for EVM transactions", async () => {
      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        { walletId: "wallet-123", transaction: "0x1234", networkId: NetworkId.ETHEREUM_MAINNET, account: "0xUser" },
        true,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("should not call augment endpoint when includeSubmissionConfig is false", async () => {
      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET },
        false,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  describe("uses augmented transaction for signing", () => {
    it("should use augmented transaction returned from augment endpoint", async () => {
      const submissionConfig = {
        chain: "solana" as const,
        network: "mainnet",
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          transaction: "augmented-tx-with-lighthouse-instructions",
          simulationResult: {},
          memoryConfigUsed: {
            usdCentsLimitPerDay: 1000,
            memoryAccount: "MemAcc123",
            memoryId: 0,
            memoryBump: 255,
          },
        },
      });

      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);
      const result = await augmentMethod("original-tx", "org-123", "wallet-123", submissionConfig, "UserAccount123");

      expect(result.transaction).toBe("augmented-tx-with-lighthouse-instructions");
    });

    it("should include spending limit config in sign request when augment returns config", async () => {
      // Mock augment endpoint to return spending limit config
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          transaction: "augmented-tx",
          simulationResult: {},
          memoryConfigUsed: {
            usdCentsLimitPerDay: 1000,
            memoryAccount: "MemAcc123",
            memoryId: 0,
            memoryBump: 255,
          },
        },
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
        true,
      );

      // Should include the spending limit config returned from augment endpoint
      expect(mockKmsPost).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            spendingLimitConfig: {
              usdCentsLimitPerDay: 1000,
              memoryAccount: "MemAcc123",
              memoryId: 0,
              memoryBump: 255,
            },
          }),
        }),
      );
    });

    it("should NOT include spending limit config when augment fails with no limits found", async () => {
      // Mock augment endpoint to fail with "No spending limit configuration found"
      mockAxiosPost.mockRejectedValueOnce({
        message: "Failed to augment transaction: No spending limit configuration found for wallet wallet-123",
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      await performSigning(
        { walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET, account: "UserAccount123" },
        true,
      );

      // Should not include spending limit config when no limits found
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
      usdCentsLimitPerDay: 1000, // $10.00 per day
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
        "org-123",
        "wallet-123",
        { chain: "solana", network: "mainnet" },
        "UserAccount123",
      );

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        expect.objectContaining({
          transaction: { solana: "solana-tx-base64" },
          organizationId: "org-123",
          walletId: "wallet-123",
        }),
        expect.any(Object),
      );
    });

    it("should reject EVM transactions with clear error", async () => {
      const augmentMethod = client["augmentWithSpendingLimit"].bind(client);

      await expect(
        augmentMethod("evm-tx", "org-123", "wallet-123", { chain: "ethereum", network: "mainnet" }, "0xUserAccount"),
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
      await augmentMethod("tx-base64", "org-123", "wallet-123", submissionConfig, "UserAccount123");

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/augment/spending-limit",
        {
          transaction: { solana: "tx-base64" },
          organizationId: "org-123",
          walletId: "wallet-123",
          submissionConfig,
          simulationConfig: { account: "UserAccount123" },
        },
        { headers: { "Content-Type": "application/json" } },
      );
    });
  });
});
