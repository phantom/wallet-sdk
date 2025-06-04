import * as React from "react";
import type { Phantom } from "@phantom/wallet-sdk";

// Define these constants once, to be used across the application
export const SOL_CAIP19 = "solana:101/nativeToken:501";
export const USDC_CAIP19 = "solana:101/address:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface WalletControlsProps {
  phantom: Phantom | null;
}

export const WalletControls: React.FC<WalletControlsProps> = ({ phantom }) => {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);

  return (
    <div className="wallet-controls">
      <h3>Wallet Controls</h3>
      <div className="button-group">
        <button onClick={() => phantom?.show()}>Show Wallet</button>
        <button onClick={() => phantom?.hide()}>Hide Wallet</button>
        <button onClick={() => phantom?.swap({ buy: USDC_CAIP19, sell: SOL_CAIP19 })}>Swap SOL to USDC</button>
        <button onClick={() => phantom?.buy({ buy: SOL_CAIP19 })}>Buy SOL</button>
        <button
          onClick={async () => {
            await phantom?.solana.connect();
            setPublicKey(phantom?.solana.publicKey);
          }}
        >
          Connect Solana Account
        </button>
        <button
          onClick={async () => {
            const encodedMessage = new TextEncoder().encode("Hello, world!");
            const signature = await phantom?.solana.signMessage(encodedMessage);
            // eslint-disable-next-line no-console
            console.log(signature);
          }}
        >
          Sign Message
        </button>
      </div>

      {publicKey && <div>Public Key: {publicKey.toString()}</div>}
    </div>
  );
};
