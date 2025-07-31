/* eslint-disable no-console */
/// <reference types="vite/client" />
import { BrowserSDK, NetworkId, AddressType } from "@phantom/browser-sdk";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { parseEther, parseGwei } from "viem";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, setting up Browser SDK Demo...");

  // UI Elements
  const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
  const getAccountBtn = document.getElementById("getAccountBtn") as HTMLButtonElement;
  const signMessageBtn = document.getElementById("signMessageBtn") as HTMLButtonElement;
  const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
  const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;

  console.log("Found buttons:", {
    connectBtn: !!connectBtn,
    getAccountBtn: !!getAccountBtn,
    signMessageBtn: !!signMessageBtn,
    signTransactionBtn: !!signTransactionBtn,
    disconnectBtn: !!disconnectBtn,
  });

  // Get configuration UI elements
  const providerTypeSelect = document.getElementById("providerType") as HTMLSelectElement;
  const solanaProviderSelect = document.getElementById("solanaProvider") as HTMLSelectElement;
  const testWeb3jsBtn = document.getElementById("testWeb3jsBtn") as HTMLButtonElement;
  const testKitBtn = document.getElementById("testKitBtn") as HTMLButtonElement;
  const testEthereumBtn = document.getElementById("testEthereumBtn") as HTMLButtonElement;

  let sdk: BrowserSDK | null = null;
  let connectedAddresses: any[] = [];

  // Create SDK instance based on current configuration
  function createSDK(): BrowserSDK {
    const providerType = providerTypeSelect.value as "injected" | "embedded";
    const solanaProvider = solanaProviderSelect.value as "web3js" | "kit";

    if (providerType === "injected") {
      return new BrowserSDK({
        providerType: "injected",
        solanaProvider: solanaProvider,
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
    } else {
      // For demo purposes, use hardcoded embedded config
      return new BrowserSDK({
        providerType: "embedded",
        addressTypes: [AddressType.solana, AddressType.ethereum],
        apiBaseUrl: import.meta.env.VITE_WALLET_API || "https://api.phantom.app/v1/wallets",
        organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
        embeddedWalletType: "app-wallet",
        solanaProvider: solanaProvider,
      });
    }
  }

  // Update button states
  function updateButtonStates(connected: boolean) {
    if (connectBtn) connectBtn.disabled = connected;
    if (getAccountBtn) getAccountBtn.disabled = !connected;
    if (signMessageBtn) signMessageBtn.disabled = !connected;
    if (signTransactionBtn) signTransactionBtn.disabled = !connected;
    if (disconnectBtn) disconnectBtn.disabled = !connected;
    if (testWeb3jsBtn) testWeb3jsBtn.disabled = !connected;
    if (testKitBtn) testKitBtn.disabled = !connected;
    if (testEthereumBtn) testEthereumBtn.disabled = !connected;
  }

  // Connect button
  if (connectBtn) {
    connectBtn.onclick = async () => {
      try {
        sdk = createSDK();
        const result = await sdk.connect();
        connectedAddresses = result.addresses;

        console.log("Connected successfully:", result);
        alert(`Connected! Addresses: ${result.addresses.map(a => `${a.addressType}: ${a.address}`).join(", ")}`);

        updateButtonStates(true);
      } catch (error) {
        console.error("Error connecting:", error);
        alert(`Error connecting: ${(error as Error).message || error}`);
      }
    };
  }

  // Get Account button
  if (getAccountBtn) {
    getAccountBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        const addresses = await sdk.getAddresses();
        console.log("Current addresses:", addresses);
        alert(`Addresses: ${addresses.map(a => `${a.addressType}: ${a.address}`).join(", ")}`);
      } catch (error) {
        console.error("Error getting addresses:", error);
        alert(`Error getting addresses: ${(error as Error).message || error}`);
      }
    };
  }

  // Sign Message button
  if (signMessageBtn) {
    signMessageBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        const message = "Hello from Phantom Browser SDK!";
        // Use devnet by default for demo, but could be configurable
        const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const networkId = rpcUrl.includes("mainnet") ? NetworkId.SOLANA_MAINNET : NetworkId.SOLANA_DEVNET;
        const signature = await sdk.signMessage(message, networkId);

        console.log("Message signed:", signature);
        alert(`Message signed: ${signature}`);
      } catch (error) {
        console.error("Error signing message:", error);
        alert(`Error signing message: ${(error as Error).message || error}`);
      }
    };
  }

  // Sign Transaction button (basic test)
  if (signTransactionBtn) {
    signTransactionBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        // Find Solana address
        const solanaAddress = connectedAddresses.find(a => a.addressType === AddressType.solana);
        if (!solanaAddress) {
          alert("No Solana address found");
          return;
        }

        // Use current Solana provider selection
        const solanaProvider = solanaProviderSelect.value as "web3js" | "kit";

        if (solanaProvider === "web3js") {
          await testWeb3jsTransaction();
        } else {
          await testKitTransaction();
        }
      } catch (error) {
        console.error("Error signing transaction:", error);
        alert(`Error signing transaction: ${(error as Error).message || error}`);
      }
    };
  }

  // Test @solana/web3.js transaction
  async function testWeb3jsTransaction() {
    const solanaAddress = connectedAddresses.find(a => a.addressType === AddressType.solana);
    if (!solanaAddress) {
      alert("No Solana address found");
      return;
    }

    // Create connection to get recent blockhash (using environment RPC URL)
    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create a simple transfer transaction with blockhash
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: new PublicKey(solanaAddress.address),
    }).add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress.address),
        toPubkey: new PublicKey(solanaAddress.address), // Self-transfer for demo
        lamports: 0.001 * LAMPORTS_PER_SOL,
      }),
    );

    // Determine network based on RPC URL
    const networkId = rpcUrl.includes("mainnet") ? NetworkId.SOLANA_MAINNET : NetworkId.SOLANA_DEVNET;

    const result = await sdk!.signAndSendTransaction({
      networkId: networkId,
      transaction: transaction,
    });

    console.log("Transaction sent (web3.js):", result);
    alert(`Transaction sent: ${result.rawTransaction}`);
  }

  // Test @solana/kit transaction
  async function testKitTransaction() {
    const solanaAddress = connectedAddresses.find(a => a.addressType === AddressType.solana);
    if (!solanaAddress) {
      alert("No Solana address found");
      return;
    }

    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const rpc = createSolanaRpc(rpcUrl);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(solanaAddress.address), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    // Determine network based on RPC URL
    const networkId = rpcUrl.includes("mainnet") ? NetworkId.SOLANA_MAINNET : NetworkId.SOLANA_DEVNET;

    const result = await sdk!.signAndSendTransaction({
      networkId: networkId,
      transaction: transaction,
    });

    console.log("Transaction sent (kit):", result);
    alert(`Transaction sent: ${result.rawTransaction}`);
  }

  // Test Web3.js button
  if (testWeb3jsBtn) {
    testWeb3jsBtn.onclick = async () => {
      try {
        await testWeb3jsTransaction();
      } catch (error) {
        console.error("Error with web3.js transaction:", error);
        alert(`Error with web3.js transaction: ${(error as Error).message || error}`);
      }
    };
  }

  // Test Kit button
  if (testKitBtn) {
    testKitBtn.onclick = async () => {
      try {
        await testKitTransaction();
      } catch (error) {
        console.error("Error with kit transaction:", error);
        alert(`Error with kit transaction: ${(error as Error).message || error}`);
      }
    };
  }

  // Test Ethereum button
  if (testEthereumBtn) {
    testEthereumBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        const ethAddress = connectedAddresses.find(a => a.addressType === AddressType.ethereum);
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }

        // Create simple ETH transfer
        const result = await sdk.signAndSendTransaction({
          networkId: NetworkId.ETHEREUM_MAINNET,
          transaction: {
            to: ethAddress.address, // Self-transfer for demo
            value: parseEther("0.001"), // 0.001 ETH
            gas: 21000n,
            gasPrice: parseGwei("20"), // 20 gwei
          },
        });

        console.log("Ethereum transaction sent:", result);
        alert(`Ethereum transaction sent: ${result.rawTransaction}`);
      } catch (error) {
        console.error("Error with Ethereum transaction:", error);
        alert(`Error with Ethereum transaction: ${(error as Error).message || error}`);
      }
    };
  }

  // Disconnect button
  if (disconnectBtn) {
    disconnectBtn.onclick = async () => {
      try {
        if (sdk) {
          await sdk.disconnect();
          sdk = null;
          connectedAddresses = [];
          alert("Disconnected successfully");
          updateButtonStates(false);
        }
      } catch (error) {
        console.error("Error disconnecting:", error);
        alert(`Error disconnecting: ${(error as Error).message || error}`);
      }
    };
  }

  // Initialize button states
  updateButtonStates(false);

  // Ensure Connect button is enabled initially
  if (connectBtn) {
    connectBtn.disabled = false;
  }

  console.log("Browser SDK Demo initialized");
});
