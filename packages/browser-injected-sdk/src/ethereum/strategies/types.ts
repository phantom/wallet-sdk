import type { EthereumTransaction, EthereumSignInData, PhantomEthereumProvider } from "../types";
import type { ProviderStrategy } from "../../types";

export interface EthereumStrategy {
  readonly type: ProviderStrategy;
  isConnected: boolean;
  getProvider: () => PhantomEthereumProvider | null;

  connect: ({ onlyIfTrusted }: { onlyIfTrusted: boolean }) => Promise<string[] | undefined>;
  disconnect: () => Promise<void>;

  getAccounts: () => Promise<string[]>;

  signMessage: (message: string, address: string) => Promise<string>;
  signPersonalMessage: (message: string, address: string) => Promise<string>;
  signTypedData: (typedData: any, address: string) => Promise<string>;
  signIn: (signInData: EthereumSignInData) => Promise<{ address: string; signature: string; signedMessage: string }>;

  sendTransaction: (transaction: EthereumTransaction) => Promise<string>;
  signTransaction: (transaction: EthereumTransaction) => Promise<string>;

  getChainId: () => Promise<string>;
  switchChain: (chainId: string) => Promise<void>;

  request: <T = any>(args: { method: string; params?: unknown[] }) => Promise<T>;
}
