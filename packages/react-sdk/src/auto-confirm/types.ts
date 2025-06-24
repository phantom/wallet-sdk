import type {
  NetworkID,
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-sdk/auto-confirm";

export type {
  NetworkID,
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
};

export interface AutoConfirmState {
  status: AutoConfirmResult | null;
  supportedChains: NetworkID[] | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AutoConfirmActions {
  enable: (params?: AutoConfirmEnableParams) => Promise<void>;
  disable: () => Promise<void>;
}