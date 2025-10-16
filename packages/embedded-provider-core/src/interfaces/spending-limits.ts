export interface SpendingLimitsProvider {
  upsertSpendingLimit(args: unknown): Promise<unknown>;
}
