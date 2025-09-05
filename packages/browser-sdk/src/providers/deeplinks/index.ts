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

import { saveSession, loadSession, clearSession, hasValidSession, initializeSessionStorage, type DeeplinksSession } from "./session";
import { SecureCrypto } from "./secureCrypto";
import { DeeplinksCommunicator } from "./communication";
import { DeeplinksSolanaChain } from "./chains/SolanaChain";
import { 
  generateConnectDeeplink, 
  generateDisconnectDeeplink,
  buildRedirectLink 
} from "@phantom/deeplinks";
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
  private secureCrypto: SecureCrypto;

  // Chain instances
  private _solanaChain?: ISolanaChain;
  private _ethereumChain?: IEthereumChain;

  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();

  // Initialization state tracking
  private isInitializing: boolean = false;
  private isInitialized: boolean = false;

  constructor(config: DeeplinksProviderConfig) {
    debug.log(DebugCategory.BROWSER_SDK, "Initializing DeeplinksProvider", { config });

    this.addressTypes = config.addressTypes;

    // Initialize with empty session
    this.session = {};
    
    // Initialize secure crypto manager
    this.secureCrypto = new SecureCrypto();

    // Create communicator
    this.communicator = new DeeplinksCommunicator(this.session, this.secureCrypto);
    
    // Set up callback for successful connect responses processed in new tabs
    this.communicator.setOnConnectSuccess((response) => {
      this.handleConnectSuccessCallback(response);
    });

    // Set up callback for all response types (sign message, etc.)
    this.communicator.setOnResponseSuccess((response, requestId, method) => {
      this.handleResponseSuccessCallback(response, requestId, method);
    });

    // Create chain instances
    if (this.addressTypes.includes(AddressType.solana)) {
      this._solanaChain = new DeeplinksSolanaChain(this.session, this.communicator, this.secureCrypto);
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
    // Prevent double initialization
    if (this.isInitializing || this.isInitialized) {
      debug.info(DebugCategory.BROWSER_SDK, "Deeplinks already initializing or initialized, skipping");
      return;
    }
    
    this.isInitializing = true;
    
    try {
      debug.info(DebugCategory.BROWSER_SDK, "Starting deeplinks async initialization");

      // Initialize session storage
      initializeSessionStorage();

      // Initialize secure crypto (generates or loads keypair securely)
      const publicKey = await this.secureCrypto.init();
      
      debug.info(DebugCategory.BROWSER_SDK, "SecureCrypto initialized", { publicKeyPrefix: publicKey.substring(0, 8) });

      // Try to load existing session data (non-sensitive)
      const existingSession = loadSession();
      if (existingSession) {
        debug.info(DebugCategory.BROWSER_SDK, "Found existing session in storage");
        
        this.session = existingSession;
        
        // If we have a complete session, try to restore connection
        if (hasValidSession(existingSession)) {
          this.addresses = [{
            addressType: AddressType.solana,
            address: existingSession.publicKey!,
          }];
          this.connected = true;
          
          debug.info(DebugCategory.BROWSER_SDK, "Auto-restored connection from session", { 
            publicKey: existingSession.publicKey?.substring(0, 8) + "..." 
          });
          
          this.emit("connect", {
            source: "deeplinks-auto-restore",
          });
        }
      } else {
        debug.info(DebugCategory.BROWSER_SDK, "No existing session, ready for new connection");
      }

      // Always start response handling - we need to listen for sign/transaction responses even when connected
      this.initializeResponseHandling();
      
      this.isInitialized = true;
      debug.info(DebugCategory.BROWSER_SDK, "Deeplinks provider initialization complete");
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Deeplinks initialization failed", { error: (error as Error).message });
      
      // Still start response handling with current session if not connected
      if (!this.connected) {
        this.initializeResponseHandling();
      }
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Initialize response handling immediately on provider creation
   */
  private initializeResponseHandling(): void {
    debug.info(DebugCategory.BROWSER_SDK, "Initializing deeplinks response handling");

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
                             currentUrl.includes('#phantom_response') ||
                             (currentUrl.includes('nonce=') && currentUrl.includes('data='));
    
    if (hasResponseParams) {
      debug.info(DebugCategory.BROWSER_SDK, "Found deeplinks response params in current URL", { url: currentUrl });
      
      // Let startListening handle processing regardless of connection state
      // This allows processing of sign/transaction responses even when already connected
      debug.info(DebugCategory.BROWSER_SDK, "Response params found, startListening will handle processing");
    } else {
      debug.info(DebugCategory.BROWSER_SDK, "No response params in current URL, ready to listen for new responses");
    }
  }


  /**
   * Clear current session and prepare for fresh connect
   */
  async clearSessionAndReconnect(): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Clearing session and forcing reconnect");
    
    // Clear current session
    clearSession();
    this.session = {};
    await this.secureCrypto.clear();
    this.connected = false;
    this.addresses = [];

    // Emit disconnect event
    this.emit("disconnect", {
      source: "deeplinks-session-clear",
    });

    // Start fresh connect
    return this.connect();
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

  /**
   * Handle successful connect response processed in new tab
   */
  private handleConnectSuccessCallback(response: any): void {
    debug.info(DebugCategory.BROWSER_SDK, "Handling connect success callback", {
      hasPublicKey: !!response.public_key,
      hasSession: !!response.session,
      hasEncryptionKey: !!response.phantom_encryption_public_key
    });

    if (!response.public_key || !response.session) {
      debug.error(DebugCategory.BROWSER_SDK, "Connect success callback missing required data");
      return;
    }

    // Update session with response data
    this.session.sessionToken = response.session;
    this.session.publicKey = response.public_key;

    // Save session with Phantom's encryption key
    saveSession(this.session, response.phantom_encryption_public_key);

    // Update internal state
    this.addresses = [{
      addressType: AddressType.solana,
      address: response.public_key,
    }];
    this.connected = true;

    debug.info(DebugCategory.BROWSER_SDK, "Provider state updated from connect callback", {
      connected: this.connected,
      publicKey: response.public_key.substring(0, 8) + "...",
      addressCount: this.addresses.length
    });

    // Clean URL
    this.communicator.cleanUrl();

    // Emit connect event
    this.emit("connect", {
      addresses: this.addresses,
      source: "deeplinks-new-tab-callback",
    });

    debug.info(DebugCategory.BROWSER_SDK, "Connect event emitted from callback");
  }

  /**
   * Handle successful responses for all methods (sign message, etc.)
   */
  private handleResponseSuccessCallback(response: any, requestId: string, method: string): void {
    debug.info(DebugCategory.BROWSER_SDK, "Handling response success callback", {
      method,
      requestId: requestId.substring(0, 10) + "...",
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : []
    });

    if (method === 'connect') {
      // Connect responses are already handled by handleConnectSuccessCallback
      debug.info(DebugCategory.BROWSER_SDK, "Connect response already handled by connect callback");
      return;
    }

    // For sign message and other methods, the response should be handled by direct URL parameter processing
    // No need for special callback handling since the response comes back to the current tab
    debug.info(DebugCategory.BROWSER_SDK, "Response callback processed", { method });
  }

  async connect(_authOptions?: AuthOptions): Promise<ConnectResult> {
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
        debug.info(DebugCategory.BROWSER_SDK, "Using existing deeplinks session", {
          publicKey: this.session.publicKey.substring(0, 8) + "..."
        });
        
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
      
      debug.info(DebugCategory.BROWSER_SDK, "Opening Phantom for connection", { 
        requestId: requestId.substring(0, 10) + "...",
        urlLength: url.length 
      });
      
      // Navigate to deeplink
      window.location.href = url;
      
      debug.info(DebugCategory.BROWSER_SDK, "Waiting for deeplinks response", { 
        requestId: requestId.substring(0, 10) + "..." 
      });
      
      // Wait for response
      const response = await this.communicator.waitForResponse<{
        public_key: string;
        session: string;
        phantom_encryption_public_key?: string;
      }>(requestId, 60000); // 60 second timeout for connect

      debug.info(DebugCategory.BROWSER_SDK, "Received deeplinks response", {
        hasPublicKey: !!response.public_key,
        hasSession: !!response.session,
        hasEncryptionKey: !!response.phantom_encryption_public_key
      });

      // Update session with response
      this.session.sessionToken = response.session;
      this.session.publicKey = response.public_key;
      
      // Save session with Phantom's encryption key (if provided)
      let phantomEncryptionKey: string | undefined;
      if (response.phantom_encryption_public_key) {
        phantomEncryptionKey = response.phantom_encryption_public_key;
        debug.info(DebugCategory.BROWSER_SDK, "Received Phantom's encryption key");
      }
      
      saveSession(this.session, phantomEncryptionKey);
      debug.info(DebugCategory.BROWSER_SDK, "Session saved successfully", {
        hasSessionToken: !!this.session.sessionToken,
        hasPublicKey: !!this.session.publicKey
      });

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

      debug.info(DebugCategory.BROWSER_SDK, "Deeplinks connect successful", {
        publicKey: response.public_key,
        hasSession: !!response.session,
      });

      return result;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Deeplinks connect failed", { error: (error as Error).message });
      
      this.emit("connect_error", {
        error: (error as Error).message,
        source: "deeplinks-connect",
      });
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      debug.info(DebugCategory.BROWSER_SDK, "Starting deeplinks disconnect");
      
      // If we have a session, send disconnect deeplink
      if (hasValidSession(this.session)) {
        const requestId = this.communicator.generateRequestId();
        const url = await this.buildDisconnectUrl(requestId);
        
        // Navigate to disconnect (optional - Phantom may not require this)
        window.location.href = url;
        
        // Don't wait for response for disconnect - it's fire and forget
      }

      // Clear session data
        clearSession();
        this.session = {};
        
        // Clear secure crypto keys
        await this.secureCrypto.clear();
        
        this.connected = false;
        this.addresses = [];

        // Stop listening for responses
        this.communicator.stopListening();

        this.emit("disconnect", {
          source: "deeplinks-disconnect",
        });

        debug.info(DebugCategory.BROWSER_SDK, "Deeplinks disconnect successful");
      } catch (error) {
        debug.error(DebugCategory.BROWSER_SDK, "Deeplinks disconnect failed", { error: (error as Error).message });
        throw error;
      }
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
   * Build connect deeplink URL using the new deeplinks package
   */
  private buildConnectUrl(requestId: string): string {
    const ourPublicKey = this.secureCrypto.getPublicKeyBase58();
    if (!ourPublicKey) {
      throw new Error("SecureCrypto not initialized");
    }
    
    const url = generateConnectDeeplink({
      dappEncryptionPublicKey: ourPublicKey,
      cluster: "mainnet-beta",
      appUrl: buildRedirectLink(),
      redirectLink: buildRedirectLink("#phantom_response")
    });
    
    // Add request_id to the generated URL
    const urlObj = new URL(url);
    urlObj.searchParams.set("request_id", requestId);
    
    return urlObj.toString();
  }

  /**
   * Build disconnect deeplink URL using the new deeplinks package
   */
  private async buildDisconnectUrl(requestId: string): Promise<string> {
    let encryptedData;
    
    // Add encrypted session if available
    if (this.session.sessionToken) {
      // Get Phantom's encryption key from stored session data
      const storedSession = loadSession();
      const phantomEncryptionKey = storedSession?.phantomEncryptionPublicKey;
      
      if (phantomEncryptionKey) {
        const payload = {
          session: this.session.sessionToken,
          request_id: requestId,
        };
        
        encryptedData = await this.secureCrypto.encryptPayload(payload, phantomEncryptionKey);
      }
    }
    
    return generateDisconnectDeeplink({
      data: encryptedData,
      redirectLink: buildRedirectLink("#phantom_response")
    });
  }
}