import { AddressType } from "@phantom/client";

/**
 * Configuration for custom wallet discovery rules
 * These are wallets that need special detection logic beyond EIP-6963 and Wallet Standard
 */
export interface CustomWalletConfig {
  id: string;
  name: string;
  icon: string;
  windowProperty: string;
  addressTypes: AddressType[];
}

export const CUSTOM_WALLET_CONFIGS: CustomWalletConfig[] = [
  {
    id: "coinbase-wallet",
    name: "Coinbase Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTI4IDU2YzE1LjQ2NCAwIDI4LTEyLjUzNiAyOC0yOFM0My40NjQgMCAyOCAwIDAgMTIuNTM2IDAgMjhzMTIuNTM2IDI4IDI4IDI4WiIgZmlsbD0iIzFCNTNFNCIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNyAyOGMwIDExLjU5OCA5LjQwMiAyMSAyMSAyMXMyMS05LjQwMiAyMS0yMVMzOS41OTggNyAyOCA3IDcgMTYuNDAyIDcgMjhabTE3LjIzNC02Ljc2NmEzIDMgMCAwIDAtMyAzdjcuNTMzYTMgMyAwIDAgMCAzIDNoNy41MzNhMyAzIDAgMCAwIDMtM3YtNy41MzNhMyAzIDAgMCAwLTMtM2gtNy41MzNaIiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    windowProperty: "coinbaseSolana",
    addressTypes: [AddressType.solana],
  },
];
