import React from "react";
import { usePhantomUI } from "../PhantomUIProvider";
import type { NetworkId as _NetworkId } from "@phantom/client";

// Chain-specific transaction preview components
function SolanaTransactionPreview({ transaction, networkId }: { transaction: any; networkId: string }) {
  const networkName = networkId.includes("devnet")
    ? "Solana Devnet"
    : networkId.includes("testnet")
      ? "Solana Testnet"
      : "Solana Mainnet";

  return (
    <div className="phantom-transaction-preview phantom-transaction-solana">
      <div className="phantom-network-badge">{networkName}</div>
      <div className="phantom-transaction-type">Solana Transaction</div>
      <div className="phantom-transaction-details">
        <div className="phantom-transaction-field">
          <label>Type:</label>
          <span>{transaction.messageBytes ? "@solana/kit Transaction" : "Solana Transaction"}</span>
        </div>
        {transaction.instructions && (
          <div className="phantom-transaction-field">
            <label>Instructions:</label>
            <span>{transaction.instructions.length} instruction(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EVMTransactionPreview({ transaction, networkId }: { transaction: any; networkId: string }) {
  const getNetworkName = (id: string) => {
    if (id.includes("1")) return "Ethereum Mainnet";
    if (id.includes("137")) return "Polygon Mainnet";
    if (id.includes("42161")) return "Arbitrum One";
    if (id.includes("10")) return "Optimism";
    if (id.includes("8453")) return "Base";
    if (id.includes("11155111")) return "Ethereum Sepolia";
    return "EVM Network";
  };

  const formatValue = (value: any) => {
    if (!value) return "0 ETH";
    try {
      const num = typeof value === "string" ? parseInt(value, 16) : Number(value);
      return `${(num / 1e18).toFixed(6)} ETH`;
    } catch {
      return "Unknown";
    }
  };

  const networkName = getNetworkName(networkId);

  return (
    <div className="phantom-transaction-preview phantom-transaction-evm">
      <div className="phantom-network-badge">{networkName}</div>
      <div className="phantom-transaction-type">EVM Transaction</div>
      <div className="phantom-transaction-details">
        <div className="phantom-transaction-field">
          <label>To:</label>
          <span className="phantom-address">{transaction.to || "Contract Call"}</span>
        </div>
        <div className="phantom-transaction-field">
          <label>Value:</label>
          <span>{formatValue(transaction.value)}</span>
        </div>
        {transaction.gas && (
          <div className="phantom-transaction-field">
            <label>Gas Limit:</label>
            <span>{typeof transaction.gas === "string" ? transaction.gas : transaction.gas.toString()}</span>
          </div>
        )}
        {transaction.data && transaction.data !== "0x" && (
          <div className="phantom-transaction-field">
            <label>Data:</label>
            <span className="phantom-data">Contract Interaction</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GenericTransactionPreview({ transaction: _transaction, networkId }: { transaction: any; networkId: string }) {
  const networkPrefix = networkId.split(":")[0];
  const networkName = networkPrefix.charAt(0).toUpperCase() + networkPrefix.slice(1);

  return (
    <div className="phantom-transaction-preview phantom-transaction-generic">
      <div className="phantom-network-badge">{networkName}</div>
      <div className="phantom-transaction-type">Transaction</div>
      <div className="phantom-transaction-details">
        <div className="phantom-transaction-field">
          <label>Network:</label>
          <span>{networkId}</span>
        </div>
        <div className="phantom-transaction-field">
          <label>Type:</label>
          <span>Unknown transaction format</span>
        </div>
      </div>
    </div>
  );
}

function TransactionPreview({ transaction, networkId }: { transaction: any; networkId: string }) {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return <SolanaTransactionPreview transaction={transaction} networkId={networkId} />;
    case "eip155":
    case "ethereum":
    case "polygon":
      return <EVMTransactionPreview transaction={transaction} networkId={networkId} />;
    default:
      return <GenericTransactionPreview transaction={transaction} networkId={networkId} />;
  }
}

export function TransactionModal() {
  const { transactionState, _internal } = usePhantomUI();
  const { approveTransaction, rejectTransaction } = _internal;

  if (!transactionState.isVisible || !transactionState.transaction) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !transactionState.isLoading) {
      rejectTransaction();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !transactionState.isLoading) {
      rejectTransaction();
    }
  };

  return (
    <div className="phantom-modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="phantom-modal">
        <div className="phantom-modal-header">
          <h2>Confirm Transaction</h2>
          <button
            className="phantom-modal-close"
            onClick={rejectTransaction}
            disabled={transactionState.isLoading}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="phantom-modal-content">
          <div className="phantom-transaction-container">
            <TransactionPreview
              transaction={transactionState.transaction.transaction}
              networkId={transactionState.transaction.networkId || `${transactionState.transaction.chain}:mainnet`}
            />
          </div>

          {/* Security Warning */}
          <div className="phantom-security-notice">
            <div className="phantom-security-icon">🔒</div>
            <div className="phantom-security-text">
              <strong>Review carefully</strong>
              <span>Make sure you trust this transaction before approving</span>
            </div>
          </div>

          {/* Error State */}
          {transactionState.error && (
            <div className="phantom-error-message">
              <div className="phantom-error-icon">⚠️</div>
              <div className="phantom-error-text">
                <strong>Transaction failed</strong>
                <span>{transactionState.error.message}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {transactionState.isLoading && (
            <div className="phantom-loading-state">
              <div className="phantom-spinner"></div>
              <p>Processing transaction...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="phantom-modal-actions">
            <button
              onClick={rejectTransaction}
              disabled={transactionState.isLoading}
              className="phantom-button phantom-button-secondary"
            >
              Reject
            </button>
            <button
              onClick={approveTransaction}
              disabled={transactionState.isLoading}
              className="phantom-button phantom-button-primary"
            >
              {transactionState.isLoading ? (
                <>
                  <div className="phantom-spinner phantom-spinner-small"></div>
                  Signing...
                </>
              ) : (
                "Approve"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
