import { createPhantom } from "@phantom/browser-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { Connection, SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

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

    let userPublicKey: PublicKey | null = null;

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
          const signInResult = await phantomInstance.solana.signIn();
          console.log("Sign In Result:", signInResult);
          userPublicKey = signInResult.publicKey;
          if (userPublicKey) {
            alert(`Connected: ${userPublicKey.toString()}`);
          } else {
            alert("Connected, but public key was not retrieved.");
          }
          if (signMessageBtn) signMessageBtn.disabled = false;
          if (signTransactionBtn) signTransactionBtn.disabled = false;
        } catch (error) {
          console.error("Error connecting to Phantom:", error);
          alert(`Error connecting: ${(error as Error).message || error}`);
        }
      };
    }

    if (signMessageBtn) {
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
      signTransactionBtn.onclick = async () => {
        try {
          const provider = phantomInstance.solana.getProvider();
          if (!provider || !userPublicKey) {
            alert("Please connect your wallet first.");
            return;
          }

          const connection = new Connection("https://api.devnet.solana.com");

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: userPublicKey,
              toPubkey: userPublicKey,
              lamports: 0.001 * LAMPORTS_PER_SOL,
            }),
          );

          const signature = await phantomInstance.solana.signAndSendTransaction(transaction, connection);
          console.log("Transaction Signature:", signature);
          alert(`Transaction sent with signature: ${signature.signature}`);
        } catch (error) {
          console.error("Error signing or sending transaction:", error);
          alert(`Error signing/sending transaction: ${(error as Error).message || error}`);
        }
      };
    }
  } catch (error) {
    console.error("Error creating Phantom instance:", error);
    alert(`Error initializing Phantom: ${(error as Error).message || error}`);
  }
});

// Button event listeners will be added here later
