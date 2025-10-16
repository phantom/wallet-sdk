import type { SpendingLimitsProvider } from "@phantom/embedded-provider-core";

export class ExpoSpendingLimitsProvider implements SpendingLimitsProvider {
  upsertSpendingLimit(_args: unknown): Promise<unknown> {
    return Promise.resolve();
  }
}
