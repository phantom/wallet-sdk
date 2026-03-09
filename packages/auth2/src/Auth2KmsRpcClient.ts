import {
  Configuration,
  KMSRPCApi,
  type KmsRpcRequest,
  GetOrCreatePhantomOrganizationMethodEnum,
  GetOrganizationWalletsMethodEnum,
  CreateWalletMethodEnum,
} from "@phantom/openapi-wallet-service";
import axios from "axios";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { base64urlEncode } from "@phantom/base64url";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";

const DEFAULT_KMS_API_VERSION = "2025-11-24";

export type Auth2KmsClientOptions = {
  apiBaseUrl: string;
  appId: string;
};

/**
 * Handles authenticated KMS JSON-RPC calls and org/wallet discovery.
 * Shared between browser and RN Auth2 providers.
 *
 * Uses KMSRPCApi from @phantom/openapi-wallet-service (the same client as
 * PhantomClient) so stamping, headers, and request serialization are handled
 * consistently via axios interceptors rather than manual fetch calls.
 */
export class Auth2KmsRpcClient {
  private readonly kmsApi: KMSRPCApi;

  constructor(
    private readonly stamper: StamperWithKeyManagement,
    options: Auth2KmsClientOptions,
  ) {
    const axiosInstance = axios.create();

    axiosInstance.interceptors.request.use(async config => {
      config.headers = config.headers || {};
      config.headers["x-app-id"] = options.appId;
      config.headers["x-api-version"] = DEFAULT_KMS_API_VERSION;

      const requestBody =
        typeof config.data === "string" ? config.data : config.data === undefined ? "" : JSON.stringify(config.data);
      const stamp = await this.stamper.stamp({ data: Buffer.from(requestBody, "utf-8") });
      config.headers["x-phantom-stamp"] = stamp;
      return config;
    });

    const configuration = new Configuration({ basePath: options.apiBaseUrl });
    this.kmsApi = new KMSRPCApi(configuration, options.apiBaseUrl, axiosInstance);
  }

  private async postKmsRpc(request: KmsRpcRequest, bearerToken: string, authUserId?: string): Promise<unknown> {
    const headers: Record<string, string> = { authorization: bearerToken };
    if (authUserId) {
      headers["x-auth-user-id"] = authUserId;
    }

    const response = await this.kmsApi.postKmsRpc(request, { headers });

    // Surface JSON-RPC level errors (KMS returns HTTP 200 with error body).
    const rpcBody = response.data as { error?: { code?: number; message?: string } } | null;
    if (rpcBody?.error) {
      throw new Error(`KMS RPC error: ${JSON.stringify(rpcBody.error)}`);
    }

    return response.data;
  }

  private extractOrganizationId(body: unknown): string | null {
    const result = (body as { result?: unknown } | null)?.result;
    return extractStringFromPath(result, "organizationId", "organization_id");
  }

  public async discoverOrganizationAndWalletId(
    bearerToken: string,
    authUserId?: string,
  ): Promise<{ organizationId: string; walletId: string }> {
    const organizationId = await this.discoverOrganizationId(bearerToken, authUserId);
    if (!organizationId) {
      throw new Error("Unable to resolve organizationId. The Auth2 KMS did not return one.");
    }

    const walletId = await this.discoverWalletId(bearerToken, organizationId, authUserId);
    if (!walletId) {
      throw new Error("Unable to resolve walletId. The Auth2 KMS did not return or create one.");
    }

    return {
      organizationId,
      walletId,
    };
  }

  private async discoverOrganizationId(bearerToken: string, authUserId?: string): Promise<string | null> {
    const keyInfo = this.stamper.getKeyInfo();
    if (!keyInfo) {
      throw new Error("Stamper not initialized");
    }
    const publicKey = base64urlEncode(bs58.decode(keyInfo.publicKey));

    const created = await this.postKmsRpc(
      {
        method: GetOrCreatePhantomOrganizationMethodEnum.getOrCreatePhantomOrganization,
        params: { publicKey },
        timestampMs: Date.now(),
      } as KmsRpcRequest,
      bearerToken,
      authUserId,
    );
    return this.extractOrganizationId(created);
  }

  private async discoverWalletId(
    bearerToken: string,
    organizationId: string,
    authUserId?: string,
  ): Promise<string | null> {
    const listResponse = await this.postKmsRpc(
      {
        method: GetOrganizationWalletsMethodEnum.getOrganizationWallets,
        params: { organizationId, limit: 20, offset: 0 },
        timestampMs: Date.now(),
      } as KmsRpcRequest,
      bearerToken,
      authUserId,
    );

    const result = (listResponse as { result?: unknown } | null)?.result;
    const wallets = (result as { wallets?: unknown } | null)?.wallets;

    if (Array.isArray(wallets) && wallets.length > 0) {
      return extractStringFromPath(wallets[0], "walletId", "wallet_id");
    }

    // No wallets exist — create one with default accounts for all supported chains.
    const createResponse = await this.postKmsRpc(
      {
        method: CreateWalletMethodEnum.createWallet,
        params: {
          walletName: `Auth2 SDK Wallet ${Date.now()}`,
          organizationId,
          accounts: [
            { curve: "Ed25519", derivationPath: "m/44'/501'/0'/0'", addressFormat: "Solana" },
            { curve: "Secp256k1", derivationPath: "m/44'/60'/0'/0/0", addressFormat: "Ethereum" },
            { curve: "Secp256k1", derivationPath: "m/84'/0'/0'/0", addressFormat: "BitcoinSegwit" },
            { curve: "Ed25519", derivationPath: "m/44'/784'/0'/0'/0'", addressFormat: "Sui" },
          ],
        },
        timestampMs: Date.now(),
      } as KmsRpcRequest,
      bearerToken,
      authUserId,
    );

    const createResult = (createResponse as { result?: unknown } | null)?.result;
    return extractStringFromPath(createResult, "walletId", "wallet_id");
  }
}

/** Extracts the first matching string value from an object's nested properties. */
function extractStringFromPath(obj: unknown, ...keys: string[]): string | null {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  for (const key of keys) {
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }

  return null;
}
