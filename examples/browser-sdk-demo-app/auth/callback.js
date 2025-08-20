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

document.addEventListener("DOMContentLoaded", () => {
  console.log("Auth callback page loaded, initializing...");

  // UI Elements
  const authStatus = document.getElementById("auth-status");
  const authSuccess = document.getElementById("auth-success");
  const authError = document.getElementById("auth-error");
  const statusTitle = document.getElementById("status-title");
  const statusMessage = document.getElementById("status-message");
  const errorMessage = document.getElementById("error-message");
  const walletIdSpan = document.getElementById("wallet-id");
  const addressesList = document.getElementById("addresses-list");
  const goHomeBtn = document.getElementById("go-home-btn");
  const goHomeErrorBtn = document.getElementById("go-home-error-btn");
  const retryBtn = document.getElementById("retry-btn");

  // Debug elements
  const debugMessages = [];
  const debugContainer = document.getElementById("debugMessages");
  const debugToggle = document.getElementById("debugToggle");
  const debugLevel = document.getElementById("debugLevel");
  const clearDebugBtn = document.getElementById("clearDebugBtn");

  // Debug callback function
  function handleDebugMessage(message) {
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
      if (debugMessages.length === 0) {
        debugContainer.innerHTML = '<div class="debug-empty">No debug messages yet.</div>';
        return;
      }

      debugContainer.innerHTML = debugMessages
        .slice(-30) // Show last 30 messages
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
  debug.setLevel(DebugLevel.DEBUG);
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
      const level = parseInt(debugLevel.value);
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

  // Navigation handlers
  if (goHomeBtn) {
    goHomeBtn.onclick = () => {
      window.location.href = "/";
    };
  }

  if (goHomeErrorBtn) {
    goHomeErrorBtn.onclick = () => {
      window.location.href = "/";
    };
  }

  if (retryBtn) {
    retryBtn.onclick = () => {
      // Retry by reloading the page
      window.location.reload();
    };
  }

  // Show different states
  function showLoading(title = "Logging in...", message = "Please wait while we complete your authentication.") {
    authStatus.style.display = "block";
    authSuccess.style.display = "none";
    authError.style.display = "none";
    statusTitle.textContent = title;
    statusMessage.textContent = message;
  }

  function showSuccess(walletId, addresses) {
    authStatus.style.display = "none";
    authSuccess.style.display = "block";
    authError.style.display = "none";

    walletIdSpan.textContent = walletId || "N/A";

    if (addresses && addresses.length > 0) {
      addressesList.innerHTML = addresses
        .map(
          addr => `
          <div class="address-item">
            <span class="address-type">${addr.addressType}:</span>
            <span class="address-value">${addr.address}</span>
          </div>
        `,
        )
        .join("");
    } else {
      addressesList.innerHTML = '<div class="address-item">No addresses available</div>';
    }
  }

  function showError(error) {
    authStatus.style.display = "none";
    authSuccess.style.display = "none";
    authError.style.display = "block";
    errorMessage.textContent = error.message || "An unknown error occurred during authentication.";
  }

  // Create SDK instance
  function createSDK() {
    const baseConfig = {
      addressTypes: [AddressType.solana, AddressType.ethereum],
      debug: {
        enabled: true,
        level: debugLevel ? parseInt(debugLevel.value) : DebugLevel.DEBUG,
        callback: handleDebugMessage,
      },
    };

    // For demo purposes, use hardcoded embedded config
    return new BrowserSDK({
      providerType: "embedded",
      apiBaseUrl: import.meta.env.VITE_WALLET_API || "https://api.phantom.app/v1/wallets",
      organizationId: import.meta.env.VITE_ORGANIZATION_ID || "your-organization-id",
      embeddedWalletType: "user-wallet",
      authOptions: {
        authUrl: import.meta.env.VITE_AUTH_URL || "https://connect.phantom.app",
        redirectUrl: import.meta.env.VITE_REDIRECT_URL,
      },

      ...baseConfig,
    });
  }

  // Main authentication flow
  async function handleAuthCallback() {
    try {
      debug.info("AUTH_CALLBACK", "Starting auth callback handling");

      showLoading("Processing authentication...", "Validating your authentication and setting up your wallet.");

      // Create SDK instance
      const sdk = createSDK();
      debug.info("AUTH_CALLBACK", "SDK created, attempting to connect");

      showLoading("Connecting to wallet...", "Establishing connection with your authenticated wallet.");

      // Connect - this should resume from the redirect
      const result = await sdk.connect();

      debug.info("AUTH_CALLBACK", "Connection successful", {
        walletId: result.walletId,
        addressCount: result.addresses.length,
      });

      showSuccess(result.walletId, result.addresses);
    } catch (error) {
      console.error("Auth callback error:", error);
      debug.error("AUTH_CALLBACK", "Authentication failed", { error: error.message });
      showError(error);
    }
  }

  // Start the authentication flow
  handleAuthCallback();

  console.log("Auth callback page initialized");
});
