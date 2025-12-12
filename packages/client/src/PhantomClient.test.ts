import { PhantomClient } from "./PhantomClient";
import type { UserConfig, CreateAuthenticatorParams, AuthenticatorConfig } from "./types";
import { NetworkId } from "@phantom/constants";
import { SpendingLimitError, TransactionBlockedError } from "./errors";
import axios, { type AxiosError } from "axios";

// Mock axios to prevent actual HTTP requests
jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  const mockCreate = jest.fn();
  return {
    ...actualAxios,
    default: {
      ...actualAxios.default,
      create: mockCreate,
    },
    create: mockCreate,
    isAxiosError: jest.fn((error: unknown) => {
      // Check if error has response property (AxiosError-like)
      return error !== null && typeof error === "object" && "response" in error;
    }),
  };
});

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

  describe("prepare method", () => {
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

    it("should call prepare endpoint with correct request structure", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          transaction: "augmented-tx",
          simulationResult: { aggregated: { totalSpendUsd: 1.5 } },
          memoryConfigUsed: spendingConfig,
        },
      });

      const prepareMethod = client["prepare"].bind(client);
      const result = await prepareMethod("original-tx-base64", "org-123", solanaSubmissionConfig, "UserAccount123");

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/prepare",
        {
          transaction: "original-tx-base64", // Plain string, not wrapped
          organizationId: "org-123",
          submissionConfig: solanaSubmissionConfig,
          simulationConfig: { account: "UserAccount123" },
        },
        { headers: { "Content-Type": "application/json" } },
      );
    });

    it("should throw error when prepare endpoint fails", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as any).isAxiosError = true;
      axiosError.response = {
        data: {
          type: "invalid-transaction",
          title: "Invalid Transaction",
          detail: "Invalid transaction format",
          requestId: "test-request-id",
        },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as any,
      };
      mockAxiosPost.mockRejectedValueOnce(axiosError);

      const prepareMethod = client["prepare"].bind(client);

      await expect(prepareMethod("bad-tx", "org-123", solanaSubmissionConfig, "UserAccount123")).rejects.toThrow(
        "Invalid transaction format",
      );
    });

    it("should throw SpendingLimitError when spending limit is reached", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as any).isAxiosError = true;
      axiosError.response = {
        data: {
          type: "spending-limit-exceeded",
          title: "This transaction would surpass your configured spending limit",
          detail:
            "Transaction would exceed daily spending limit. Previous: $0.62, Transaction: $0.41, Total: $1.03, Limit: $1.00",
          requestId: "2d8da771-896b-9568-a9b5-22bf89e8d882",
          previousSpendCents: 62,
          transactionSpendCents: 41,
          totalSpendCents: 103,
          limitCents: 100,
        },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as any,
      };
      mockAxiosPost.mockRejectedValueOnce(axiosError);

      const prepareMethod = client["prepare"].bind(client);

      const error = await prepareMethod("tx", "org-123", solanaSubmissionConfig, "UserAccount123").catch(e => e);

      expect(error).toBeInstanceOf(SpendingLimitError);
      expect(error).toMatchObject({
        name: "SpendingLimitError",
        type: "spending-limit-exceeded",
        title: "This transaction would surpass your configured spending limit",
        requestId: "2d8da771-896b-9568-a9b5-22bf89e8d882",
        previousSpendCents: 62,
        transactionSpendCents: 41,
        totalSpendCents: 103,
        limitCents: 100,
      });
    });
  });

  describe("conditions for calling prepare endpoint", () => {
    const performSigning = (params: any, includeSubmissionConfig: boolean) => {
      return client["performTransactionSigning"](params, includeSubmissionConfig);
    };

    it("should call prepare and proceed without limits when service returns pass-through", async () => {
      // Mock prepare endpoint to 200 with same transaction and no memory config
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "tx", simulationResult: {} },
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

      // Prepare should be called and we proceed
      expect(mockAxiosPost).toHaveBeenCalled();
      expect(mockKmsPost).toHaveBeenCalled();
    });

    it("should call prepare even when includeSubmissionConfig is false for Solana", async () => {
      // Mock prepare endpoint to return pass-through
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "tx", simulationResult: {} },
      });

      mockKmsPost.mockResolvedValue({
        data: { result: { transaction: "signed-tx" } },
      });

      await performSigning(
        {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        false, // includeSubmissionConfig = false, but prepare should still be called
      );

      // Prepare should be called even when includeSubmissionConfig is false
      expect(mockAxiosPost).toHaveBeenCalled();
      expect(mockKmsPost).toHaveBeenCalled();
    });

    it("should throw error when account parameter is missing for Solana user-wallet", async () => {
      await expect(
        performSigning({ walletId: "wallet-123", transaction: "tx", networkId: NetworkId.SOLANA_MAINNET }, true),
      ).rejects.toThrow("Account is required to simulate Solana transactions with spending limits");

      // Prepare should not be called because we fail before reaching it
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("should NOT call prepare for EVM transactions", async () => {
      mockKmsPost.mockResolvedValue({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      await performSigning(
        {
          walletId: "wallet-123",
          transaction: "0x1234",
          networkId: NetworkId.ETHEREUM_MAINNET,
          account: "0xUser",
        },
        true,
      );

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("should NOT call prepare for Solana server-wallet transactions", async () => {
      mockKmsPost.mockResolvedValue({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      // Simulate a server-wallet client so spending limits are not applied
      (client as any).config.walletType = "server-wallet";

      await performSigning(
        {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        true,
      );

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should fail when prepare service fails with non-spending-limit error", async () => {
      // Mock prepare endpoint to fail with a real error (not "No spending limit configuration found")
      mockAxiosPost.mockRejectedValueOnce(new Error("Prepare service unavailable"));

      const performSigning = client["performTransactionSigning"].bind(client);

      // The error from getTransactionForSigning is re-thrown as-is, then wrapped in performTransactionSigning
      await expect(
        performSigning(
          {
            walletId: "wallet-123",
            transaction: "tx",
            networkId: NetworkId.SOLANA_MAINNET,
            account: "UserAccount123",
          },
          true,
        ),
      ).rejects.toThrow("Prepare service unavailable");
    });

    it("should throw detail message when prepare endpoint returns transaction-blocked error", async () => {
      // Create a proper AxiosError that will be recognized by isAxiosError
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as any).isAxiosError = true;
      axiosError.response = {
        data: {
          type: "transaction-blocked",
          title: "This transaction has been blocked",
          detail: "account does not have enough SOL to perform the operation",
        },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as any,
      };
      mockAxiosPost.mockRejectedValueOnce(axiosError);

      const performSigning = client["performTransactionSigning"].bind(client);

      await expect(
        performSigning(
          {
            walletId: "wallet-123",
            transaction: "tx",
            networkId: NetworkId.SOLANA_MAINNET,
            account: "UserAccount123",
          },
          true,
        ),
      ).rejects.toThrow("account does not have enough SOL to perform the operation");
    });

    it("should propagate transaction-blocked error with detail message from prepare to signTransaction", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.response = {
        data: {
          type: "transaction-blocked",
          title: "This transaction has been blocked",
          detail: "account does not have enough SOL to perform the operation",
          requestId: "test-request-id",
        },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as any,
      };
      // isAxiosError is already mocked to check for response property
      mockAxiosPost.mockRejectedValueOnce(axiosError);

      // Call signTransaction (which calls performTransactionSigning with includeSubmissionConfig=false)
      // This should trigger prepare, which will fail with transaction-blocked error
      const error = await client
        .signTransaction({
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        })
        .catch(e => e);

      // Verify the error is a TransactionBlockedError
      expect(error).toBeInstanceOf(TransactionBlockedError);
      expect(error).toMatchObject({
        name: "TransactionBlockedError",
        type: "transaction-blocked",
        title: "This transaction has been blocked",
        detail: "account does not have enough SOL to perform the operation",
        requestId: "test-request-id",
      });

      // Verify the error message (which should be the detail) is displayed correctly
      expect(error.message).toBe("account does not have enough SOL to perform the operation");
    });

    it("should continue signing when prepare endpoint returns pass-through with no limits", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "tx", simulationResult: {} },
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        true,
      );

      expect(result.signedTransaction).toBe("signed-tx");
    });

    it("should not call prepare endpoint for EVM transactions", async () => {
      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" }, rpc_submission_result: { result: "hash" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        {
          walletId: "wallet-123",
          transaction: "0x1234",
          networkId: NetworkId.ETHEREUM_MAINNET,
          account: "0xUser",
        },
        true,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it("should call prepare endpoint even when includeSubmissionConfig is false", async () => {
      // Mock prepare endpoint to return pass-through
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "tx", simulationResult: {} },
      });

      mockKmsPost.mockResolvedValueOnce({
        data: { result: { transaction: "signed-tx" } },
      });

      const performSigning = client["performTransactionSigning"].bind(client);
      const result = await performSigning(
        {
          walletId: "wallet-123",
          transaction: "tx",
          networkId: NetworkId.SOLANA_MAINNET,
          account: "UserAccount123",
        },
        false,
      );

      expect(result.signedTransaction).toBe("signed-tx");
      // Prepare should be called even when includeSubmissionConfig is false
      expect(mockAxiosPost).toHaveBeenCalled();
    });
  });

  describe("uses prepared transaction for signing", () => {
    it("should use prepared transaction returned from prepare endpoint", async () => {
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

      const prepareMethod = client["prepare"].bind(client);
      const result = await prepareMethod("original-tx", "org-123", submissionConfig, "UserAccount123");

      expect(result.transaction).toBe("augmented-tx-with-lighthouse-instructions");
    });
  });

  describe("prepare endpoint request structure", () => {
    it("should send Solana transactions in ChainTransaction format", async () => {
      const submissionConfig = {
        chain: "solana" as const,
        network: "mainnet",
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "augmented-tx", simulationResult: {}, memoryConfigUsed: {} },
      });

      const prepareMethod = client["prepare"].bind(client);
      const result = await prepareMethod("solana-tx-base64", "org-123", submissionConfig, "UserAccount123");

      expect(result.transaction).toBe("augmented-tx");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/prepare",
        expect.objectContaining({
          transaction: "solana-tx-base64", // Plain string, not wrapped
          organizationId: "org-123",
          submissionConfig: submissionConfig,
          simulationConfig: { account: "UserAccount123" },
        }),
        expect.any(Object),
      );
    });

    // Note: The prepare method no longer receives chain information,
    // so it cannot reject EVM transactions at the method level. Chain validation
    // should happen at a higher level before calling this method.

    it("should include all required fields in prepare request", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { transaction: "augmented-tx", simulationResult: {}, memoryConfigUsed: {} },
      });

      const submissionConfig = {
        chain: "solana" as const,
        network: "mainnet",
      };

      const prepareMethod = client["prepare"].bind(client);
      await prepareMethod("tx-base64", "org-123", submissionConfig, "UserAccount123");

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://api.phantom.app/prepare",
        {
          transaction: "tx-base64", // Plain string, not wrapped
          organizationId: "org-123",
          submissionConfig: submissionConfig,
          simulationConfig: { account: "UserAccount123" },
        },
        { headers: { "Content-Type": "application/json" } },
      );
    });
  });
});
