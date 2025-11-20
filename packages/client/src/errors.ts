import type { PrepareErrorResponse } from "./types";

export class SpendingLimitError extends Error {
  code: string;
  requestId?: string;
  previousSpendCents?: number;
  transactionSpendCents?: number;
  totalSpendCents?: number;
  limitCents?: number;
  raw?: PrepareErrorResponse;

  constructor(message: string, data: PrepareErrorResponse) {
    super(message);
    this.name = "SpendingLimitError";
    this.code = "SPENDING_LIMITS_REACHED";
    this.requestId = data.requestId;
    this.previousSpendCents = data.previousSpendCents;
    this.transactionSpendCents = data.transactionSpendCents;
    this.totalSpendCents = data.totalSpendCents;
    this.limitCents = data.limitCents;
    this.raw = data;
  }
}

export class TransactionBlockedError extends Error {
  code: string;
  requestId: string;
  scannerResult?: any;
  raw: PrepareErrorResponse;

  constructor(message: string, data: PrepareErrorResponse) {
    super(message);
    this.name = "TransactionBlockedError";
    this.code = "TRANSACTION_BLOCKED";
    this.requestId = data.requestId;
    this.scannerResult = data.scannerResult;
    this.raw = data;
  }
}
