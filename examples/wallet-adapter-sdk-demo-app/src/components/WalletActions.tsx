import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { useBalance } from "../hooks/useBalance";
import { Buffer } from "buffer";

/**
 * Component for wallet actions like signing and sending transactions
 */
export function WalletActions() {
  const { publicKey, signMessage, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const address = publicKey?.toBase58() || null;
  const { balance } = useBalance(address);

  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isSigningTransaction, setIsSigningTransaction] = useState(false);
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSufficientBalance = balance !== null && balance > 0.000001;

  const handleSignMessage = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    try {
      setIsSigningMessage(true);
      setError(null);

      const message = new TextEncoder().encode("Hello from Phantom SDK Wallet Adapter!");
      const signature = await signMessage(message);

      const signatureBase64 = Buffer.from(signature).toString("base64");
      alert(`Message signed!\nSignature: ${signatureBase64}`);
    } catch (err) {
      console.error("Error signing message:", err);
      setError(err instanceof Error ? err.message : "Failed to sign message");
    } finally {
      setIsSigningMessage(false);
    }
  }, [publicKey, signMessage]);

  const handleSignTransaction = useCallback(async () => {
    if (!publicKey || !signTransaction) return;

    try {
      setIsSigningTransaction(true);
      setError(null);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a simple transfer transaction (self-transfer)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000, // 0.000001 SOL
        }),
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      await signTransaction(transaction);

      alert("Transaction signed successfully! (Not sent to network)");
    } catch (err) {
      console.error("Error signing transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to sign transaction");
    } finally {
      setIsSigningTransaction(false);
    }
  }, [publicKey, signTransaction, connection]);

  const handleSendTransaction = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;

    try {
      setIsSendingTransaction(true);
      setError(null);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a simple transfer transaction (self-transfer)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000, // 0.000001 SOL
        }),
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation using polling strategy for better reliability
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!confirmed && attempts < maxAttempts) {
        try {
          const status = await connection.getSignatureStatus(signature);

          if (status && status.value) {
            if (status.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }

            if (status.value.confirmationStatus === "confirmed" || status.value.confirmationStatus === "finalized") {
              confirmed = true;
              break;
            }
          }

          if (!confirmed) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next check
          }
        } catch (statusError) {
          console.error("Error checking transaction status:", statusError);
          break;
        }
      }

      if (!confirmed) {
        // Even if we timeout, the transaction might still be successful
        alert(
          `Transaction sent!\nSignature: ${signature}\nNote: Confirmation timed out, but transaction may still be successful. Check Solscan for status.`,
        );
      } else {
        alert(`Transaction sent and confirmed!\nSignature: ${signature}`);
      }
    } catch (err) {
      console.error("Error sending transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to send transaction");
    } finally {
      setIsSendingTransaction(false);
    }
  }, [publicKey, sendTransaction, connection]);

  if (!connected) {
    return null;
  }

  return (
    <section className="section">
      <h2>Wallet Actions</h2>

      <div className="button-group">
        <button onClick={handleSignMessage} disabled={isSigningMessage} className="action-button">
          {isSigningMessage ? "Signing..." : "Sign Message"}
        </button>

        <button
          onClick={handleSignTransaction}
          disabled={isSigningTransaction || !hasSufficientBalance}
          className="action-button"
        >
          {isSigningTransaction ? "Signing..." : !hasSufficientBalance ? "Insufficient Balance" : "Sign Transaction"}
        </button>

        <button
          onClick={handleSendTransaction}
          disabled={isSendingTransaction || !hasSufficientBalance}
          className="action-button primary"
        >
          {isSendingTransaction
            ? "Sending..."
            : !hasSufficientBalance
              ? "Insufficient Balance"
              : "Send Transaction (0.000001 SOL)"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="small">
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
