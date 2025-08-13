/* eslint-disable no-console */
/// <reference types="vite/client" />
import {
  BrowserSDK,
  NetworkId,
  AddressType,
  debug,
  DebugLevel,
  DEFAULT_AUTH_URL,
  DEFAULT_WALLET_API_URL,
} from "@phantom/browser-sdk";
import type { DebugMessage } from "@phantom/browser-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
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
  const signMessageEvmBtn = document.getElementById("signMessageEvmBtn") as HTMLButtonElement;
  const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
  const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;

  // Address display elements
  const addressesSection = document.getElementById("addressesSection") as HTMLDivElement;
  const addressesList = document.getElementById("addressesList") as HTMLDivElement;

  console.log("Found buttons:", {
    connectBtn: !!connectBtn,
    getAccountBtn: !!getAccountBtn,
    signMessageBtn: !!signMessageBtn,
    signMessageEvmBtn: !!signMessageEvmBtn,
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

  // Debug message storage
  const debugMessages: DebugMessage[] = [];
  const debugContainer = document.getElementById("debugMessages") as HTMLDivElement;
  const debugToggle = document.getElementById("debugToggle") as HTMLInputElement;
  const debugLevel = document.getElementById("debugLevel") as HTMLSelectElement;
  const clearDebugBtn = document.getElementById("clearDebugBtn") as HTMLButtonElement;

  // Debug callback function
  function handleDebugMessage(message: DebugMessage) {
    debugMessages.push(message);

    // Keep only last 100 messages to prevent memory issues
    if (debugMessages.length > 100) {
      debugMessages.shift();
    }

    updateDebugUI();
  }

  // Update debug UI
  function updateDebugUI() {
    if (!debugContainer) return;

    const isVisible = debugToggle?.checked ?? true;
    debugContainer.style.display = isVisible ? "block" : "none";

    if (isVisible) {
      debugContainer.innerHTML = debugMessages
        .slice(-30) // Show last 30 messages for the larger container
        .map(msg => {
          const levelClass = DebugLevel[msg.level].toLowerCase();
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          const dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : "";

          return `
            <div class="debug-message debug-${levelClass}">
              <div class="debug-header">
                <span class="debug-timestamp">${timestamp}</span>
                <span class="debug-level">${DebugLevel[msg.level]}</span>
                <span class="debug-category">${msg.category}</span>
              </div>
              <div class="debug-content">${msg.message}</div>
              ${dataStr ? `<pre class="debug-data">${dataStr}</pre>` : ""}
            </div>
          `;
        })
        .join("");

      // Scroll to bottom to show latest messages
      debugContainer.scrollTop = debugContainer.scrollHeight;
    }
  }

  // Initialize debug system
  debug.setCallback(handleDebugMessage);
  debug.setLevel(DebugLevel.INFO);
  debug.enable();

  // Debug toggle handler
  if (debugToggle) {
    debugToggle.onchange = () => {
      updateDebugUI();
    };
  }

  // Debug level handler
  if (debugLevel) {
    debugLevel.onchange = () => {
      const level = parseInt(debugLevel.value) as DebugLevel;
      debug.setLevel(level);
      console.log("Debug level changed to:", DebugLevel[level]);
    };
  }

  // Clear debug handler
  if (clearDebugBtn) {
    clearDebugBtn.onclick = () => {
      debugMessages.length = 0;
      updateDebugUI();
    };
  }

  // Create SDK instance based on current configuration
  function createSDK(): BrowserSDK {
    const providerType = providerTypeSelect.value as "injected" | "embedded";
    const solanaProvider = solanaProviderSelect.value as "web3js" | "kit";

    const baseConfig = {
      solanaProvider: solanaProvider,
      addressTypes: [AddressType.solana, AddressType.ethereum],
      debug: {
        enabled: true,
        level: debugLevel ? (parseInt(debugLevel.value) as DebugLevel) : DebugLevel.DEBUG,
        callback: handleDebugMessage,
      },
    };

    if (providerType === "injected") {
      return new BrowserSDK({
        providerType: "injected",
        ...baseConfig,
      });
    } else {
      // For demo purposes, use hardcoded embedded config
      return new BrowserSDK({
        providerType: "embedded",
        apiBaseUrl: import.meta.env.VITE_WALLET_API || DEFAULT_WALLET_API_URL,
        organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
        embeddedWalletType: "user-wallet",
        authOptions: {
          authUrl: import.meta.env.VITE_AUTH_URL || DEFAULT_AUTH_URL,
          redirectUrl: import.meta.env.VITE_REDIRECT_URL,
        },

        ...baseConfig,
      });
    }
  }

  // Update addresses display
  function updateAddressesDisplay(addresses: any[]) {
    if (!addressesSection || !addressesList) return;

    if (addresses.length === 0) {
      addressesSection.style.display = "none";
      return;
    }

    // Show the section
    addressesSection.style.display = "block";

    // Clear existing content
    addressesList.innerHTML = "";

    // Add each address
    addresses.forEach(address => {
      const addressItem = document.createElement("div");
      addressItem.className = "address-item";
      
      const addressType = document.createElement("div");
      addressType.className = "address-type";
      addressType.textContent = address.addressType;
      
      const addressValue = document.createElement("div");
      addressValue.className = "address-value";
      addressValue.textContent = address.address;
      addressValue.title = `Click to select ${address.addressType} address`;
      
      addressItem.appendChild(addressType);
      addressItem.appendChild(addressValue);
      addressesList.appendChild(addressItem);
    });
  }

  // Update button states
  function updateButtonStates(connected: boolean) {
    if (connectBtn) connectBtn.disabled = connected;
    if (getAccountBtn) getAccountBtn.disabled = !connected;
    if (signMessageBtn) signMessageBtn.disabled = !connected;
    if (signMessageEvmBtn) signMessageEvmBtn.disabled = !connected;
    if (signTransactionBtn) signTransactionBtn.disabled = !connected;
    // Keep disconnect button always enabled for session clearing
    if (disconnectBtn) disconnectBtn.disabled = false;
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
        console.log(`Connected! Addresses: ${result.addresses.map(a => `${a.addressType}: ${a.address}`).join(", ")}`);

        // Update UI with addresses and button states
        updateAddressesDisplay(connectedAddresses);
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
        connectedAddresses = addresses;
        console.log("Current addresses:", addresses);
        
        // Update the display with refreshed addresses
        updateAddressesDisplay(addresses);
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
        const networkId = NetworkId.SOLANA_MAINNET;
        const result = await sdk.signMessage({ message, networkId });

        console.log("Message signed:", result);
        alert(
          `Message signed: ${result.signature}${result.blockExplorer ? `\n\nView on explorer: ${result.blockExplorer}` : ""}`,
        );
      } catch (error) {
        console.error("Error signing message:", error);
        alert(`Error signing message: ${(error as Error).message || error}`);
      }
    };
  }

  // Sign Message EVM button
  if (signMessageEvmBtn) {
    signMessageEvmBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        const message = "Hello from Phantom Browser SDK (EVM)!";
        const result = await sdk.signMessage({
          message,
          networkId: NetworkId.ETHEREUM_MAINNET,
        });

        console.log("EVM Message signed:", result);
        alert(
          `EVM Message signed: ${result.signature}${result.blockExplorer ? `\n\nView on explorer: ${result.blockExplorer}` : ""}`,
        );
      } catch (error) {
        console.error("Error signing EVM message:", error);
        alert(`Error signing EVM message: ${(error as Error).message || error}`);
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
    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
    console.log("Using RPC URL:", rpcUrl);
    const connection = new Connection(rpcUrl);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create a versioned transaction message
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(solanaAddress.address),
      toPubkey: new PublicKey(solanaAddress.address), // Self-transfer for demo
      lamports: 1000, // Very small amount: 0.000001 SOL
    });

    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(solanaAddress.address),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    const result = await sdk!.signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
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

    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET;
    const rpc = createSolanaRpc(rpcUrl);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(solanaAddress.address), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    const result = await sdk!.signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
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
          updateAddressesDisplay([]);
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
