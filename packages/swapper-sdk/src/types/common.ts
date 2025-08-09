export interface RequiredHeaders {
  "Content-Type": "application/json";
}

export interface OptionalHeaders {
  "X-Phantom-Version"?: string;
  "X-Phantom-Platform"?: string;
  "X-Phantom-AnonymousId"?: string;
  "cf-ipcountry"?: string;
  "cloudfront-viewer-country"?: string;
  Authorization?: string;
}

export type Headers = RequiredHeaders & OptionalHeaders;

export interface PermissionsResponse {
  perps: {
    actions: boolean;
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface SwapperQuery {
  taker: string;
  buyToken: string;
  sellToken: string;
  sellAmount: string;

  sellAmountUsd?: string;
  takerDestination?: string;
  slippageTolerance?: string;
  exactOut?: string;
  base64EncodedTx?: string;
  autoSlippage?: string;
  country?: string;
  priorityFee?: string;
  tipAmount?: string;
  isLedger?: string;
  phantomCashAccount?: string;
}

export type EventType = "new-quote-response" | "quote-stream-finished" | "error-quote-response";

export interface SSEEvent {
  type: EventType;
  data: any;
  retry?: number;
}