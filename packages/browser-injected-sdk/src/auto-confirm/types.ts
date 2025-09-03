import type { NetworkId, InternalNetworkCaip } from "@phantom/constants";

export type AutoConfirmEnableParams = {
  chains?: NetworkId[];
};

// Internal types for extension communication
type InternalAutoConfirmEnableParams = {
  chains?: InternalNetworkCaip[];
};

export type AutoConfirmResult = {
  enabled: boolean;
  chains: NetworkId[];
};

export type AutoConfirmSupportedChainsResult = {
  chains: NetworkId[];
};

type AutoConfirmEnableRequest = {
  method: "phantom_auto_confirm_enable";
  params: InternalAutoConfirmEnableParams;
};
type AutoConfirmDisableRequest = {
  method: "phantom_auto_confirm_disable";
  params: Record<string, never>;
};
type AutoConfirmStatusRequest = {
  method: "phantom_auto_confirm_status";
  params: Record<string, never>;
};
type AutoConfirmSupportRequest = {
  method: "phantom_auto_confirm_supported_chains";
  params: Record<string, never>;
};

type AutoConfirmRequests =
  | AutoConfirmEnableRequest
  | AutoConfirmDisableRequest
  | AutoConfirmStatusRequest
  | AutoConfirmSupportRequest;

type AutoConfirmStateResponse = {
  enabled: boolean;
  chains: Array<InternalNetworkCaip>;
};
type AutoConfirmSupportResponse = {
  enabled?: never;
  chains: Array<InternalNetworkCaip>;
};

export interface PhantomProvider {
  request: <Req extends AutoConfirmRequests>(
    args: Req,
  ) => Promise<
    Req["method"] extends AutoConfirmSupportRequest["method"] ? AutoConfirmSupportResponse : AutoConfirmStateResponse
  >;
}
