import type { PrepareErrorResponse } from "./types";

export class SpendingLimitError extends Error {
  type: string;
  title: string;
  requestId: string;
  previousSpendCents?: number;
  transactionSpendCents?: number;
  totalSpendCents?: number;
  limitCents?: number;

  constructor(data: PrepareErrorResponse) {
    super(data.detail);
    this.name = "SpendingLimitError";
    this.type = data.type;
    this.title = data.title;
    this.requestId = data.requestId;
    this.previousSpendCents = data.previousSpendCents;
    this.transactionSpendCents = data.transactionSpendCents;
    this.totalSpendCents = data.totalSpendCents;
    this.limitCents = data.limitCents;
  }
}

export class TransactionBlockedError extends Error {
  type: string;
  title: string;
  requestId: string;
  scannerResult?: any;

  constructor(data: PrepareErrorResponse) {
    super(data.detail);
    this.name = "TransactionBlockedError";
    this.type = data.type;
    this.title = data.title;
    this.requestId = data.requestId;
    this.scannerResult = data.scannerResult;
  }
}
