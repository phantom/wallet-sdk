import type { FeeType, SwapperCaip19, SwapType } from "./chains";
import type { ChainID } from "./networks";

export interface SwapperQuotesBody {
  taker: SwapperCaip19;
  buyToken: SwapperCaip19;
  sellToken: SwapperCaip19;
  sellAmount: string;

  takerDestination?: SwapperCaip19;
  exactOut?: boolean;
  base64EncodedTx?: boolean;
  autoSlippage?: boolean;
  country?: string;
  slippageTolerance?: number;
  priorityFee?: number;
  tipAmount?: number;
  sellAmountUsd?: string;
  sellTokenBalance?: string;
  solBalanceInLamport?: string;
  isLedger?: boolean;
  phantomCashAccount?: boolean;
}

export interface SwapperQuotesDataRepresentation {
  type: SwapType;
  quotes: SwapperQuote[];

  taker: SwapperCaip19;
  buyToken: SwapperCaip19;
  sellToken: SwapperCaip19;
  slippageTolerance: number;
  simulationTolerance?: number;
  gasBuffer?: number;
  analyticsContext?: string;
  includesAllProviders?: boolean;
}

export interface SwapperSource {
  name: string;
  proportion: string;
}

export interface SwapperFee {
  name: string;
  percentage: number;
  token: SwapperCaip19;
  amount: number;
  type: FeeType;
}

export interface SwapperProvider {
  id: string;
  name: string;
  logoUri?: string;
}

export interface RFQProps {
  expireAt: number;
  quoteId: string;
}

interface BaseQuote {
  sellAmount: string;
  buyAmount: string;
  slippageTolerance: number;
  priceImpact: number;
  sources: SwapperSource[];
  fees: SwapperFee[];
  baseProvider: SwapperProvider;
  simulationFailed?: boolean;
  analyticsContext?: string;
  rfqProps?: RFQProps;
}

export interface SwapperSolanaQuoteRepresentation extends BaseQuote {
  transactionData: string[];
  gaslessSignature?: string;
  gaslessSwapFeeResult?: CalculateGaslessSwapFeeResult;
}

export interface SwapperEvmQuoteRepresentation extends BaseQuote {
  allowanceTarget: string;
  approvalExactAmount?: string;
  exchangeAddress: string;
  value: string;
  transactionData: string;
  gas: number;
}

export interface SwapperXChainQuoteRepresentation {
  sellAmount: string;
  buyAmount: string;
  slippageTolerance: number;
  executionDuration: number;
  tags?: string[];
  steps: SwapperXChainStep[];
  baseProvider: SwapperProvider;
}

export interface SwapperXChainStep {
  transactionData: string;
  buyToken: SwapperCaip19;
  sellToken: SwapperCaip19;
  nonIncludedNonGasFees: string;
  includedFees: string;
  feeCosts: BridgeFee[];
  includedFeeCosts: BridgeFee[];
  chainId: ChainID;
  tool: BridgeTool;
  value?: string;
  allowanceTarget?: string;
  approvalExactAmount?: string;
  approvalMetadata?: ApprovalMetadata;
  exchangeAddress?: string;
  gasCosts?: number[];
  id?: string;
}

export interface SwapperSuiQuoteRepresentation extends BaseQuote {
  transactionData: string[];
  tradeFee?: string[];
  estimateGasFee?: string[];
}

export type SwapperQuote =
  | SwapperSolanaQuoteRepresentation
  | SwapperEvmQuoteRepresentation
  | SwapperXChainQuoteRepresentation
  | SwapperSuiQuoteRepresentation;

export interface BridgeTool {
  key: string;
  name: string;
  logoURI: string;
}

export interface BridgeFee {
  amount: string;
  amountUSD?: string;
  description: string;
  included: boolean;
  name: string;
  percentage: string;
  token: SwapperCaip19;
}

export interface ApprovalMetadata {
  name: string;
  symbol: string;
}

export interface CalculateGaslessSwapFeeResult {
  fee?: number;
  error?: string;
}