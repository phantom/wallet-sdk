import type { PrepareErrorResponse, ProblemDetails, WalletServiceErrorType } from "./types";

/**
 * Base error class for RFC 7807 Problem Details format errors from the wallet service
 * See: https://datatracker.ietf.org/doc/html/rfc7807
 */
export class WalletServiceError extends Error implements ProblemDetails {
  type: WalletServiceErrorType;
  title: string;
  detail: string;
  requestId: string;

  constructor(data: ProblemDetails, errorName: string) {
    super(data.detail);
    this.name = errorName;
    this.type = data.type;
    this.title = data.title;
    this.detail = data.detail;
    this.requestId = data.requestId;
  }
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
