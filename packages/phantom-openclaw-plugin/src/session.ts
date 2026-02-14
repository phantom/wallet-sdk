/**
 * Session management for Phantom OpenClaw plugin
 * Wraps the SessionManager from @phantom/mcp-server
 */

import { SessionManager } from "@phantom/mcp-server";
import type { PhantomClient, SessionData } from "@phantom/mcp-server";

/**
 * Configuration options for PluginSession
 */
export interface PluginSessionOptions {
  /** Application identifier from Phantom Portal */
  appId?: string;
  /** OAuth callback port (default: 8080) */
  callbackPort?: number;
  /** Directory to store session data (default: ~/.phantom-mcp) */
  sessionDir?: string;
}

/**
 * Plugin session manager
 * Handles authentication and provides access to PhantomClient
 */
export class PluginSession {
  private sessionManager: SessionManager;
  private initialized = false;
  private initializingPromise: Promise<void> | null = null;

  constructor(options: PluginSessionOptions = {}) {
    // Initialize SessionManager with configuration
    this.sessionManager = new SessionManager({
      appId: options.appId ?? "phantom-openclaw",
      callbackPort: options.callbackPort,
      sessionDir: options.sessionDir,
    });
  }

  /**
   * Initialize the session (authenticate if needed)
   * Thread-safe: concurrent calls will await the same initialization promise
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If already initializing, return the existing promise
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    // Create and store the initialization promise
    this.initializingPromise = this.sessionManager
      .initialize()
      .then(() => {
        this.initialized = true;
      })
      .catch(error => {
        // Clear promise on error so subsequent calls can retry
        this.initializingPromise = null;
        throw error;
      });

    return this.initializingPromise;
  }

  /**
   * Get the authenticated PhantomClient
   */
  getClient(): PhantomClient {
    if (!this.initialized) {
      throw new Error("Session not initialized. Call initialize() first.");
    }
    return this.sessionManager.getClient();
  }

  /**
   * Get the current session data
   */
  getSession(): SessionData {
    if (!this.initialized) {
      throw new Error("Session not initialized. Call initialize() first.");
    }
    return this.sessionManager.getSession();
  }
}
