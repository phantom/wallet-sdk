import type { ErrorResponse, Headers, OptionalHeaders } from "../types";

export interface SwapperClientConfig {
  apiUrl?: string;
  headers?: OptionalHeaders;
  timeout?: number;
}

export class SwapperAPIClient {
  private readonly baseUrl: string;
  private readonly headers: Headers;
  private readonly timeout: number;

  constructor(config: SwapperClientConfig = {}) {
    this.baseUrl = (config.apiUrl || process.env.PHANTOM_SWAPPER_API_URL || "https://api.phantom.app") + "/swap/v2";
    this.timeout = config.timeout || 30000;

    this.headers = {
      "Content-Type": "application/json",
      ...this.buildOptionalHeaders(config.headers),
    };
  }

  private buildOptionalHeaders(customHeaders?: OptionalHeaders): OptionalHeaders {
    const headers: OptionalHeaders = {};

    if (process.env.PHANTOM_SERVICE_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.PHANTOM_SERVICE_AUTH_TOKEN}`;
    }

    if (process.env.PHANTOM_CLIENT_VERSION) {
      headers["X-Phantom-Version"] = process.env.PHANTOM_CLIENT_VERSION;
    }

    if (process.env.PHANTOM_CLIENT_PLATFORM) {
      headers["X-Phantom-Platform"] = process.env.PHANTOM_CLIENT_PLATFORM;
    }

    if (process.env.PHANTOM_COUNTRY_CODE) {
      headers["cf-ipcountry"] = process.env.PHANTOM_COUNTRY_CODE;
      headers["cloudfront-viewer-country"] = process.env.PHANTOM_COUNTRY_CODE;
    }

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ErrorResponse = {
          code: errorData.code || "UNKNOWN_ERROR",
          message: errorData.message || `Request failed with status ${response.status}`,
          statusCode: response.status,
          details: errorData.details,
        };
        throw error;
      }

      return await response.json();
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