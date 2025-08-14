import type {
  GenerateAndVerifyAddressParams,
  GenerateAndVerifyAddressResponse,
  GetBridgeProvidersResponse,
  GetBridgeableTokensResponse,
  GetIntentsStatusParams,
  GetIntentsStatusResponse,
  InitializeFundingParams,
  InitializeFundingResponse,
  OperationsParams,
  OperationsResponse,
  WithdrawalQueueResponse,
} from "../types";
import type { SwapperAPIClient } from "./client";

export class BridgeAPI {
  constructor(private client: SwapperAPIClient) {}

  async getBridgeableTokens(): Promise<GetBridgeableTokensResponse> {
    return this.client.get<GetBridgeableTokensResponse>("/spot/bridgeable-tokens");
  }

  async getPreferredBridges(): Promise<GetBridgeProvidersResponse> {
    return this.client.get<GetBridgeProvidersResponse>("/spot/preferred-bridges");
  }

  async getIntentsStatus(params: GetIntentsStatusParams): Promise<GetIntentsStatusResponse> {
    return this.client.get<GetIntentsStatusResponse>("/spot/get-intents-status", params as any);
  }

  async bridgeInitialize(params: GenerateAndVerifyAddressParams): Promise<GenerateAndVerifyAddressResponse> {
    return this.client.get<GenerateAndVerifyAddressResponse>("/spot/bridge-initialize", params as any);
  }

  async getBridgeOperations(params: OperationsParams): Promise<OperationsResponse> {
    return this.client.get<OperationsResponse>("/spot/bridge-operations", params as any);
  }

  async initializeFunding(params: InitializeFundingParams): Promise<InitializeFundingResponse> {
    return this.client.post<InitializeFundingResponse>("/spot/funding", params);
  }

  async getWithdrawalQueue(): Promise<WithdrawalQueueResponse> {
    return this.client.get<WithdrawalQueueResponse>("/spot/withdrawal-queue");
  }
}