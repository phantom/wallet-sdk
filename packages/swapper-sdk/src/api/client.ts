import type { ErrorResponse, Headers, OptionalHeaders } from "../types";

export interface SwapperClientOptions {
  organizationId?: string;
  countryCode?: string;
  anonymousId?: string;
  version?: string;
}

export interface SwapperClientConfig {
  apiUrl?: string;
  options?: SwapperClientOptions;
  headers?: OptionalHeaders; // Still available but not documented prominently
  timeout?: number;
}

export class SwapperAPIClient {
  private readonly baseUrl: string;
  private readonly headers: Headers;
  private readonly timeout: number;

  constructor(config: SwapperClientConfig = {}) {
    this.baseUrl = (config.apiUrl || "https://api.phantom.app") + "/swap/v2";
    this.timeout = config.timeout || 30000;

    this.headers = {
      "Content-Type": "application/json",
      ...this.buildHeaders(config.options, config.headers),
    };
  }

  private buildHeaders(options?: SwapperClientOptions, customHeaders?: OptionalHeaders): OptionalHeaders {
    const headers: OptionalHeaders = {};

    // Platform is hardcoded to "sdk"
    headers["X-Phantom-Platform"] = "sdk";

    // Set headers from options
    if (options?.organizationId) {
      headers["X-Organization"] = options.organizationId;
    }

    if (options?.countryCode) {
      headers["cf-ipcountry"] = options.countryCode;
      headers["cloudfront-viewer-country"] = options.countryCode;
    }

    if (options?.anonymousId) {
      headers["X-Phantom-AnonymousId"] = options.anonymousId;
    }

    if (options?.version) {
      headers["X-Phantom-Version"] = options.version;
    }

    // Allow custom headers to override (but not documented prominently)
    return {
      ...headers,
      ...customHeaders,
    };
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST";
      body?: any;
      headers?: Partial<Headers>;
      queryParams?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {}, queryParams } = options;

    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Log the outgoing request
    // console.log("=== OUTGOING API REQUEST ===");
    // console.log(`URL: ${url.toString()}`);
    // console.log(`Method: ${method}`);
    // console.log(`Headers:`, JSON.stringify({ ...this.headers, ...headers }, null, 2));
    // if (body) {
    //   console.log(`Body:`, JSON.stringify(body, null, 2));
    // }
    // console.log("=============================");

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          ...this.headers,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // console.log("=== API RESPONSE ===");
      // console.log(`Status: ${response.status} ${response.statusText}`);
      // console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // console.log(`Error Response Body:`, JSON.stringify(errorData, null, 2));
        // console.log("====================");
        const error: ErrorResponse = {
          code: errorData.code || "UNKNOWN_ERROR",
          message: errorData.message || `Request failed with status ${response.status}`,
          statusCode: response.status,
          details: errorData.details,
        };
        throw error;
      }

      const responseData = await response.json();
      // console.log(`Success Response Body:`, JSON.stringify(responseData, null, 2));
      // console.log("====================");
      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw {
          code: "TIMEOUT",
          message: "Request timed out",
          statusCode: 408,
        } as ErrorResponse;
      }

      throw error;
    }
  }

  async get<T>(
    endpoint: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
    headers?: Partial<Headers>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      queryParams,
      headers,
    });
  }

  async post<T>(endpoint: string, body?: any, headers?: Partial<Headers>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
      headers,
    });
  }

  updateHeaders(headers: OptionalHeaders): void {
    Object.assign(this.headers, headers);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}