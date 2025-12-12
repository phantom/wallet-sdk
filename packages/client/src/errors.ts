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
  return undefined;
}

export function getErrorMessage(error: unknown, fallbackMessage = "An error occurred"): string {
  if (error instanceof WalletServiceError) {
    return error.detail || error.title || error.message || fallbackMessage;
  }

  const data = getAxiosErrorData<{ message?: string; detail?: string; title?: string }>(error);
  if (data) {
    return data.message || data.detail || data.title || fallbackMessage;
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
