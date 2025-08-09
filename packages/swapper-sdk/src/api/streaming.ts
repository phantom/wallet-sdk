import type { EventType, SSEEvent, SwapperQuery, SwapperQuotesDataRepresentation } from "../types";
import type { SwapperAPIClient } from "./client";

export interface StreamQuotesOptions extends SwapperQuery {
  onQuote?: (quote: SwapperQuotesDataRepresentation) => void;
  onError?: (error: any) => void;
  onFinish?: () => void;
}

export class StreamingAPI {
  private eventSource?: EventSource;

  constructor(private client: SwapperAPIClient) {}

  streamQuotes(options: StreamQuotesOptions): () => void {
    const { onQuote, onError, onFinish, ...queryParams } = options;

    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const url = `${this.client.getBaseUrl()}/stream/quotes?${params.toString()}`;

    if (typeof EventSource === "undefined") {
      const error = new Error("EventSource is not supported in this environment");
      onError?.(error);
      throw error;
    }

    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener("new-quote-response", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SwapperQuotesDataRepresentation;
        onQuote?.(data);
      } catch (error) {
        onError?.(error);
      }
    });

    this.eventSource.addEventListener("error-quote-response", (event: MessageEvent) => {
      try {
        const error = JSON.parse(event.data);
        onError?.(error);
      } catch (parseError) {
        onError?.(parseError);
      }
    });

    this.eventSource.addEventListener("quote-stream-finished", () => {
      onFinish?.();
      this.close();
    });

    this.eventSource.onerror = (error) => {
      onError?.(error);
      this.close();
    };

    return () => this.close();
  }

  private close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }
}