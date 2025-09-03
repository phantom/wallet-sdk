import { decryptPayload, type EncryptedPayload } from "./crypto";
import type { DeeplinksSession } from "./session";

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

  constructor(private session: DeeplinksSession) {}

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

    // Listen for localStorage changes (cross-tab communication)
    const handleStorageChange = (event: StorageEvent) => {
      // eslint-disable-next-line no-console
      console.log("📡 STORAGE: Storage event received", event);
      
      if (event.key === "phantom_deeplink_response" && event.newValue) {
        // eslint-disable-next-line no-console
        console.log("📡 STORAGE: Found phantom_deeplink_response in storage", event.newValue);
        alert("📡 Received response from another tab!");
        
        try {
          const responseData = JSON.parse(event.newValue);
          // eslint-disable-next-line no-console
          console.log("📡 STORAGE: Parsed response data", responseData);
          
          this.processPhantomResponse(responseData);
          // Clean up the localStorage entry
          localStorage.removeItem("phantom_deeplink_response");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("📡 STORAGE: Failed to parse deeplink response from localStorage:", error);
          alert("📡 Error parsing storage response: " + (error as Error).message);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    this.cleanupFunctions.push(() => window.removeEventListener("storage", handleStorageChange));
    
    // Check current URL on start
    this.handlePotentialResponse(window.location.hash);
    this.handlePotentialResponse(window.location.search);

    // Check if we're in a tab that received a response (handle page refresh case)
    this.checkForStoredResponse();

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
  waitForResponse<T>(requestId: string, timeoutMs: number = 30000): Promise<T> {
    // eslint-disable-next-line no-console
    console.log("📡 COMMUNICATION: Starting to wait for response", { requestId, timeoutMs });
    alert("📡 Waiting for response from Phantom...");
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: Request timed out", requestId);
        alert("📡 Request timed out after " + (timeoutMs/1000) + " seconds");
        
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
      // eslint-disable-next-line no-console
      console.log("📡 COMMUNICATION: Stored pending request in localStorage", requestId);

      // We don't call startListening here anymore because it's already listening from initialization
      // eslint-disable-next-line no-console
      console.log("📡 COMMUNICATION: Using existing listeners (already started at init)");
    });
  }

  /**
   * Handle potential response from URL or message
   */
  private handlePotentialResponse(responseData: string): void {
    // eslint-disable-next-line no-console
    console.log("📡 COMMUNICATION: Handling potential response", responseData);
    
    if (!responseData) {
      // eslint-disable-next-line no-console
      console.log("📡 COMMUNICATION: No response data");
      return;
    }

    try {
      // Extract parameters from URL fragment or search
      const params = this.parseUrlParams(responseData);
      // eslint-disable-next-line no-console
      console.log("📡 COMMUNICATION: Parsed params", params);
      
      // Look for phantom response parameters (data indicates encrypted response, phantom_encryption_public_key indicates connect response)
      if (params.phantom_response || params.data || params.phantom_encryption_public_key) {
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: Found Phantom response parameters");
        alert("📡 Found Phantom response in URL!");
        
        // If this is a new tab/window that received the response, store it in localStorage for the original tab
        const pendingRequests = this.getPendingRequestsFromStorage();
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: Pending requests from storage", pendingRequests);
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: Current pending requests", this.pendingRequests.size);
        
        if (pendingRequests.length > 0 && this.pendingRequests.size === 0) {
          // This appears to be a response tab - store the response for the original tab
          // eslint-disable-next-line no-console
          console.log("📡 COMMUNICATION: This is a response tab, storing in localStorage");
          alert("📡 Response tab detected, storing for original tab");
          
          localStorage.setItem("phantom_deeplink_response", JSON.stringify(params));
          
          // Optionally close this tab if it was opened by the deeplink
          if (window.history.length <= 1) {
            // eslint-disable-next-line no-console
            console.log("📡 COMMUNICATION: Attempting to close response tab");
            window.close();
          }
          return;
        }
        
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: Processing response in current tab");
        this.processPhantomResponse(params);
      } else {
        // eslint-disable-next-line no-console
        console.log("📡 COMMUNICATION: No Phantom parameters found in URL");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("📡 COMMUNICATION: Failed to handle potential deeplink response:", error);
      alert("📡 Error handling response: " + (error as Error).message);
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
  private processPhantomResponse(params: Record<string, string>): void {
    // For debugging
    // eslint-disable-next-line no-console
    console.log("🔍 RESPONSE: Processing phantom response:", params);
    alert("🔍 Processing response with keys: " + Object.keys(params).join(", "));

    // Find the matching request - try to match any pending request if no request_id
    let requestId = params.request_id;
    let pendingRequest = requestId ? this.pendingRequests.get(requestId) : null;
    
    // If no specific request found, try to match the first pending request (for connect responses)
    if (!pendingRequest && this.pendingRequests.size === 1) {
      const [firstRequestId, firstRequest] = Array.from(this.pendingRequests.entries())[0];
      requestId = firstRequestId;
      pendingRequest = firstRequest;
      // eslint-disable-next-line no-console
      console.log("🔍 RESPONSE: Matched to first pending request:", firstRequestId);
      alert("🔍 Matched to pending request: " + firstRequestId.substring(0, 10) + "...");
    }

    if (!pendingRequest) {
      // eslint-disable-next-line no-console
      console.warn("🔍 RESPONSE: No pending request found for response:", { requestId, params });
      alert("🔍 ❌ No pending request found!");
      return;
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
        // eslint-disable-next-line no-console
        console.log("🔍 RESPONSE: Error response detected");
        alert("🔍 ❌ Error in response: " + (params.errorMessage || params.errorCode));
        pendingRequest.reject(new Error(params.errorMessage || `Error: ${params.errorCode}`));
        return;
      }

      // Handle encrypted response
      if (params.data && params.nonce) {
        // eslint-disable-next-line no-console
        console.log("🔍 RESPONSE: Encrypted response detected", {
          hasData: !!params.data,
          hasNonce: !!params.nonce,
          hasSharedSecret: !!this.session.sharedSecret
        });
        alert("🔍 Encrypted response. Has shared secret: " + (this.session.sharedSecret ? "YES" : "NO"));
        
        if (!this.session.sharedSecret) {
          throw new Error("No shared secret available for decryption");
        }

        const encryptedPayload: EncryptedPayload = {
          data: params.data,
          nonce: params.nonce,
        };

        const decrypted = decryptPayload(encryptedPayload, this.session.sharedSecret);
        
        // Update session if we receive new session info
        if (decrypted.session) {
          this.session.sessionToken = decrypted.session;
        }
        
        // eslint-disable-next-line no-console
        console.log("🔍 RESPONSE: Successfully decrypted response");
        alert("🔍 ✅ Successfully decrypted response");
        pendingRequest.resolve(decrypted);
        return;
      }

      // Handle plain response (like connect response with phantom_encryption_public_key)
      // eslint-disable-next-line no-console
      console.log("🔍 RESPONSE: Plain response detected");
      alert("🔍 Plain response detected");
      pendingRequest.resolve(params);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("🔍 RESPONSE: Error processing response:", error);
      alert("🔍 ❌ Error processing response: " + (error as Error).message);
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
  forceCheckCurrentUrl(): void {
    // eslint-disable-next-line no-console
    console.log("🔧 COMMUNICATION: Force checking current URL");
    alert("🔧 Force checking URL for responses");
    
    // Check hash and search immediately
    this.handlePotentialResponse(window.location.hash);
    this.handlePotentialResponse(window.location.search);
    
    // Also check for any stored responses
    this.checkForStoredResponse();
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
      const updatedRequests = [...existingRequests.filter(id => id !== requestId), requestId];
      localStorage.setItem("phantom_pending_requests", JSON.stringify(updatedRequests));
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
   * Check for stored response (for when current tab is the response tab)
   */
  private checkForStoredResponse(): void {
    try {
      const storedResponse = localStorage.getItem("phantom_deeplink_response");
      if (storedResponse) {
        const responseData = JSON.parse(storedResponse);
        this.processPhantomResponse(responseData);
        localStorage.removeItem("phantom_deeplink_response");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to check for stored response:", error);
    }
  }
}