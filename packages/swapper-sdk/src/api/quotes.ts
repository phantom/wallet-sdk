import type { SwapperQuotesBody, SwapperQuotesDataRepresentation } from "../types";
import type { SwapperAPIClient } from "./client";

export class QuotesAPI {
  constructor(private client: SwapperAPIClient) {}

  async getQuotes(params: SwapperQuotesBody): Promise<SwapperQuotesDataRepresentation> {
    return this.client.post<SwapperQuotesDataRepresentation>("/quotes", params);
  }
}