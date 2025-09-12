import { PhantomClient } from "./PhantomClient";
import type { UserConfig, CreateAuthenticatorParams, AuthenticatorConfig } from "./types";

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
        
        await expect(
          client.createOrganization(longOrgName, [validUserConfig])
        ).rejects.toThrow("Organization name cannot exceed 64 characters. Current length: 65");
      });

      it("should accept organization name with exactly 64 characters", async () => {
        const exactLengthOrgName = "a".repeat(64); // 64 characters
        
        // Mock the API call to avoid actual HTTP request
        const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } }
        });

        await expect(
          client.createOrganization(exactLengthOrgName, [validUserConfig])
        ).resolves.toBeDefined();

        expect(mockPost).toHaveBeenCalled();
      });

      it("should accept organization name under 64 characters", async () => {
        const shortOrgName = "short-org-name"; // < 64 characters
        
        const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } }
        });

        await expect(
          client.createOrganization(shortOrgName, [validUserConfig])
        ).resolves.toBeDefined();

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
        
        await expect(
          client.createOrganization("valid-org", [userConfigWithLongName])
        ).rejects.toThrow("Username name cannot exceed 64 characters. Current length: 65");
      });

      it("should accept username with exactly 64 characters", async () => {
        const exactLengthUsername = "a".repeat(64); // 64 characters
        const userConfigWithExactName: UserConfig = {
          ...validUserConfig,
          username: exactLengthUsername,
        };
        
        const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } }
        });

        await expect(
          client.createOrganization("valid-org", [userConfigWithExactName])
        ).resolves.toBeDefined();

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
        
        await expect(
          client.createOrganization("valid-org", [userConfigWithLongAuth])
        ).rejects.toThrow("Authenticator name cannot exceed 64 characters. Current length: 65");
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
        
        const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
          data: { result: { organizationId: "test-org-id" } }
        });

        await expect(
          client.createOrganization("valid-org", [userConfigWithExactAuth])
        ).resolves.toBeDefined();

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
      
      await expect(
        client.createAuthenticator(paramsWithLongUsername)
      ).rejects.toThrow("Username name cannot exceed 64 characters. Current length: 65");
    });

    it("should throw error for authenticatorName exceeding 64 characters", async () => {
      const longAuthName = "a".repeat(65); // 65 characters
      const paramsWithLongAuthName = {
        ...validAuthParams,
        authenticatorName: longAuthName,
      };
      
      await expect(
        client.createAuthenticator(paramsWithLongAuthName)
      ).rejects.toThrow("Authenticator name cannot exceed 64 characters. Current length: 65");
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
      
      await expect(
        client.createAuthenticator(paramsWithLongNestedAuthName)
      ).rejects.toThrow("Authenticator name cannot exceed 64 characters. Current length: 65");
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
      
      const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
        data: { result: { authenticatorId: "test-auth-id" } }
      });

      await expect(
        client.createAuthenticator(paramsWithExactLengthNames)
      ).resolves.toBeDefined();

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
      
      const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
        data: { result: { authenticatorId: "test-auth-id" } }
      });

      await expect(
        client.createAuthenticator(paramsWithShortNames)
      ).resolves.toBeDefined();

      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings gracefully", async () => {
      const mockPost = jest.spyOn((client as any).kmsApi, 'postKmsRpc').mockResolvedValue({
        data: { result: { organizationId: "test-org-id" } }
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
      await expect(
        client.createOrganization("valid-org", [userConfigWithEmptyAuth])
      ).resolves.toBeDefined();

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

      await expect(
        client.createOrganization("valid-org", [validUser, invalidUser])
      ).rejects.toThrow("Username name cannot exceed 64 characters. Current length: 65");
    });
  });
});