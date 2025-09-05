import { BrowserSDK } from "@phantom/browser-sdk";
import { AddressType } from "@phantom/browser-sdk";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Global variables
let sdk: BrowserSDK | null = null;
let isConnected = false;

// DOM elements
const statusText = document.getElementById("statusText") as HTMLSpanElement;
const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
const getAddressesBtn = document.getElementById("getAddressesBtn") as HTMLButtonElement;
const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;
const signMessageBtn = document.getElementById("signMessageBtn") as HTMLButtonElement;
const signTransactionBtn = document.getElementById("signTransactionBtn") as HTMLButtonElement;
const signAndSendBtn = document.getElementById("signAndSendBtn") as HTMLButtonElement;
const customSignMessageBtn = document.getElementById("customSignMessageBtn") as HTMLButtonElement;
const messageInput = document.getElementById("messageInput") as HTMLTextAreaElement;
const addressesSection = document.getElementById("addressesSection") as HTMLDivElement;
const addressesList = document.getElementById("addressesList") as HTMLDivElement;
const debugToggle = document.getElementById("debugToggle") as HTMLInputElement;
const debugLevel = document.getElementById("debugLevel") as HTMLSelectElement;
const clearDebugBtn = document.getElementById("clearDebugBtn") as HTMLButtonElement;
const debugMessages = document.getElementById("debugMessages") as HTMLDivElement;
const lastResultContent = document.getElementById("lastResultContent") as HTMLPreElement;

// Initialize SDK
function initializeSDK() {
  try {
    addDebugMessage("⚡ Initializing Deeplinks SDK...");
    
    sdk = new BrowserSDK({
      providerType: "deeplinks",
      addressTypes: [AddressType.solana],
    });

    addDebugMessage("⚡ BrowserSDK created, setting up events...");

    // Configure debug settings
    sdk.configureDebug({
      enabled: debugToggle.checked,
      level: parseInt(debugLevel.value) as any,
      callback: (debugMsg) => {
        if (debugToggle.checked) {
          addDebugMessage(`[${debugMsg.category}] ${debugMsg.message}${debugMsg.data ? ` - ${JSON.stringify(debugMsg.data)}` : ''}`);
        }
      },
    });

    // Set up event listeners
    sdk.on("connect_start", (data) => {
      addDebugMessage(`Connect started: ${JSON.stringify(data)}`);
      updateStatus("Connecting...", "connecting");
    });

    sdk.on("connect", (data) => {
      addDebugMessage(`Connected: ${JSON.stringify(data)}`);
      onConnected();
    });

    sdk.on("connect_error", (data) => {
      addDebugMessage(`Connect error: ${JSON.stringify(data)}`);
      updateStatus("Connection failed", "error");
    });

    sdk.on("disconnect", (data) => {
      addDebugMessage(`Disconnected: ${JSON.stringify(data)}`);
      onDisconnected();
    });

    addDebugMessage("Deeplinks SDK initialized successfully");
    addDebugMessage("✅ Deeplinks SDK initialized successfully!");
  } catch (error) {
    addDebugMessage(`Failed to initialize SDK: ${error}`);
    updateLastResult({ error: `Failed to initialize SDK: ${error}` });
  }
}

// Update connection status
function updateStatus(text: string, state: "connected" | "connecting" | "disconnected" | "error" = "disconnected") {
  statusText.textContent = text;
  statusText.className = `status-${state}`;
}

// Handle successful connection
function onConnected() {
  isConnected = true;
  updateStatus("Connected via Deeplinks", "connected");
  
  // Enable buttons
  getAddressesBtn.disabled = false;
  disconnectBtn.disabled = false;
  signMessageBtn.disabled = false;
  signTransactionBtn.disabled = false;
  signAndSendBtn.disabled = false;
  customSignMessageBtn.disabled = false;
  
  // Disable connect button
  connectBtn.disabled = true;
  
  // Show addresses
  displayAddresses();
}

// Handle disconnection
function onDisconnected() {
  isConnected = false;
  updateStatus("Not Connected", "disconnected");
  
  // Disable buttons
  getAddressesBtn.disabled = true;
  disconnectBtn.disabled = true;
  signMessageBtn.disabled = true;
  signTransactionBtn.disabled = true;
  signAndSendBtn.disabled = true;
  customSignMessageBtn.disabled = true;
  
  // Enable connect button
  connectBtn.disabled = false;
  
  // Hide addresses
  addressesSection.style.display = "none";
  addressesList.innerHTML = "";
}

// Display connected addresses
function displayAddresses() {
  if (!sdk) return;
  
  try {
    const addresses = sdk.getAddresses();
    if (addresses.length > 0) {
      addressesSection.style.display = "block";
      addressesList.innerHTML = "";
      
      addresses.forEach(addr => {
        const addressDiv = document.createElement("div");
        addressDiv.className = "address-item";
        addressDiv.innerHTML = `
          <div class="address-type">${addr.addressType}</div>
          <div class="address-value">${addr.address}</div>
        `;
        addressesList.appendChild(addressDiv);
      });
    }
  } catch (error) {
    addDebugMessage(`Error displaying addresses: ${error}`);
  }
}

