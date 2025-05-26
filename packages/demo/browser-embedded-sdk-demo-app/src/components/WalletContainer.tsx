import * as React from "react";

export const WalletContainer: React.FC = React.memo(() => {
  return (
    <div
      id="wallet-container"
      style={{
        width: "400px",
        height: "600px",
        margin: "20px auto",
        border: "1px dashed #ccc",
        position: "relative",
      }}
    />
  );
});

WalletContainer.displayName = "WalletContainer";
