/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_AUTH_URL: string
  readonly VITE_REDIRECT_URL: string
  readonly VITE_SOLANA_RPC_URL_MAINNET: string
  readonly VITE_SOLANA_RPC_URL_DEVNET: string
  readonly VITE_ETHEREUM_RPC_URL: string
  readonly VITE_ETHEREUM_SEPOLIA_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
