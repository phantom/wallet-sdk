import type { ChainID, SwapperCaip19 } from "./chains";

export interface GetBridgeableTokensResponse {
  tokens: SwapperCaip19[];
}

export interface GetBridgeProvidersResponse {
  providers: BridgeProviderInfo[];
}

export interface BridgeProviderInfo {
  name: string;
  max: number;
}

export interface GetIntentsStatusParams {
  requestId: string;
}

export interface GetIntentsStatusResponse {
  status: RelayExecutionStatus;
  details: string;
  inTxHashes: string[];
  txHashes: string[];
  time: number;
  originChainId: number;
  destinationChainId: number;
}

export enum RelayExecutionStatus {
  REFUND = "refund",
  DELAYED = "delayed",
  WAITING = "waiting",
  FAILURE = "failure",
  PENDING = "pending",
  SUCCESS = "success",
}

export interface GenerateAndVerifyAddressParams {
  sellToken: string;
  buyToken?: string;
  takerDestination: string;
}

export interface GenerateAndVerifyAddressResponse {
  depositAddress: SwapperCaip19;
  orderAssetId: number;
  usdcPrice: string;
}

export interface OperationsParams {
  taker: string;
  opCreatedAtOrAfter?: string;
}

export interface OperationsResponse {
  operations: ParsedOperation[];
  orderAssetId: number;
  usdcPrice: string;
}

export interface ParsedOperation {
  operationId: string;
  opCreatedAt: string;
  protocolAddress: string;
  sourceAddress: string;
  destinationAddress: string;
  sourceChain: HyperunitChain;
  destinationChain: HyperunitChain;
  sourceAmount: string;
  destinationAmount?: string;
  destinationUiAmount?: string;
  destinationFeeAmount: string;
  sweepFeeAmount: string;
  state: OperationState;
  sourceTxHash: string;
  destinationTxHash: string;
  positionInWithdrawQueue?: number;
  asset: HyperunitAsset;
  sourceTxConfirmations?: number;
  destinationTxConfirmations?: number;
  broadcastAt?: string;
}

export interface HyperunitChain {
  id: string;
  name: string;
}

export interface HyperunitAsset {
  id: string;
  symbol: string;
  name: string;
}

export enum OperationState {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface InitializeFundingParams {
  type: "deposit" | "withdraw";
  taker: string;
  originChain: ChainID;
}

export interface InitializeFundingResponse {
  fundingCaip19Address: string;
  spotAssetId: number;
  spotTokenId: string;
  spotTokenName: string;
  spotSzDecimals: number;
  eta: string;
  fee: string;
  minimumAmount: string;
}

export interface WithdrawalQueueResponse {
  SOLANA: QueueStatus;
  ETHEREUM: QueueStatus;
  BITCOIN: QueueStatus;
}

interface QueueStatus {
  lastWithdrawQueueOperationTxID: string;
  withdrawalQueueLength: number;
}