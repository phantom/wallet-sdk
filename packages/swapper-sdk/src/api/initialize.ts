import type { SwapperInitializeRequestParams, SwapperInitializeResults } from "../types";
import type { SwapperAPIClient } from "./client";
import { transformInitializeParams } from "../utils/transformers";

export class InitializeAPI {
  constructor(private client: SwapperAPIClient) {}

  async initialize(params: SwapperInitializeRequestParams): Promise<SwapperInitializeResults> {
    const transformedParams = transformInitializeParams(params);
    return this.client.post<SwapperInitializeResults>("/initialize", transformedParams);
  }
}