import type { SwapperInitializeRequestParams, SwapperInitializeResults } from "../types";
import type { SwapperAPIClient } from "./client";

export class InitializeAPI {
  constructor(private client: SwapperAPIClient) {}

  async initialize(params: SwapperInitializeRequestParams): Promise<SwapperInitializeResults> {
    return this.client.post<SwapperInitializeResults>("/initialize", params);
  }
}