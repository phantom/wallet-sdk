/* eslint-disable no-console */
import { createPhantom } from "@phantom/browser-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { createAutoConfirmPlugin } from "@phantom/browser-sdk/auto-confirm";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, attempting to create Phantom instance...");
  try {
    const phantomInstance = createPhantom({
      plugins: [createSolanaPlugin(), createAutoConfirmPlugin()],
    });
    console.log("Phantom instance created:", phantomInstance);

    const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
    const getAccountBtn = document.getElementById("getAccountBtn") as HTMLButtonElement;
    const signMessageBtn = document.getElementById("signMessageBtn") as HTMLButtonElement;
    const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
    const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;

    // Auto-confirm plugin buttons
    const enableAutoConfirmBtn = document.getElementById("enableAutoConfirmBtn") as HTMLButtonElement;
    const disableAutoConfirmBtn = document.getElementById("disableAutoConfirmBtn") as HTMLButtonElement;
    const getAutoConfirmStatusBtn = document.getElementById("getAutoConfirmStatusBtn") as HTMLButtonElement;
    const getSupportedChainsBtn = document.getElementById("getSupportedChainsBtn") as HTMLButtonElement;

    let userPublicKey: string | null = null;

    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.onclick = async () => {
        try {
          const connectResult = await phantomInstance.solana.connect();
          userPublicKey = connectResult ?? null;
          if (userPublicKey) {
            alert(`Connected: ${userPublicKey}`);
            if (signMessageBtn) signMessageBtn.disabled = false;
            if (signTransactionBtn) signTransactionBtn.disabled = false;
          } else {
            alert("Connected, but public key was not retrieved.");
          }

          if (disconnectBtn) disconnectBtn.disabled = false;
        } catch (error) {
          console.error("Error connecting to Phantom:", error);
          alert(`Error connecting: ${(error as Error).message || error}`);
        }
      };
    }

    if (getAccountBtn) {
      getAccountBtn.onclick = async () => {
        try {
          const accountResult = await phantomInstance.solana.getAccount();
          if (accountResult) {
            userPublicKey = accountResult;
            console.log("Account retrieved:", accountResult);
            alert(`Account retrieved: ${accountResult}`);

            if (signMessageBtn) signMessageBtn.disabled = false;
            if (signTransactionBtn) signTransactionBtn.disabled = false;
            if (disconnectBtn) disconnectBtn.disabled = false;
          } else {
            alert("No account found or user denied access.");
          }
        } catch (error) {
          console.error("Error getting account:", error);
          alert(`Error getting account: ${(error as Error).message || error}`);
        }
      };
    }

    if (signMessageBtn) {
      signMessageBtn.disabled = !userPublicKey;
      signMessageBtn.onclick = async () => {
        try {
          const message = new TextEncoder().encode("Hello from Phantom Browser SDK Demo!");
          const signedMessage = await phantomInstance.solana.signMessage(message, "utf8");
          console.log("Signed Message:", signedMessage);
          alert(`Message signed: ${signedMessage.signature}`);
        } catch (error) {
          console.error("Error signing message:", error);
          alert(`Error signing message: ${(error as Error).message || error}`);
        }
      };
    }

    if (signTransactionBtn) {
      signTransactionBtn.disabled = !userPublicKey;
      signTransactionBtn.onclick = async () => {
        try {
          const rpc = createSolanaRpc("https://solana-mainnet.g.alchemy.com/v2/Pnb7lrjdZw6df2yXSKDiG");

          const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayer(address(userPublicKey as string), tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          );

          const transaction = compileTransaction(transactionMessage);

          const { signature } = await phantomInstance.solana.signAndSendTransaction(transaction);
          alert(`Transaction sent with signature: ${signature}`);
        } catch (error) {
          console.error("Error signing or sending transaction:", error);
          alert(`Error signing/sending transaction: ${(error as Error).message || error}`);
        }
      };
    }

    if (disconnectBtn) {
      disconnectBtn.onclick = async () => {
        try {
          await phantomInstance.solana.disconnect();
          userPublicKey = null;
          alert("Disconnected from Phantom.");
          if (connectBtn) connectBtn.disabled = false;
          if (signMessageBtn) signMessageBtn.disabled = true;
          if (signTransactionBtn) signTransactionBtn.disabled = true;
          if (disconnectBtn) disconnectBtn.disabled = true;
        } catch (error) {
          console.error("Error disconnecting from Phantom:", error);
          alert(`Error disconnecting: ${(error as Error).message || error}`);
        }
      };
    }

    // Auto-confirm plugin functionality
    if (enableAutoConfirmBtn) {
      enableAutoConfirmBtn.onclick = async () => {
        try {
          const result = await phantomInstance.autoConfirm.autoConfirmEnable({
            chains: ["solana:101", "solana:102", "solana:103"] // Enable for Solana mainnet, testnet, devnet
          });
          console.log("Auto-confirm enable result:", result);
          alert(`Auto-confirm ${result.enabled ? 'enabled' : 'not enabled'} for chains: ${result.chains.join(', ')}`);
        } catch (error) {
          console.error("Error enabling auto-confirm:", error);
          alert(`Error enabling auto-confirm: ${(error as Error).message || error}`);
        }
      };
    }

    if (disableAutoConfirmBtn) {
      disableAutoConfirmBtn.onclick = async () => {
        try {
          const result = await phantomInstance.autoConfirm.autoConfirmDisable();
          console.log("Auto-confirm disable result:", result);
          alert(`Auto-confirm disabled. Status: enabled=${result.enabled}, chains: ${result.chains.join(', ')}`);
        } catch (error) {
          console.error("Error disabling auto-confirm:", error);
          alert(`Error disabling auto-confirm: ${(error as Error).message || error}`);
        }
      };
    }

    if (getAutoConfirmStatusBtn) {
      getAutoConfirmStatusBtn.onclick = async () => {
        try {
          const result = await phantomInstance.autoConfirm.autoConfirmStatus();
          console.log("Auto-confirm status:", result);
          alert(`Auto-confirm status: enabled=${result.enabled}, chains: ${result.chains.join(', ')}`);
        } catch (error) {
          console.error("Error getting auto-confirm status:", error);
          alert(`Error getting auto-confirm status: ${(error as Error).message || error}`);
        }
      };
    }

    if (getSupportedChainsBtn) {
      getSupportedChainsBtn.onclick = async () => {
        try {
          const result = await phantomInstance.autoConfirm.autoConfirmSupportedChains();
          console.log("Supported chains:", result);
          alert(`Supported chains: ${result.chains.join(', ')}`);
        } catch (error) {
          console.error("Error getting supported chains:", error);
          alert(`Error getting supported chains: ${(error as Error).message || error}`);
        }
      };
    }
  } catch (error) {
    console.error("Error creating Phantom instance:", error);
    alert(`Error initializing Phantom: ${(error as Error).message || error}`);
  }
});
