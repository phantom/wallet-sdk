import type {
  NetworkID,
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-sdk/auto-confirm";

export type { NetworkID, AutoConfirmEnableParams, AutoConfirmResult, AutoConfirmSupportedChainsResult };

export interface AutoConfirmState {
  status: AutoConfirmResult | null;
  supportedChains: NetworkID[] | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AutoConfirmActions {
  enable: (params?: AutoConfirmEnableParams) => Promise<{ enabled: boolean; chains: NetworkID[] }>;
  disable: () => Promise<{ enabled: boolean; chains: NetworkID[] }>;
  getSupportedChains: () => Promise<{ chains: NetworkID[] }>;
  getStatus: () => Promise<{ enabled: boolean; chains: NetworkID[] }>;
}
