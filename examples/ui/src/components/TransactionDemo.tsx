import { useState } from "react";
import { 
  useAccounts,
  usePhantomUI,
  TransactionModal,
  type SignAndSendTransactionParams
} from "@phantom/react-ui";
import { SystemProgram, PublicKey, Transaction } from "@solana/kit";

export default function TransactionDemo() {
  const { addresses } = useAccounts();
  const { 
    transactionState, 
    signAndSendTransaction,
    showTransactionModal 
  } = usePhantomUI();
  
  const [amount, setAmount] = useState("0.001");
  const [recipient, setRecipient] = useState("11111111111111111111111111111111");
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = accounts.length > 0;

  const createTransferTransaction = (): SignAndSendTransactionParams => {
    if (!accounts[0]) throw new Error("No account connected");

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(accounts[0].address),
        toPubkey: new PublicKey(recipient),
        lamports: Math.floor(parseFloat(amount) * 1e9), // Convert SOL to lamports
      })
    );

    return {
      transaction,
      options: {
        commitment: "confirmed",
        skipPreflight: false,
      }
    };
  };

  const handleShowModal = () => {
    try {
      const params = createTransferTransaction();
      showTransactionModal(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    }
  };

  const handleSignAndSend = async () => {
    try {
      setError(null);
      const params = createTransferTransaction();
      const result = await signAndSendTransaction(params);
      setLastSignature(result.signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <div className="demo-section">
      <h2>Transaction Modal Demo</h2>
      <p>
        Create and test transactions with different parameters. The modal will show 
        transaction details before sending.
      </p>

      {!isConnected && (
        <div style={{ 
          padding: "1rem", 
          background: "#fff3cd", 
          border: "1px solid #ffeaa7", 
          borderRadius: "6px",
          marginBottom: "2rem" 
        }}>
          Please connect your wallet first to test transactions.
        </div>
      )}

      <div className="config-section">
        <h3>Transaction Configuration</h3>
        <div className="config-options">
          <label>
            Amount (SOL):
            <input 
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!isConnected}
            />
          </label>
          
          <label>
            Recipient Address:
            <input 
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter recipient public key"
              disabled={!isConnected}
            />
          </label>
        </div>
      </div>

      <div className="demo-controls">
        <button 
          onClick={handleShowModal}
          disabled={!isConnected}
        >
          Show Transaction Modal
        </button>
        
        <button 
          onClick={handleSignAndSend}
          disabled={!isConnected}
          className="secondary"
        >
          Sign & Send (Direct)
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: "1rem", 
          background: "#f8d7da", 
          border: "1px solid #f5c6cb", 
          borderRadius: "6px",
          marginTop: "1rem",
          color: "#721c24"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {lastSignature && (
        <div style={{ 
          padding: "1rem", 
          background: "#d4edda", 
          border: "1px solid #c3e6cb", 
          borderRadius: "6px",
          marginTop: "1rem",
          color: "#155724"
        }}>
          <strong>Transaction Successful!</strong><br />
          Signature: <code>{lastSignature}</code>
        </div>
      )}

      <div className="status-display">
        <h3>Transaction State</h3>
        <pre>{JSON.stringify({
          modalState: {
            isVisible: transactionState.isVisible,
            isLoading: transactionState.isLoading,
            error: transactionState.error?.message,
            hasTransaction: !!transactionState.transaction,
          },
          lastSignature,
          currentConfig: {
            amount: `${amount} SOL`,
            recipient,
            fromAddress: accounts[0]?.address,
          }
        }, null, 2)}</pre>
      </div>

      <TransactionModal />
    </div>
  );
}