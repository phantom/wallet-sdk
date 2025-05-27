import { createPhantom } from "@phantom/browser-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, attempting to create Phantom instance...");
  try {
    const phantomInstance = createPhantom({
      chainPlugins: [createSolanaPlugin()],
    });
    console.log("Phantom instance created:", phantomInstance);

    const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
    const signMessageBtn = document.getElementById("signMessageBtn") as HTMLButtonElement;
    const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
    const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;

    let userPublicKey: string | undefined;

    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.onclick = async () => {
        try {
          const provider = phantomInstance.solana.getProvider();
          if (!provider) {
            console.error("Phantom wallet not found.");
            alert("Phantom wallet not found. Please install Phantom.");
            return;
          }
          const connectResult = await phantomInstance.solana.connect();
          userPublicKey = connectResult;
          if (userPublicKey) {
            alert(`Connected: ${userPublicKey.toString()}`);
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

    if (signMessageBtn) {
      signMessageBtn.disabled = false;
      signMessageBtn.onclick = async () => {
        try {
          if (!phantomInstance.solana.getProvider() || !userPublicKey) {
            alert("Please connect your wallet first.");
            return;
          }
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
      signTransactionBtn.disabled = false;
      signTransactionBtn.onclick = async () => {
        try {
          const provider = phantomInstance.solana.getProvider();
          if (!provider || !userPublicKey) {
            alert("Please connect your wallet first.");
            return;
          }

          const connection = new Connection("https://api.mainnet-beta.solana.com");

          const transaction = new Transaction({
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
          }).add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(userPublicKey),
              toPubkey: new PublicKey(userPublicKey),
              lamports: 0.001 * LAMPORTS_PER_SOL,
            }),
          );

          const signature = await phantomInstance.solana.signAndSendTransaction(transaction);
          console.log("Transaction Signature:", signature);
          alert(`Transaction sent with signature: ${signature.signature}`);
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
          userPublicKey = undefined;
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
  } catch (error) {
    console.error("Error creating Phantom instance:", error);
    alert(`Error initializing Phantom: ${(error as Error).message || error}`);
  }
});
