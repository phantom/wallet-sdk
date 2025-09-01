/* eslint-disable no-console */
/// <reference types="vite/client" />
import {
  BrowserSDK,
  AddressType,
  debug,
  DebugLevel,
  DEFAULT_AUTH_URL,
  DEFAULT_WALLET_API_URL,
  NetworkId,
} from "@phantom/browser-sdk";
import type { DebugMessage } from "@phantom/browser-sdk";
import { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { parseEther, parseGwei, numberToHex } from "viem";
import { getBalance } from "./utils/balance";
import { Buffer } from "buffer";
document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, setting up Browser SDK Demo...");

  // UI Elements
  const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
  const getAccountBtn = document.getElementById("getAccountBtn") as HTMLButtonElement;
  const signMessageBtn = document.getElementById("signMessageBtn") as HTMLButtonElement;
  const signMessageEvmBtn = document.getElementById("signMessageEvmBtn") as HTMLButtonElement;
  const signTypedDataBtn = document.getElementById("signTypedDataBtn") as HTMLButtonElement;
  const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
  const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;

  // Auto-confirm UI elements
  const autoConfirmSection = document.getElementById("autoConfirmSection") as HTMLDivElement;
  const enableAutoConfirmBtn = document.getElementById("enableAutoConfirmBtn") as HTMLButtonElement;
  const disableAutoConfirmBtn = document.getElementById("disableAutoConfirmBtn") as HTMLButtonElement;
  const getAutoConfirmStatusBtn = document.getElementById("getAutoConfirmStatusBtn") as HTMLButtonElement;
  const getSupportedChainsBtn = document.getElementById("getSupportedChainsBtn") as HTMLButtonElement;
  const chainSelect = document.getElementById("chainSelect") as HTMLSelectElement;

  // Address display elements
  const addressesSection = document.getElementById("addressesSection") as HTMLDivElement;
  const addressesList = document.getElementById("addressesList") as HTMLDivElement;

  // Balance display elements
  const balanceSection = document.getElementById("balanceSection") as HTMLDivElement;
  const balanceValue = document.getElementById("balanceValue") as HTMLSpanElement;
  const refreshBalanceBtn = document.getElementById("refreshBalanceBtn") as HTMLButtonElement;

  console.log("Found buttons:", {
    connectBtn: !!connectBtn,
    getAccountBtn: !!getAccountBtn,
    signMessageBtn: !!signMessageBtn,
    signMessageEvmBtn: !!signMessageEvmBtn,
    signTypedDataBtn: !!signTypedDataBtn,
    signTransactionBtn: !!signTransactionBtn,
    disconnectBtn: !!disconnectBtn,
  });

  // Get configuration UI elements
  const providerTypeSelect = document.getElementById("providerType") as HTMLSelectElement;
  const testWeb3jsBtn = document.getElementById("testWeb3jsBtn") as HTMLButtonElement;
  const testEthereumBtn = document.getElementById("testEthereumBtn") as HTMLButtonElement;

  let connectedAddresses: any[] = [];
  let currentBalance: number | null = null;

  // Debug message storage
  const debugMessages: DebugMessage[] = [];
  const debugContainer = document.getElementById("debugMessages") as HTMLDivElement;
  const debugToggle = document.getElementById("debugToggle") as HTMLInputElement;
  const debugLevel = document.getElementById("debugLevel") as HTMLSelectElement;
  const clearDebugBtn = document.getElementById("clearDebugBtn") as HTMLButtonElement;

  // Instantiate SDK , it will autoconnect
  let sdk: BrowserSDK | null = createSDK();

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
      // Clear existing content safely
      debugContainer.replaceChildren();

      const messages = debugMessages.slice(-30); // Show last 30 messages for the larger container

      messages.forEach(msg => {
        const levelClass = DebugLevel[msg.level].toLowerCase();
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        const dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : "";

        const messageDiv = document.createElement("div");
        messageDiv.className = `debug-message debug-${levelClass}`;

        const headerDiv = document.createElement("div");
        headerDiv.className = "debug-header";

        const timestampSpan = document.createElement("span");
        timestampSpan.className = "debug-timestamp";
        timestampSpan.textContent = timestamp;

        const levelSpan = document.createElement("span");
        levelSpan.className = "debug-level";
        levelSpan.textContent = DebugLevel[msg.level];

        const categorySpan = document.createElement("span");
        categorySpan.className = "debug-category";
        categorySpan.textContent = msg.category;

        headerDiv.appendChild(timestampSpan);
        headerDiv.appendChild(levelSpan);
        headerDiv.appendChild(categorySpan);

        const contentDiv = document.createElement("div");
        contentDiv.className = "debug-content";
        contentDiv.textContent = msg.message;

        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);

        if (dataStr) {
          const dataPre = document.createElement("pre");
          dataPre.className = "debug-data";
          dataPre.textContent = dataStr;
          messageDiv.appendChild(dataPre);
        }

        debugContainer.appendChild(messageDiv);
      });

      // Scroll to bottom to show latest messages
      debugContainer.scrollTop = debugContainer.scrollHeight;
    }
  }

  // Debug toggle handler
  if (debugToggle) {
    debugToggle.onchange = () => {
      updateDebugUI();
    };
  }

  // Debug level handler - now uses direct debug API instead of recreating SDK
  if (debugLevel) {
    debugLevel.onchange = () => {
      const level = parseInt(debugLevel.value) as DebugLevel;
      debug.setLevel(level);
      console.log("Debug level changed to:", DebugLevel[level]);
      // Note: No SDK reinstantiation needed - debug config is separate now
    };
  }

  // Clear debug handler
  if (clearDebugBtn) {
    clearDebugBtn.onclick = () => {
      debugMessages.length = 0;
      updateDebugUI();
    };
  }

  // Provider type change handler
  if (providerTypeSelect) {
    providerTypeSelect.onchange = () => {
      console.log("Provider type changed to:", providerTypeSelect.value);
      // Disconnect current SDK if connected
      if (sdk) {
        sdk.disconnect().catch(console.error);
        connectedAddresses = [];
        currentBalance = null;
        updateAddressesDisplay([]);
        if (balanceSection) balanceSection.style.display = "none";
        updateButtonStates(false);
      }
      // Create new SDK with new provider type
      sdk = createSDK();
      console.log("SDK reinstantiated with provider type:", providerTypeSelect.value);
    };
  }

  // Create SDK instance based on current configuration
  function createSDK(): BrowserSDK {
    const providerType = providerTypeSelect.value as "injected" | "embedded";

    // Set debug config
    debug.enable();
    debug.setLevel(DebugLevel.DEBUG);
    debug.setCallback(handleDebugMessage);

    if (providerType === "injected") {
      return new BrowserSDK({
        providerType: "injected",
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
        appName: "Phantom Browser SDK Demo",
        appLogo: "https://picsum.photos/200", // Optional app logo URL
      });
    } else {
      // For demo purposes, use hardcoded embedded config
      const embeddedSdk = new BrowserSDK({
        providerType: "embedded",
        apiBaseUrl: import.meta.env.VITE_WALLET_API || DEFAULT_WALLET_API_URL,
        organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
        appId: import.meta.env.VITE_APP_ID || "your-app-id",
        embeddedWalletType: "user-wallet",
        authOptions: {
          authUrl: import.meta.env.VITE_AUTH_URL || DEFAULT_AUTH_URL,
        },
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
        appName: "Phantom Browser SDK Demo",
        appLogo: "https://picsum.photos/200", // Optional app logo URL
      });

      embeddedSdk.on("connect_start", data => {
        console.log("Embedded SDK connect started:", data);
        // Could show loading state here
      });

      embeddedSdk.on("connect", () => {
        console.log("Embedded SDK connected:", embeddedSdk.getAddresses());
        updateAddressesDisplay(embeddedSdk.getAddresses());
        updateBalanceDisplay();
        updateButtonStates(true);
      });

      embeddedSdk.on("connect_error", data => {
        console.log("Embedded SDK connect error:", data);
        // Could show error state here
      });

      embeddedSdk.on("disconnect", () => {
        console.log("Embedded SDK disconnected");
        connectedAddresses = [];
        currentBalance = null;
        updateAddressesDisplay([]);
        if (balanceSection) balanceSection.style.display = "none";
        updateButtonStates(false);
      });

      embeddedSdk.autoConnect();

      // Note: autoConnect is already enabled via config.autoConnect: true
      // No need to call embeddedSdk.autoConnect() manually

      return embeddedSdk;
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

    // Clear existing content safely
    addressesList.replaceChildren();

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

  // Update balance display
  async function updateBalanceDisplay() {
    if (!balanceSection || !balanceValue) return;

    const solanaAddress = connectedAddresses.find(a => a.addressType === AddressType.solana);
    if (!solanaAddress) {
      balanceSection.style.display = "none";
      return;
    }

    balanceSection.style.display = "block";
    balanceValue.textContent = "Loading...";

    try {
      const result = await getBalance(solanaAddress.address);
      if (result.error) {
        balanceValue.textContent = "Error";
        console.error("Balance error:", result.error);
      } else {
        currentBalance = result.balance;
        balanceValue.textContent = result.balance ? result.balance.toFixed(4) : "0";
      }
    } catch (error) {
      balanceValue.textContent = "Error";
      console.error("Failed to fetch balance:", error);
    }
  }

  // Update button states
  function updateButtonStates(connected: boolean) {
    const hasBalance = currentBalance !== null && currentBalance > 0;
    const isInjected = providerTypeSelect.value === "injected";

    if (connectBtn) connectBtn.disabled = connected;
    if (getAccountBtn) getAccountBtn.disabled = !connected;
    if (signMessageBtn) signMessageBtn.disabled = !connected;
    if (signMessageEvmBtn) signMessageEvmBtn.disabled = !connected;
    if (signTypedDataBtn) signTypedDataBtn.disabled = !connected;
    if (signTransactionBtn) signTransactionBtn.disabled = !connected || !hasBalance;
    // Keep disconnect button always enabled for session clearing
    if (disconnectBtn) disconnectBtn.disabled = false;
    if (testWeb3jsBtn) testWeb3jsBtn.disabled = !connected || !hasBalance;
    if (testEthereumBtn) testEthereumBtn.disabled = !connected || !hasBalance;

    // Auto-confirm buttons (only for injected provider)
    if (autoConfirmSection) {
      autoConfirmSection.style.display = isInjected ? "block" : "none";
    }
    if (enableAutoConfirmBtn) enableAutoConfirmBtn.disabled = !connected || !isInjected;
    if (disableAutoConfirmBtn) disableAutoConfirmBtn.disabled = !connected || !isInjected;
    if (getAutoConfirmStatusBtn) getAutoConfirmStatusBtn.disabled = !connected || !isInjected;
    if (getSupportedChainsBtn) getSupportedChainsBtn.disabled = !connected || !isInjected;
  }

  // Connect button
  if (connectBtn) {
    connectBtn.onclick = async () => {
      try {
        if (!sdk) {
          sdk = createSDK();
        }
        const result = await sdk.connect();
        connectedAddresses = result.addresses;

        console.log("Connected successfully:", result);
        console.log(`Connected! Addresses: ${result.addresses.map(a => `${a.addressType}: ${a.address}`).join(", ")}`);

        // Update UI with addresses and button states
        updateAddressesDisplay(connectedAddresses);
        await updateBalanceDisplay();
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
        await updateBalanceDisplay();
        updateButtonStates(true);
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
        const result = await sdk.solana.signMessage(message);

        console.log("Message signed:", result);
        alert(`Message signed: ${result.signature}`);
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

        const ethAddress = connectedAddresses.find(a => a.addressType === AddressType.ethereum);
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }

        const message = "Hello from Phantom Browser SDK (EVM)!";
        console.log("GOING TO SIGN", message, ethAddress.address);
        const prefixedMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
        console.log("Signing", prefixedMessage, ethAddress.address);
        const result = await sdk.ethereum.signPersonalMessage(prefixedMessage, ethAddress.address);

        console.log("EVM Message signed:", result);
        alert(`EVM Message signed: ${result}`);
      } catch (error) {
        console.error("Error signing EVM message:", error);
        alert(`Error signing EVM message: ${(error as Error).message || error}`);
      }
    };
  }

  // Sign Typed Data EVM button
  if (signTypedDataBtn) {
    signTypedDataBtn.onclick = async () => {
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

        // Example typed data structure (EIP-712)
        const typedData = {
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" }
            ],
            Person: [
              { name: "name", type: "string" },
              { name: "wallet", type: "address" }
            ],
            Mail: [
              { name: "from", type: "Person" },
              { name: "to", type: "Person" },
              { name: "contents", type: "string" }
            ]
          },
          primaryType: "Mail",
          domain: {
            name: "Ether Mail",
            version: "1",
            chainId: 1,
            verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
          },
          message: {
            from: {
              name: "Cow",
              wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
            },
            to: {
              name: "Bob",
              wallet: ethAddress.address
            },
            contents: "Hello, Bob! This is a typed data message from Phantom Browser SDK."
          }
        };

        console.log("Signing typed data:", typedData);
        const result = await sdk.ethereum.signTypedData(typedData, ethAddress.address);

        console.log("Typed data signed:", result);
        alert(`Typed data signed: ${result}`);
      } catch (error) {
        console.error("Error signing typed data:", error);
        alert(`Error signing typed data: ${(error as Error).message || error}`);
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

        // Use web3js for transaction
        await testWeb3jsTransaction();
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

    const result = await sdk!.solana.signAndSendTransaction(transaction);

    console.log("Transaction sent (web3.js):", result);
    alert(`Transaction sent: ${result.signature}`);
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

        // Create simple ETH transfer with proper hex formatting
        const transactionParams = {
          from: ethAddress.address,
          to: ethAddress.address, // Self-transfer for demo
          value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
          gas: numberToHex(21000n), // Gas limit in hex
          gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
        };

        console.log("Sending Ethereum transaction with params:", transactionParams);
        const result = await sdk.ethereum.sendTransaction(transactionParams);

        console.log("Ethereum transaction sent:", result);
        alert(`Ethereum transaction sent: ${result}`);
      } catch (error) {
        console.error("Error with Ethereum transaction:", error);
        alert(`Error with Ethereum transaction: ${(error as Error).message || error}`);
      }
    };
  }

  // Refresh Balance button
  if (refreshBalanceBtn) {
    refreshBalanceBtn.onclick = async () => {
      await updateBalanceDisplay();
      updateButtonStates(true);
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
          currentBalance = null;
          alert("Disconnected successfully");
          updateAddressesDisplay([]);
          if (balanceSection) balanceSection.style.display = "none";
          updateButtonStates(false);
        }
      } catch (error) {
        console.error("Error disconnecting:", error);
        alert(`Error disconnecting: ${(error as Error).message || error}`);
      }
    };
  }

  // Helper function to get selected chains from the select element
  function getSelectedChains(): NetworkId[] {
    if (!chainSelect) return [];

    const selected = Array.from(chainSelect.selectedOptions);
    return selected.map(option => NetworkId[option.value as keyof typeof NetworkId]).filter(Boolean);
  }

  // Enable Auto-Confirm button
  if (enableAutoConfirmBtn) {
    enableAutoConfirmBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        if (providerTypeSelect.value !== "injected") {
          alert("Auto-confirm is only available for injected provider");
          return;
        }

        const selectedChains = getSelectedChains();
        const params = selectedChains.length > 0 ? { chains: selectedChains } : {};
        const result = await sdk.enableAutoConfirm(params);

        console.log("Auto-confirm enabled:", result);
        alert(`Auto-confirm enabled: ${result.enabled}\nChains: ${result.chains.join(", ")}`);
      } catch (error) {
        console.error("Error enabling auto-confirm:", error);
        alert(`Error enabling auto-confirm: ${(error as Error).message || error}`);
      }
    };
  }

  // Disable Auto-Confirm button
  if (disableAutoConfirmBtn) {
    disableAutoConfirmBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        if (providerTypeSelect.value !== "injected") {
          alert("Auto-confirm is only available for injected provider");
          return;
        }

        await sdk.disableAutoConfirm();
        console.log("Auto-confirm disabled successfully");
        alert("Auto-confirm disabled successfully");
      } catch (error) {
        console.error("Error disabling auto-confirm:", error);
        alert(`Error disabling auto-confirm: ${(error as Error).message || error}`);
      }
    };
  }

  // Get Auto-Confirm Status button
  if (getAutoConfirmStatusBtn) {
    getAutoConfirmStatusBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        if (providerTypeSelect.value !== "injected") {
          alert("Auto-confirm is only available for injected provider");
          return;
        }

        const status = await sdk.getAutoConfirmStatus();
        console.log("Auto-confirm status:", status);
        alert(`Auto-confirm status:\nEnabled: ${status.enabled}\nChains: ${status.chains.join(", ")}`);
      } catch (error) {
        console.error("Error getting auto-confirm status:", error);
        alert(`Error getting auto-confirm status: ${(error as Error).message || error}`);
      }
    };
  }

  // Get Supported Chains button
  if (getSupportedChainsBtn) {
    getSupportedChainsBtn.onclick = async () => {
      try {
        if (!sdk) {
          alert("Please connect first");
          return;
        }

        if (providerTypeSelect.value !== "injected") {
          alert("Auto-confirm is only available for injected provider");
          return;
        }

        const supportedChains = await sdk.getSupportedAutoConfirmChains();
        console.log("Supported auto-confirm chains:", supportedChains);
        alert(`Supported chains for auto-confirm:\n${supportedChains.chains.join(", ")}`);
      } catch (error) {
        console.error("Error getting supported chains:", error);
        alert(`Error getting supported chains: ${(error as Error).message || error}`);
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
