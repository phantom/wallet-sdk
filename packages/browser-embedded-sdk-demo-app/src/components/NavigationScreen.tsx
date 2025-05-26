import * as React from "react";

interface NavigationScreenProps {
  onNormalWalletSelect: () => void;
  onElementWalletSelect: () => void;
  isLoading: boolean;
  error: string | null;
}

export const NavigationScreen: React.FC<NavigationScreenProps> = ({
  onNormalWalletSelect,
  onElementWalletSelect,
  isLoading,
  error,
}) => {
  return (
    <div className="navigation-screen">
      <h2>Choose a Wallet Configuration</h2>
      <div className="button-group">
        <button onClick={onNormalWalletSelect} disabled={isLoading} className="config-button">
          Normal Configuration
          <small>Position: Bottom Right</small>
        </button>
        <button onClick={onElementWalletSelect} disabled={isLoading} className="config-button">
          Element Configuration
          <small>Custom Container Element</small>
        </button>
        <button onClick={() => window.location.reload()} className="config-button">
          Reset All
          <small>Clear All Wallets</small>
        </button>
      </div>
      {isLoading && <div className="loading">Initializing wallet...</div>}
      {error && <div className="error">Error: {error}</div>}
    </div>
  );
};
