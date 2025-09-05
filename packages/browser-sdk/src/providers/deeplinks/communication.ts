import type { EncryptedPayload, SecureCrypto } from "./secureCrypto";
import type { DeeplinksSession } from "./session";
import { debug, DebugCategory } from "../../debug";

export interface PendingRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

export class DeeplinksCommunicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private isListening = false;
  private cleanupFunctions: (() => void)[] = [];
  private onConnectSuccessCallback?: (response: any) => void;
  private onResponseSuccessCallback?: (response: any, requestId: string, method: string) => void;
  private _lastDecryptedConnectResponse?: any;

  constructor(private session: DeeplinksSession, private secureCrypto: SecureCrypto) {}

  /**
   * Set callback to be called when a connect response is processed successfully
   */
  setOnConnectSuccess(callback: (response: any) => void): void {
    this.onConnectSuccessCallback = callback;
  }

  /**
   * Set callback to be called when any response is processed successfully (sign message, etc.)
   */
  setOnResponseSuccess(callback: (response: any, requestId: string, method: string) => void): void {
    this.onResponseSuccessCallback = callback;
  }

  /**
   * Start listening for deeplink responses
   */
  startListening(): void {
    if (this.isListening) return;
    this.isListening = true;

    // Listen for URL hash changes (primary method)
    const handleHashChange = () => {
      this.handlePotentialResponse(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    this.cleanupFunctions.push(() => window.removeEventListener("hashchange", handleHashChange));

    // Note: We don't need to listen for storage changes anymore since we process responses directly in the new tab
    
    // Check current URL on start
    this.handlePotentialResponse(window.location.hash);
    this.handlePotentialResponse(window.location.search);

    // Listen for custom protocol handler messages if supported
    if (typeof window !== "undefined" && window.addEventListener) {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin === window.location.origin && event.data?.type === "phantom-deeplink-response") {
          this.handlePotentialResponse(event.data.response);
        }
      };
      window.addEventListener("message", handleMessage);
      this.cleanupFunctions.push(() => window.removeEventListener("message", handleMessage));
    }
  }

  /**
   * Stop listening for responses and cleanup
   */
  stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;

    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      if (request.timeout) clearTimeout(request.timeout);
      request.reject(new Error("Communication stopped"));
    });
    this.pendingRequests.clear();
  }

  /**
   * Wait for a response from Phantom with given request ID
   */
  async waitForResponse<T>(requestId: string, timeoutMs: number = 30000): Promise<T> {
    debug.info(DebugCategory.BROWSER_SDK, "Starting to wait for deeplinks response", { requestId: requestId.substring(0, 10) + "...", timeoutMs });
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        debug.warn(DebugCategory.BROWSER_SDK, "Deeplinks request timed out", { requestId: requestId.substring(0, 10) + "...", timeoutMs });
        
        this.pendingRequests.delete(requestId);
        this.removePendingRequestFromStorage(requestId);
        reject(new Error(`Request ${requestId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store request
      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        timeout,
      });

      // Store pending request in localStorage for cross-tab communication
      this.storePendingRequest(requestId);
      debug.info(DebugCategory.BROWSER_SDK, "Stored pending deeplinks request", { requestId: requestId.substring(0, 10) + "...", storedCount: this.pendingRequests.size });
      
      // Start periodic checking for responses in case the user comes back to this tab
      const checkInterval = setInterval(() => {
        debug.info(DebugCategory.BROWSER_SDK, "Periodic check for response", { requestId: requestId.substring(0, 10) + "..." });
        
        // Check for stored result first (faster than URL processing)
        try {
          const storedResult = localStorage.getItem(`phantom_response_result_${requestId}`);
          if (storedResult) {
            debug.info(DebugCategory.BROWSER_SDK, "Found stored sign message result", {
              requestId: requestId.substring(0, 10) + "..."
            });
            
            const responseData = JSON.parse(storedResult);
            
            // Clean up stored result
            localStorage.removeItem(`phantom_response_result_${requestId}`);
            
            // Convert response to expected format
            const result = {
              signature: responseData.response.signature || [],
              publicKey: responseData.response.publicKey || this.session.publicKey || "",
            };
            
            debug.info(DebugCategory.BROWSER_SDK, "Resolving sign message from stored result", {
              requestId: requestId.substring(0, 10) + "...",
              hasSignature: !!result.signature.length || !!result.signature,
              signatureType: typeof result.signature
            });
            
            // Find and resolve the pending request
            const pendingRequest = this.pendingRequests.get(requestId);
            if (pendingRequest) {
              clearInterval(checkInterval);
              if (pendingRequest.timeout) clearTimeout(pendingRequest.timeout);
              this.pendingRequests.delete(requestId);
              this.removePendingRequestFromStorage(requestId);
              pendingRequest.resolve(result);
              return;
            }
          }
        } catch (error) {
          debug.error(DebugCategory.BROWSER_SDK, "Error checking stored result", { error: (error as Error).message });
        }
        
        // Also check URL parameters as backup
        this.handlePotentialResponse(window.location.hash);
        this.handlePotentialResponse(window.location.search);
      }, 1000); // Check every second
      
      // Clean up interval when promise resolves/rejects
      const originalResolve = resolve;
      const originalReject = reject;
      
      const wrappedResolve = (value: T) => {
        clearInterval(checkInterval);
        originalResolve(value);
      };
      
      const wrappedReject = (error: Error) => {
        clearInterval(checkInterval);
        originalReject(error);
      };
      
      // Update stored promise handlers
      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve: wrappedResolve,
        reject: wrappedReject,
        timeout,
      });
    });
  }

  /**
   * Handle potential response from URL or message
   */
  private async handlePotentialResponse(responseData: string): Promise<void> {
    if (!responseData) {
      return;
    }

    try {
      // Extract parameters from URL fragment or search
      const params = this.parseUrlParams(responseData);
      debug.info(DebugCategory.BROWSER_SDK, "Parsed deeplinks URL params", { keys: Object.keys(params) });
      
      // Look for phantom response parameters (data indicates encrypted response, phantom_encryption_public_key indicates connect response)
      if (params.phantom_response || params.data || params.phantom_encryption_public_key) {
        debug.info(DebugCategory.BROWSER_SDK, "Found Phantom response parameters in URL");
        
        // Check if there are any pending requests in localStorage
        const pendingRequests = this.getPendingRequestsFromStorage();
        debug.info(DebugCategory.BROWSER_SDK, "Checking for pending requests", { 
          storedPendingCount: pendingRequests.length,
          memoryPendingCount: this.pendingRequests.size 
        });
        
        // Check if this is a connect response (has phantom_encryption_public_key)
        const isConnectResponse = !!params.phantom_encryption_public_key;
        
        // Process if we have pending requests in memory OR if it's a connect response
        if (this.pendingRequests.size > 0) {
          debug.info(DebugCategory.BROWSER_SDK, "Processing response in original tab with pending promises", {
            pendingInMemory: this.pendingRequests.size,
            pendingInStorage: pendingRequests.length,
            isConnectResponse
          });
          await this.processPhantomResponse(params);
        } else if (isConnectResponse) {
          debug.info(DebugCategory.BROWSER_SDK, "Found connect response without pending requests - processing anyway for initialization", {
            pendingInMemory: this.pendingRequests.size,
            pendingInStorage: pendingRequests.length,
            hasPhantomEncryptionKey: !!params.phantom_encryption_public_key
          });
          // For connect responses, we should process them even without pending requests
          // This handles the case where user returns to page after connecting
          await this.processPhantomResponse(params);
        } else if (pendingRequests.length > 0) {
          debug.info(DebugCategory.BROWSER_SDK, "Found stored pending requests but no in-memory promises - processing and storing result for original tab", {
            pendingInMemory: this.pendingRequests.size,
            pendingInStorage: pendingRequests.length,
            currentUrl: window.location.href.substring(0, 100) + "...",
            isConnectResponse
          });
          
          // Process the response and store result for original tab to pick up
          // Use the first pending request ID
          const requestId = params.request_id || pendingRequests[0];
          await this.handleSuccessfulResponse(params, requestId);
        } else {
          debug.warn(DebugCategory.BROWSER_SDK, "No pending requests found anywhere, ignoring response", {
            isConnectResponse
          });
        }
      }
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to handle potential deeplink response", { error: (error as Error).message });
    }
  }

  /**
   * Parse URL parameters from hash or search string
   */
  private parseUrlParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Remove leading # or ?
    const cleanUrl = url.replace(/^[#?]/, "");
    
    if (!cleanUrl) return params;
    
    // Handle JSON-encoded response
    if (cleanUrl.startsWith("phantom_response=")) {
      try {
        const encoded = cleanUrl.replace("phantom_response=", "");
        const decoded = decodeURIComponent(encoded);
        const parsed = JSON.parse(decoded);
        return parsed;
      } catch {
        // Fall through to regular param parsing
      }
    }
    
    // Regular URL parameter parsing
    cleanUrl.split("&").forEach(param => {
      const [key, value] = param.split("=");
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
    
    return params;
  }

  /**
   * Process response from Phantom
   */
  private async processPhantomResponse(params: Record<string, string>): Promise<void> {
    debug.info(DebugCategory.BROWSER_SDK, "Processing Phantom deeplinks response", { keys: Object.keys(params) });

    // Find the matching request - try to match any pending request if no request_id
    let requestId = params.request_id;
    let pendingRequest = requestId ? this.pendingRequests.get(requestId) : null;
    
    // If no specific request found, try to match the first pending request (for connect responses)
    if (!pendingRequest && this.pendingRequests.size === 1) {
      const [firstRequestId, firstRequest] = Array.from(this.pendingRequests.entries())[0];
      requestId = firstRequestId;
      pendingRequest = firstRequest;
      debug.info(DebugCategory.BROWSER_SDK, "Matched deeplinks response to pending request", { requestId: firstRequestId.substring(0, 10) + "..." });
    }

    // If no pending request in memory, check if this is a connect response that should be processed anyway
    if (!pendingRequest) {
      if (params.phantom_encryption_public_key) {
        debug.info(DebugCategory.BROWSER_SDK, "No pending request in memory but found connect response - processing for initialization", { 
          requestId, 
          paramsKeys: Object.keys(params),
          memoryPendingCount: this.pendingRequests.size 
        });
        
        // For connect responses without pending requests, handle directly via callback
        await this.handleSuccessfulResponse(params, requestId || 'connect_init');
        return;
      } else {
        debug.warn(DebugCategory.BROWSER_SDK, "No pending request in memory for non-connect response", { 
          requestId, 
          paramsKeys: Object.keys(params),
          memoryPendingCount: this.pendingRequests.size 
        });
        return;
      }
    }

    // Clear timeout
    if (pendingRequest.timeout) {
      clearTimeout(pendingRequest.timeout);
    }
    
    // Remove from pending
    this.pendingRequests.delete(requestId);
    this.removePendingRequestFromStorage(requestId);

    try {
      // Check for error response
      if (params.errorCode || params.errorMessage) {
        debug.error(DebugCategory.BROWSER_SDK, "Error in deeplinks response", { errorCode: params.errorCode, errorMessage: params.errorMessage });
        pendingRequest.reject(new Error(params.errorMessage || `Error: ${params.errorCode}`));
        return;
      }

      // Handle encrypted response
      if (params.data && params.nonce) {
        debug.info(DebugCategory.BROWSER_SDK, "Processing encrypted deeplinks response", {
          hasData: !!params.data,
          hasNonce: !!params.nonce,
        });
        
        // Load session to get Phantom's encryption key
        const { loadSession } = await import("./session");
        const storedSession = loadSession();
        const phantomEncryptionKey = storedSession?.phantomEncryptionPublicKey;
        
        if (!phantomEncryptionKey) {
          throw new Error("No Phantom encryption key available for decryption");
        }

        const encryptedPayload: EncryptedPayload = {
          data: params.data,
          nonce: params.nonce,
        };

        const decrypted = await this.secureCrypto.decryptPayload(encryptedPayload, phantomEncryptionKey);
        
        // Update session if we receive new session info
        if (decrypted.session) {
          this.session.sessionToken = decrypted.session;
        }
        
        debug.info(DebugCategory.BROWSER_SDK, "Successfully decrypted deeplinks response");
        pendingRequest.resolve(decrypted);
        return;
      }

      // Handle plain response (like connect response with phantom_encryption_public_key)
      debug.info(DebugCategory.BROWSER_SDK, "Processing plain deeplinks response");
      pendingRequest.resolve(params);
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Error processing deeplinks response", { error: (error as Error).message });
      pendingRequest.reject(error instanceof Error ? error : new Error("Failed to process response"));
    }
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Force check current URL for response parameters
   * This is called when initializing in a potentially response tab
   */
  async forceCheckCurrentUrl(): Promise<void> {
    debug.info(DebugCategory.BROWSER_SDK, "Force checking current URL for deeplinks response");
    
    // Check hash and search immediately
    await this.handlePotentialResponse(window.location.hash);
    await this.handlePotentialResponse(window.location.search);
  }

  /**
   * Clean URL after processing response
   */
  cleanUrl(): void {
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.hash = "";
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    }
  }

  /**
   * Store pending request in localStorage for cross-tab communication
   */
  private storePendingRequest(requestId: string): void {
    try {
      const existingRequests = this.getPendingRequestsFromStorage();
      
      // Clean up any old requests that are no longer in memory (they might be stale)
      const activeRequestIds = Array.from(this.pendingRequests.keys());
      const cleanRequests = existingRequests.filter(id => activeRequestIds.includes(id));
      
      // Add the new request if not already present
      const updatedRequests = [...cleanRequests.filter(id => id !== requestId), requestId];
      localStorage.setItem("phantom_pending_requests", JSON.stringify(updatedRequests));
      
      debug.info(DebugCategory.BROWSER_SDK, "Cleaned up stale pending requests", { 
        before: existingRequests.length, 
        after: updatedRequests.length 
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to store pending request in localStorage:", error);
    }
  }

  /**
   * Remove pending request from localStorage
   */
  private removePendingRequestFromStorage(requestId: string): void {
    try {
      const existingRequests = this.getPendingRequestsFromStorage();
      const updatedRequests = existingRequests.filter(id => id !== requestId);
      if (updatedRequests.length === 0) {
        localStorage.removeItem("phantom_pending_requests");
      } else {
        localStorage.setItem("phantom_pending_requests", JSON.stringify(updatedRequests));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to remove pending request from localStorage:", error);
    }
  }

  /**
   * Get pending requests from localStorage
   */
  private getPendingRequestsFromStorage(): string[] {
    try {
      const stored = localStorage.getItem("phantom_pending_requests");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }


  /**
   * Handle successful response without needing to resolve a promise
   * Used when processing stored requests from new tabs
   */
  private async handleSuccessfulResponse(params: Record<string, string>, requestId: string): Promise<void> {
    let decryptedResponse: any = null;
    
    try {
      // Check for error response
      if (params.errorCode || params.errorMessage) {
        debug.error(DebugCategory.BROWSER_SDK, "Error in stored deeplinks response", { errorCode: params.errorCode, errorMessage: params.errorMessage });
        this.removePendingRequestFromStorage(requestId);
        return;
      }

      // Check if this is a connect response (has phantom_encryption_public_key)
      if (params.phantom_encryption_public_key) {
        debug.info(DebugCategory.BROWSER_SDK, "Processing stored connect response");
        
        // For connect responses, if there's encrypted data, it's encrypted with our key, not Phantom's
        if (params.data && params.nonce) {
          debug.info(DebugCategory.BROWSER_SDK, "Decrypting connect response data with our key");
          
          const encryptedPayload: EncryptedPayload = {
            data: params.data,
            nonce: params.nonce,
          };

          // Use Phantom's public key to decrypt (Phantom encrypted it with our public key, but we use their key for shared secret)
          decryptedResponse = await this.secureCrypto.decryptPayload(encryptedPayload, params.phantom_encryption_public_key);
          
          debug.info(DebugCategory.BROWSER_SDK, "Decrypted connect response data", { 
            hasSession: !!decryptedResponse.session, 
            hasPublicKey: !!decryptedResponse.public_key,
            keys: Object.keys(decryptedResponse)
          });
          
          // Update session if we receive new session info
          if (decryptedResponse.session) {
            this.session.sessionToken = decryptedResponse.session;
            debug.info(DebugCategory.BROWSER_SDK, "Updated session from stored connect response");
          }
          
          // Store decrypted response for callback
          this._lastDecryptedConnectResponse = decryptedResponse;
        }
        
        debug.info(DebugCategory.BROWSER_SDK, "Connect response processed from storage");
        
        // Call the connect success callback if available
        if (this.onConnectSuccessCallback) {
          debug.info(DebugCategory.BROWSER_SDK, "Calling connect success callback");
          const connectResponse = {
            public_key: this._lastDecryptedConnectResponse?.public_key,
            session: this.session.sessionToken,
            phantom_encryption_public_key: params.phantom_encryption_public_key
          };
          this.onConnectSuccessCallback(connectResponse);
        }
      } else if (params.data && params.nonce) {
        // Handle regular encrypted response (non-connect)
        debug.info(DebugCategory.BROWSER_SDK, "Processing stored encrypted deeplinks response");
        
        // Load session to get Phantom's encryption key
        const { loadSession } = await import("./session");
        const storedSession = loadSession();
        const phantomEncryptionKey = storedSession?.phantomEncryptionPublicKey;
        
        if (!phantomEncryptionKey) {
          debug.error(DebugCategory.BROWSER_SDK, "No Phantom encryption key available for decryption");
          this.removePendingRequestFromStorage(requestId);
          return;
        }

        const encryptedPayload: EncryptedPayload = {
          data: params.data,
          nonce: params.nonce,
        };

        decryptedResponse = await this.secureCrypto.decryptPayload(encryptedPayload, phantomEncryptionKey);
        
        // Update session if we receive new session info
        if (decryptedResponse.session) {
          this.session.sessionToken = decryptedResponse.session;
        }
        
        debug.info(DebugCategory.BROWSER_SDK, "Successfully processed stored encrypted response");
      } else {
        // Handle plain response
        debug.info(DebugCategory.BROWSER_SDK, "Processing stored plain deeplinks response");
      }
      
      // Store result for original tab to pick up (for non-connect responses)
      if (!params.phantom_encryption_public_key) {
        const responseResult = {
          requestId,
          response: decryptedResponse || params,
          method: 'signMessage',
          timestamp: Date.now()
        };
        
        try {
          localStorage.setItem(`phantom_response_result_${requestId}`, JSON.stringify(responseResult));
          debug.info(DebugCategory.BROWSER_SDK, "Stored sign message result for original tab", { 
            requestId: requestId.substring(0, 10) + "...",
            hasSignature: !!(decryptedResponse?.signature || params.signature)
          });
        } catch (error) {
          debug.error(DebugCategory.BROWSER_SDK, "Failed to store response result", { error: (error as Error).message });
        }
      }
      
      // Call the general response success callback if available
      if (this.onResponseSuccessCallback) {
        const responseData = params.phantom_encryption_public_key ? 
          { ...this._lastDecryptedConnectResponse, phantom_encryption_public_key: params.phantom_encryption_public_key } :
          decryptedResponse || params;
        const method = params.phantom_encryption_public_key ? 'connect' : 'signMessage';
        
        debug.info(DebugCategory.BROWSER_SDK, "Calling response success callback", { method, requestId: requestId.substring(0, 10) + "..." });
        this.onResponseSuccessCallback(responseData, requestId, method);
      }

      // Always clean up the request when done
      this.removePendingRequestFromStorage(requestId);
      debug.info(DebugCategory.BROWSER_SDK, "Cleaned up processed request from storage", { requestId: requestId.substring(0, 10) + "..." });
      
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Error processing stored deeplinks response", { error: (error as Error).message });
      // Clean up on error too
      this.removePendingRequestFromStorage(requestId);
    }
  }
}