// Add debug message to console
function addDebugMessage(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const messageDiv = document.createElement("div");
  messageDiv.className = "debug-message";
  messageDiv.textContent = `[${timestamp}] ${message}`;
  debugMessages.appendChild(messageDiv);
  debugMessages.scrollTop = debugMessages.scrollHeight;
}

// Update last result display
function updateLastResult(result: any) {
  lastResultContent.textContent = JSON.stringify(result, null, 2);
}

// Create a simple Solana transaction
async function createSimpleTransaction(): Promise<Transaction> {
  if (!sdk || !isConnected) {
    throw new Error("Not connected");
  }

  const addresses = sdk.getAddresses();
  const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);
  
  if (!solanaAddress) {
    throw new Error("No Solana address found");
  }

  const connection = new Connection("https://api.devnet.solana.com");
  const fromPubkey = new PublicKey(solanaAddress.address);
  
  // Create a simple transfer transaction (0.01 SOL to self)
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: fromPubkey, // Send to self
      lamports: 0.01 * LAMPORTS_PER_SOL,
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  return transaction;
}

// Event handlers
connectBtn.addEventListener("click", async () => {
  addDebugMessage("🚀 Connect button clicked!");
  
  if (!sdk) {
    addDebugMessage("SDK not initialized");
    return;
  }

  try {
    updateStatus("Connecting...", "connecting");
    addDebugMessage("🚀 Calling sdk.connect()...");
    
    const result = await sdk.connect();
    
    updateLastResult(result);
    addDebugMessage("Connect successful");
  } catch (error) {
    addDebugMessage(`Connect failed: ${error}`);
    updateLastResult({ error: `Connect failed: ${error}` });
    updateStatus("Connection failed", "error");
  }
});

getAddressesBtn.addEventListener("click", () => {
  if (!sdk) return;
  
  try {
    const addresses = sdk.getAddresses();
    updateLastResult({ addresses });
    displayAddresses();
    addDebugMessage(`Got ${addresses.length} addresses`);
  } catch (error) {
    addDebugMessage(`Error getting addresses: ${error}`);
    updateLastResult({ error: `Error getting addresses: ${error}` });
  }
});

disconnectBtn.addEventListener("click", async () => {
  if (!sdk) return;
  
  try {
    await sdk.disconnect();
    updateLastResult({ message: "Disconnected successfully" });
    addDebugMessage("Disconnect successful");
  } catch (error) {
    addDebugMessage(`Disconnect failed: ${error}`);
    updateLastResult({ error: `Disconnect failed: ${error}` });
  }
});

signMessageBtn.addEventListener("click", async () => {
  if (!sdk) return;
  
  try {
    const message = "Hello from Phantom Deeplinks Demo!";
    const result = await sdk.solana.signMessage(message);
    updateLastResult({ message, signature: result });
    addDebugMessage("Message signed successfully");
  } catch (error) {
    addDebugMessage(`Sign message failed: ${error}`);
    updateLastResult({ error: `Sign message failed: ${error}` });
  }
});

customSignMessageBtn.addEventListener("click", async () => {
  if (!sdk) return;
  
  const message = messageInput.value.trim();
  if (!message) {
    addDebugMessage("Please enter a message to sign");
    return;
  }
  
  try {
    const result = await sdk.solana.signMessage(message);
    updateLastResult({ message, signature: result });
    addDebugMessage("Custom message signed successfully");
  } catch (error) {
    addDebugMessage(`Sign custom message failed: ${error}`);
    updateLastResult({ error: `Sign custom message failed: ${error}` });
  }
});

signTransactionBtn.addEventListener("click", async () => {
  if (!sdk) return;
  
  try {
    const transaction = await createSimpleTransaction();
    const result = await sdk.solana.signTransaction(transaction);
    updateLastResult({ 
      message: "Transaction signed (not sent)", 
      transactionSigned: true,
      result
    });
    addDebugMessage("Transaction signed successfully");
  } catch (error) {
    addDebugMessage(`Sign transaction failed: ${error}`);
    updateLastResult({ error: `Sign transaction failed: ${error}` });
  }
});

signAndSendBtn.addEventListener("click", async () => {
  if (!sdk) return;
  
  try {
    const transaction = await createSimpleTransaction();
    const result = await sdk.solana.signAndSendTransaction(transaction);
    updateLastResult({ 
      message: "Transaction signed and sent", 
      signature: result.signature 
    });
    addDebugMessage(`Transaction sent with signature: ${result.signature}`);
  } catch (error) {
    addDebugMessage(`Sign and send transaction failed: ${error}`);
    updateLastResult({ error: `Sign and send transaction failed: ${error}` });
  }
});

// Debug controls
debugToggle.addEventListener("change", () => {
  if (sdk) {
    sdk.configureDebug({ enabled: debugToggle.checked });
  }
});

debugLevel.addEventListener("change", () => {
  if (sdk) {
    sdk.configureDebug({ level: parseInt(debugLevel.value) as any });
  }
});

clearDebugBtn.addEventListener("click", () => {
  debugMessages.innerHTML = "";
});

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeSDK();
  addDebugMessage("Phantom Deeplinks Demo loaded");
});