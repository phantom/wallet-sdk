export type NetworkID =
  // BTC
  | "bip122:000000000019d6689c085ae165831e93"
  | "bip122:000000000933ea01ad0ee984209779ba"
  // SOLANA
  | "solana:101"
  | "solana:102"
  | "solana:103"
  | "solana:localnet"
  // EVM
  | "eip155:1"
  | "eip155:11155111"
  | "eip155:137"
  | "eip155:80002"
  | "eip155:8453"
  | "eip155:84532"
  | "eip155:143"
  | "eip155:10143"
  | "eip155:41454"
  | "eip155:42161"
  | "eip155:421614"
  // HYPERCORE
  | "hypercore:mainnet"
  | "hypercore:testnet"
  // SUI
  | "sui:mainnet"
  | "sui:testnet";

export type AutoConfirmEnableParams = {
  chains?: NetworkID[];
};

export type AutoConfirmResult = {
  enabled: boolean;
  chains: NetworkID[];
};

export type AutoConfirmSupportedChainsResult = {
  chains: NetworkID[];
};

type AutoConfirmEnableRequest = {
  method: "phantom_auto_confirm_enable";
  params: AutoConfirmEnableParams;
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
  chains: Array<NetworkID>;
};
type AutoConfirmSupportResponse = {
  enabled?: never;
  chains: Array<NetworkID>;
};

export interface PhantomProvider {
  request: <Req extends AutoConfirmRequests>(
    args: Req,
  ) => Promise<
    Req["method"] extends AutoConfirmSupportRequest["method"] ? AutoConfirmSupportResponse : AutoConfirmStateResponse
  >;
}
