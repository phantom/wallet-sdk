import {
  BridgeAPI,
  InitializeAPI,
  PermissionsAPI,
  QuotesAPI,
  StreamingAPI,
  SwapperAPIClient,
  type SwapperClientConfig,
} from "./api";
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
  OptionalHeaders,
  PermissionsResponse,
  SwapperInitializeRequestParams,
  SwapperInitializeResults,
  SwapperQuotesBody,
  SwapperQuotesDataRepresentation,
  WithdrawalQueueResponse,
} from "./types";
import type { StreamQuotesOptions } from "./api/streaming";

export interface SwapperSDKConfig extends SwapperClientConfig {
  debug?: boolean;
}

export class SwapperSDK {
  private readonly client: SwapperAPIClient;
  private readonly quotes: QuotesAPI;
  private readonly initialize: InitializeAPI;
  private readonly streaming: StreamingAPI;
  private readonly bridge: BridgeAPI;
  private readonly permissions: PermissionsAPI;
  private readonly debug: boolean;

  constructor(config: SwapperSDKConfig = {}) {
    this.debug = config.debug || false;
    this.client = new SwapperAPIClient(config);

    this.quotes = new QuotesAPI(this.client);
    this.initialize = new InitializeAPI(this.client);
    this.streaming = new StreamingAPI(this.client);
    this.bridge = new BridgeAPI(this.client);
    this.permissions = new PermissionsAPI(this.client);

    if (this.debug) {
      console.error("[SwapperSDK] Initialized with config:", {
        baseUrl: this.client.getBaseUrl(),
        debug: this.debug,
      });
    }
  }

  async getQuotes(params: SwapperQuotesBody): Promise<SwapperQuotesDataRepresentation> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting quotes with params:", params);
    }
    const result = await this.quotes.getQuotes(params);
    if (this.debug) {
      console.error("[SwapperSDK] Received quotes:", result);
    }
    return result;
  }

  async initializeSwap(params: SwapperInitializeRequestParams): Promise<SwapperInitializeResults> {
    if (this.debug) {
      console.error("[SwapperSDK] Initializing swap with params:", params);
    }
    const result = await this.initialize.initialize(params);
    if (this.debug) {
      console.error("[SwapperSDK] Initialize result:", result);
    }
    return result;
  }

  streamQuotes(options: StreamQuotesOptions): () => void {
    if (this.debug) {
      console.error("[SwapperSDK] Starting quote stream with options:", options);
    }
    return this.streaming.streamQuotes(options);
  }

  async getPermissions(): Promise<PermissionsResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting permissions");
    }
    const result = await this.permissions.getPermissions();
    if (this.debug) {
      console.error("[SwapperSDK] Permissions result:", result);
    }
    return result;
  }

  async getBridgeableTokens(): Promise<GetBridgeableTokensResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting bridgeable tokens");
    }
    const result = await this.bridge.getBridgeableTokens();
    if (this.debug) {
      console.error("[SwapperSDK] Bridgeable tokens:", result);
    }
    return result;
  }

  async getPreferredBridges(): Promise<GetBridgeProvidersResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting preferred bridges");
    }
    const result = await this.bridge.getPreferredBridges();
    if (this.debug) {
      console.error("[SwapperSDK] Preferred bridges:", result);
    }
    return result;
  }

  async getIntentsStatus(params: GetIntentsStatusParams): Promise<GetIntentsStatusResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting intents status with params:", params);
    }
    const result = await this.bridge.getIntentsStatus(params);
    if (this.debug) {
      console.error("[SwapperSDK] Intents status:", result);
    }
    return result;
  }

  async initializeBridge(params: GenerateAndVerifyAddressParams): Promise<GenerateAndVerifyAddressResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Initializing bridge with params:", params);
    }
    const result = await this.bridge.bridgeInitialize(params);
    if (this.debug) {
      console.error("[SwapperSDK] Bridge initialize result:", result);
    }
    return result;
  }

  async getBridgeOperations(params: OperationsParams): Promise<OperationsResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting bridge operations with params:", params);
    }
    const result = await this.bridge.getBridgeOperations(params);
    if (this.debug) {
      console.error("[SwapperSDK] Bridge operations:", result);
    }
    return result;
  }

  async initializeFunding(params: InitializeFundingParams): Promise<InitializeFundingResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Initializing funding with params:", params);
    }
    const result = await this.bridge.initializeFunding(params);
    if (this.debug) {
      console.error("[SwapperSDK] Funding initialize result:", result);
    }
    return result;
  }

  async getWithdrawalQueue(): Promise<WithdrawalQueueResponse> {
    if (this.debug) {
      console.error("[SwapperSDK] Getting withdrawal queue");
    }
    const result = await this.bridge.getWithdrawalQueue();
    if (this.debug) {
      console.error("[SwapperSDK] Withdrawal queue:", result);
    }
    return result;
  }

  updateHeaders(headers: OptionalHeaders): void {
    if (this.debug) {
      console.error("[SwapperSDK] Updating headers:", headers);
    }
    this.client.updateHeaders(headers);
  }
}