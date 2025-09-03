import type {
  Provider,
  ConnectResult,
  WalletAddress,
  AuthOptions,
} from "../../types";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { AddressType } from "@phantom/client";
import { debug, DebugCategory } from "../../debug";
import type { ISolanaChain, IEthereumChain } from "@phantom/chains";

import { getOrCreateKeypair, encryptPayload, publicKeyToBase58, base58ToPublicKey, createSharedSecret } from "./crypto";
import { saveSession, loadSession, clearSession, hasValidSession, initializeSessionStorage, type DeeplinksSession } from "./session";
import { DeeplinksCommunicator } from "./communication";
import { DeeplinksSolanaChain } from "./chains/SolanaChain";
import { DeeplinksEthereumChain } from "./chains/EthereumChain";

interface DeeplinksProviderConfig {
  addressTypes: [AddressType, ...AddressType[]];
}

export class DeeplinksProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];
  private addressTypes: [AddressType, ...AddressType[]];
  private session: DeeplinksSession;
  private communicator: DeeplinksCommunicator;

  // Chain instances
  private _solanaChain?: ISolanaChain;
  private _ethereumChain?: IEthereumChain;

  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();

  constructor(config: DeeplinksProviderConfig) {
    debug.log(DebugCategory.BROWSER_SDK, "Initializing DeeplinksProvider", { config });

    this.addressTypes = config.addressTypes;

    // Initialize with temporary session - will be replaced after async initialization
    // Use a placeholder keypair that will be replaced by secure storage
    this.session = {
      keyPair: { publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) },
    };

    // Create communicator
    this.communicator = new DeeplinksCommunicator(this.session);

    // Create chain instances
    if (this.addressTypes.includes(AddressType.solana)) {
      this._solanaChain = new DeeplinksSolanaChain(this.session, this.communicator);
      debug.log(DebugCategory.BROWSER_SDK, "Solana chain created for deeplinks");
    }

    if (this.addressTypes.includes(AddressType.ethereum)) {
      this._ethereumChain = new DeeplinksEthereumChain();
      debug.log(DebugCategory.BROWSER_SDK, "Ethereum chain created for deeplinks (not yet supported)");
    }

    debug.info(DebugCategory.BROWSER_SDK, "DeeplinksProvider initialized", {
      addressTypes: this.addressTypes,
    });

    // ⚠️ KEY FIX: Start async initialization immediately
    // This ensures we load saved sessions and set up response handling
    this.initializeAsync();
  }

  /**
   * Async initialization - loads saved session and starts response handling
   */
  private async initializeAsync(): Promise<void> {
    try {
      // eslint-disable-next-line no-console
      console.log("🔧 ASYNC: Starting async initialization");
      alert("🔧 Starting async initialization");

      // Initialize secure storage
      await initializeSessionStorage();

      // Load or create secure keypair from IndexedDB
      const keyPair = await getOrCreateKeypair();
      this.session.keyPair = keyPair;
      
      // eslint-disable-next-line no-console
      console.log("🔧 ASYNC: Loaded/created secure keypair");
      alert("🔧 Keypair loaded from secure storage");

      // Try to load existing session data (non-sensitive)
      const existingSession = await loadSession();
      if (existingSession) {
        // eslint-disable-next-line no-console
        console.log("🔧 ASYNC: Loaded existing session from storage");
        alert("🔧 Found existing session in storage");
        
        this.session = existingSession;
        
        // If we have a complete session, try to restore connection
        if (hasValidSession(existingSession)) {
          this.addresses = [{
            addressType: AddressType.solana,
            address: existingSession.publicKey!,
          }];
          this.connected = true;
          
          // eslint-disable-next-line no-console
          console.log("🔧 ASYNC: Restored connection from session");
          alert("🔧 Auto-connected from saved session!");
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("🔧 ASYNC: No existing session, using secure keypair");
        alert("🔧 Using secure keypair for new session");
      }

      // Start response handling
      this.initializeResponseHandling();
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("🔧 ASYNC: Failed async initialization:", error);
      alert("🔧 Async init failed: " + (error as Error).message);
      
      // Still start response handling with current session
      this.initializeResponseHandling();
    }
  }

  /**
   * Initialize response handling immediately on provider creation
   */
  private initializeResponseHandling(): void {
    // eslint-disable-next-line no-console
    console.log("🔧 DEEPLINKS: Initializing response handling");
    alert("🔧 Starting response detection immediately");

    // Start listening for responses immediately
    this.communicator.startListening();

    // Check if we're in a response tab with parameters
    this.checkForResponseInCurrentUrl();
  }

  /**
   * Check if current URL contains response parameters
   */
  private checkForResponseInCurrentUrl(): void {
    const currentUrl = window.location.href;
    const hasResponseParams = currentUrl.includes('phantom_encryption_public_key') || 
                             currentUrl.includes('phantom_response') ||
                             currentUrl.includes('#phantom_response');
    
    if (hasResponseParams) {
      // eslint-disable-next-line no-console
      console.log("🔧 DEEPLINKS: Found response params in current URL", currentUrl);
      alert("🔧 Found response parameters in current URL!");
      
      // Force check the current URL for responses
      this.communicator.forceCheckCurrentUrl();
    } else {
      // eslint-disable-next-line no-console
      console.log("🔧 DEEPLINKS: No response params in current URL", currentUrl);
    }
  }

  /**
   * Access to Solana chain operations
   */
  get solana(): ISolanaChain {
    if (!this.addressTypes.includes(AddressType.solana)) {
      throw new Error('Solana not enabled for this provider');
    }
    if (!this._solanaChain) {
      throw new Error('Solana chain not initialized');
    }
    return this._solanaChain;
  }

  /**
   * Access to Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    if (!this.addressTypes.includes(AddressType.ethereum)) {
      throw new Error('Ethereum not enabled for this provider');
    }
    if (!this._ethereumChain) {
      throw new Error('Ethereum chain not initialized');
    }
    return this._ethereumChain;
  }

  async connect(_authOptions?: AuthOptions): Promise<ConnectResult> {
    // eslint-disable-next-line no-console
    console.log("🔗 DEEPLINKS: Starting connect");
    alert("🔗 Starting deeplinks connect");
    
    debug.info(DebugCategory.BROWSER_SDK, "Starting deeplinks connect", {
      addressTypes: this.addressTypes,
      hasValidSession: hasValidSession(this.session),
    });

    // Emit connect_start event
    this.emit("connect_start", {
      source: "deeplinks-connect",
      providerType: "deeplinks",
    });

    try {
      // Check if we already have a valid session
      if (hasValidSession(this.session) && this.session.publicKey) {
        // eslint-disable-next-line no-console
        console.log("🔗 DEEPLINKS: Using existing session", this.session.publicKey);
        alert("🔗 Using existing session: " + this.session.publicKey.substring(0, 8) + "...");
        
        debug.log(DebugCategory.BROWSER_SDK, "Using existing deeplinks session");
        
        this.addresses = [{
          addressType: AddressType.solana,
          address: this.session.publicKey,
        }];
        this.connected = true;

        const result = {
          addresses: this.addresses,
          status: "completed" as const,
        };

        this.emit("connect", {
          addresses: this.addresses,
          source: "deeplinks-existing-session",
        });

        return result;
      }

      // Start fresh connection
      const requestId = this.communicator.generateRequestId();
      
      // Build connect deeplink URL
      const url = this.buildConnectUrl(requestId);
      
      // eslint-disable-next-line no-console
      console.log("🔗 DEEPLINKS: Generated URL", { requestId, url });
      alert("🔗 Opening Phantom with URL: " + url.substring(0, 50) + "...");
      
      debug.log(DebugCategory.BROWSER_SDK, "Opening Phantom for connection", { url });
      
      // Navigate to deeplink
      window.location.href = url;
      
      // eslint-disable-next-line no-console
      console.log("🔗 DEEPLINKS: Waiting for response, requestId:", requestId);
      
      // Wait for response
      const response = await this.communicator.waitForResponse<{
        public_key: string;
        session: string;
        phantom_encryption_public_key?: string;
      }>(requestId, 60000); // 60 second timeout for connect

      // eslint-disable-next-line no-console
      console.log("🔗 DEEPLINKS: Received response", response);
      alert("🔗 Got response from Phantom!");

      // Update session with response
      this.session.sessionToken = response.session;
      this.session.publicKey = response.public_key;
      
      // If we received Phantom's public key, create shared secret
      let phantomEncryptionKey: string | undefined;
      if (response.phantom_encryption_public_key) {
        // eslint-disable-next-line no-console
        console.log("🔗 DEEPLINKS: Creating shared secret");
        phantomEncryptionKey = response.phantom_encryption_public_key;
        const phantomPublicKey = base58ToPublicKey(phantomEncryptionKey);
        this.session.sharedSecret = createSharedSecret(this.session.keyPair.secretKey, phantomPublicKey);
      }
      
      // Save session with Phantom's encryption key for future shared secret regeneration
      await saveSession(this.session, phantomEncryptionKey);
      // eslint-disable-next-line no-console
      console.log("🔗 DEEPLINKS: Session saved", this.session);

      // Update internal state
      this.addresses = [{
        addressType: AddressType.solana,
        address: response.public_key,
      }];
      this.connected = true;

      // Clean URL
      this.communicator.cleanUrl();

      const result = {
        addresses: this.addresses,
        status: "completed" as const,
      };

      this.emit("connect", {
        addresses: this.addresses,
        source: "deeplinks-new-session",
      });

      // eslint-disable-next-line no-console
      console.log("🔗 DEEPLINKS: Connect successful!", result);
      alert("🔗 Connect successful! Address: " + response.public_key.substring(0, 8) + "...");

      debug.info(DebugCategory.BROWSER_SDK, "Deeplinks connect successful", {
        publicKey: response.public_key,
        hasSession: !!response.session,
      });

      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("🔗 DEEPLINKS: Connect failed", error);
      alert("🔗 Connect failed: " + (error as Error).message);
      
      debug.error(DebugCategory.BROWSER_SDK, "Deeplinks connect failed", { error: (error as Error).message });
      
      this.emit("connect_error", {
        error: (error as Error).message,
        source: "deeplinks-connect",
      });
      
      throw error;
    }
  }

  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        debug.info(DebugCategory.BROWSER_SDK, "Starting deeplinks disconnect");
      // If we have a session, send disconnect deeplink
      if (hasValidSession(this.session)) {
        const requestId = this.communicator.generateRequestId();
        const url = this.buildDisconnectUrl(requestId);
        
        // Navigate to disconnect (optional - Phantom may not require this)
        window.location.href = url;
        
        // Don't wait for response for disconnect - it's fire and forget
      }

      // Clear session and state
      clearSession();
      this.session = {
        keyPair: generateKeypair(),
      };
      
      this.connected = false;
      this.addresses = [];

      // Stop listening for responses
      this.communicator.stopListening();

      this.emit("disconnect", {
        source: "deeplinks-disconnect",
      });

      debug.info(DebugCategory.BROWSER_SDK, "Deeplinks disconnect successful");
        resolve();
      } catch (error) {
        debug.error(DebugCategory.BROWSER_SDK, "Deeplinks disconnect failed", { error: (error as Error).message });
        reject(error);
      }
    });
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Event management methods
  on(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.BROWSER_SDK, "Adding deeplinks event listener", { event });

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.BROWSER_SDK, "Removing deeplinks event listener", { event });

    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
      if (this.eventListeners.get(event)!.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: EmbeddedProviderEvent, data?: any): void {
    debug.log(DebugCategory.BROWSER_SDK, "Emitting deeplinks event", {
      event,
      listenerCount: this.eventListeners.get(event)?.size || 0,
      data
    });

    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.size > 0) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          debug.error(DebugCategory.BROWSER_SDK, "Deeplinks event callback error", { event, error });
        }
      });
    }
  }

  /**
   * Build connect deeplink URL
   */
  private buildConnectUrl(requestId: string): string {
    const baseUrl = "https://phantom.app/ul/v1/connect";
    const url = new URL(baseUrl);
    
    // Required parameters
    url.searchParams.set("dapp_encryption_public_key", publicKeyToBase58(this.session.keyPair.publicKey));
    url.searchParams.set("redirect_link", `${window.location.origin}${window.location.pathname}#phantom_response`);
    url.searchParams.set("app_url", window.location.origin);
    url.searchParams.set("request_id", requestId);
    
    // Optional cluster (default to mainnet-beta)
    url.searchParams.set("cluster", "mainnet-beta");
    
    return url.toString();
  }

  /**
   * Build disconnect deeplink URL
   */
  private buildDisconnectUrl(requestId: string): string {
    const baseUrl = "https://phantom.app/ul/v1/disconnect";
    const url = new URL(baseUrl);
    
    // Required parameters
    url.searchParams.set("dapp_encryption_public_key", publicKeyToBase58(this.session.keyPair.publicKey));
    url.searchParams.set("redirect_link", `${window.location.origin}${window.location.pathname}#phantom_response`);
    url.searchParams.set("app_url", window.location.origin);
    url.searchParams.set("request_id", requestId);
    
    // Add session if available
    if (this.session.sessionToken && this.session.sharedSecret) {
      const payload = {
        session: this.session.sessionToken,
      };
      
      const encrypted = encryptPayload(payload, this.session.sharedSecret);
      url.searchParams.set("data", encrypted.data);
      url.searchParams.set("nonce", encrypted.nonce);
    }
    
    return url.toString();
  }
}