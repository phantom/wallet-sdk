import { isAxiosError } from "axios";
import type { PrepareErrorResponse, IWalletServiceError, WalletServiceErrorType } from "./types";

export class WalletServiceError extends Error implements IWalletServiceError {
  type: WalletServiceErrorType;
  title: string;
  detail: string;
  requestId: string;

  constructor(data: IWalletServiceError, errorName: string) {
    super(data.detail);
    this.name = errorName;
    this.type = data.type;
    this.title = data.title;
    this.detail = data.detail;
    this.requestId = data.requestId;
  }
}

export function getAxiosErrorData<T = unknown>(error: unknown): T | undefined {
  if (isAxiosError(error)) {
    return error.response?.data as T | undefined;
  }
  // Handle manually mocked errors that have response structure but aren't recognized by isAxiosError
  if (typeof error === "object" && error !== null && "response" in error) {
    const errorWithResponse = error as { response?: { data?: T } };
    return errorWithResponse.response?.data;
  }
  return undefined;
}

export function getErrorMessage(error: unknown, fallbackMessage = "An error occurred"): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const errorData = data as { message?: string; detail?: string; title?: string };
      return errorData.message || errorData.detail || errorData.title || error.message || fallbackMessage;
    }
    return error.message || fallbackMessage;
  }
  // Handle manually mocked errors that have response structure but aren't recognized by isAxiosError
  if (typeof error === "object" && error !== null && "response" in error) {
    const errorWithResponse = error as { response?: { data?: { message?: string; detail?: string; title?: string } }; message?: string };
    const data = errorWithResponse.response?.data;
    if (data && typeof data === "object") {
      return data.message || data.detail || data.title || errorWithResponse.message || fallbackMessage;
    }
    return errorWithResponse.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export function parseWalletServiceError(data: PrepareErrorResponse | undefined): WalletServiceError | null {
  if (!data || !data.type) {
    return null;
  }

  switch (data.type) {
    case "spending-limit-exceeded":
      return new SpendingLimitError(data);
    case "transaction-blocked":
      return new TransactionBlockedError(data);
    default:
      return null;
  }
}

export class SpendingLimitError extends WalletServiceError {
  previousSpendCents?: number;
  transactionSpendCents?: number;
  totalSpendCents?: number;
  limitCents?: number;

  constructor(data: PrepareErrorResponse) {
    super(data, "SpendingLimitError");
    this.previousSpendCents = data.previousSpendCents;
    this.transactionSpendCents = data.transactionSpendCents;
    this.totalSpendCents = data.totalSpendCents;
    this.limitCents = data.limitCents;
  }
}

export class TransactionBlockedError extends WalletServiceError {
  scannerResult?: any;

  constructor(data: PrepareErrorResponse) {
    super(data, "TransactionBlockedError");
    this.scannerResult = data.scannerResult;
  }
}
