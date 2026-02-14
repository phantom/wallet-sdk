/**
 * OAuth callback server for receiving authorization codes
 * Implements a local HTTP server that waits for OAuth callbacks
 */

import * as http from "http";
import { URL } from "url";
import { Logger } from "../utils/logger";
import type { OAuthCallbackParams } from "../session/types";

/**
 * CallbackServer options
 */
export interface CallbackServerOptions {
  port?: number;
  host?: string;
  path?: string;
  timeoutMs?: number;
}

/**
 * Local HTTP server that receives OAuth authorization callbacks
 *
 * Usage:
 * ```ts
 * const server = new CallbackServer();
 * const callbackUrl = server.getCallbackUrl();
 * // ... start OAuth flow with callbackUrl ...
 * const params = await server.waitForCallback(expectedState);
 * ```
 */
export class CallbackServer {
  private readonly port: number;
  private readonly host: string;
  private readonly path: string;
  private readonly timeoutMs: number;
  private readonly logger: Logger;
  private server: http.Server | null = null;
  private listeningPromise: Promise<void> | null = null;
  private listeningResolve: (() => void) | null = null;
  private listeningReject: ((error: Error) => void) | null = null;

  /**
   * Creates a new callback server
   *
   * @param options - Server configuration options
   * @param options.port - Port to listen on (default: 8080)
   * @param options.host - Host to bind to (default: localhost)
   * @param options.path - Callback path (default: /callback)
   * @param options.timeoutMs - Timeout in milliseconds (default: 300000 = 5 minutes)
   */
  constructor(options: CallbackServerOptions = {}) {
    this.port = options.port ?? 8080;
    this.host = options.host ?? "localhost";
    this.path = options.path ?? "/callback";
    this.timeoutMs = options.timeoutMs ?? 300000; // 5 minutes
    this.logger = new Logger("CallbackServer");
  }

  /**
   * Gets the callback URL that should be used in OAuth authorization requests
   *
   * @returns The callback URL (e.g., http://localhost:8080/callback)
   */
  getCallbackUrl(): string {
    return `http://${this.host}:${this.port}${this.path}`;
  }

  /**
   * Starts the server and waits for an OAuth callback
   *
   * This method:
   * 1. Starts an HTTP server on the configured host/port
   * 2. Waits for a GET request to /callback
   * 3. Validates the state parameter (CSRF protection)
   * 4. Extracts OAuth parameters from the query string
   * 5. Sends an HTML response to the browser
   * 6. Closes the server
   * 7. Returns the callback parameters
   *
   * @param expectedState - The expected state parameter value (for CSRF protection)
   * @returns Promise resolving to the OAuth callback parameters
   * @throws Error if the callback times out, state validation fails, or parameters are missing
   */
  async waitForCallback(expectedState: string): Promise<OAuthCallbackParams> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let hasResponded = false;

      this.listeningPromise = new Promise((listeningResolve, listeningReject) => {
        this.listeningResolve = listeningResolve;
        this.listeningReject = listeningReject;
      });

      // Create the HTTP server
      this.server = http.createServer((req, res) => {
        // Ignore favicon requests
        if (req.url?.includes("favicon.ico")) {
          res.writeHead(404);
          res.end();
          return;
        }

        // Only handle GET requests to the configured callback path
        if (req.method !== "GET" || !req.url) {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end(this.getErrorPage("Invalid endpoint"));
          return;
        }

        let url: URL;
        try {
          url = new URL(req.url, `http://${this.host}:${this.port}`);
        } catch {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end(this.getErrorPage("Invalid endpoint"));
          return;
        }

        if (url.pathname !== this.path) {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end(this.getErrorPage("Invalid endpoint"));
          return;
        }

        // Prevent duplicate responses
        if (hasResponded) {
          return;
        }
        hasResponded = true;

        try {
          // Parse the URL and query parameters
          const response_type = url.searchParams.get("response_type");
          const session_id = url.searchParams.get("session_id");
          const wallet_id = url.searchParams.get("wallet_id");
          const organization_id = url.searchParams.get("organization_id");
          const auth_user_id = url.searchParams.get("auth_user_id");

          this.logger.info("Received SSO callback");
          this.logger.debug(`Session ID: ${session_id}`);
          this.logger.debug(`Response type: ${response_type}`);

          // Validate session_id parameter (CSRF protection)
          if (!session_id || session_id !== expectedState) {
            const error = "Invalid session_id parameter";
            this.logger.error(error);
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(this.getErrorPage("Authorization failed: Invalid session_id"));

            this.cleanup(timeoutId);
            reject(new Error(error));
            return;
          }

          // Check response type
          if (response_type !== "success") {
            const error = `SSO flow failed with response_type: ${response_type}`;
            this.logger.error(error);
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(this.getErrorPage(`Authorization failed: ${response_type}`));

            this.cleanup(timeoutId);
            reject(new Error(error));
            return;
          }

          if (!wallet_id) {
            const error = "Missing wallet_id parameter";
            this.logger.error(error);
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(this.getErrorPage("Authorization failed: Missing wallet_id"));

            this.cleanup(timeoutId);
            reject(new Error(error));
            return;
          }

          if (!organization_id) {
            const error = "Missing organization_id parameter";
            this.logger.error(error);
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(this.getErrorPage("Authorization failed: Missing organization_id"));

            this.cleanup(timeoutId);
            reject(new Error(error));
            return;
          }

          if (!auth_user_id) {
            const error = "Missing auth_user_id parameter";
            this.logger.error(error);
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(this.getErrorPage("Authorization failed: Missing auth_user_id"));

            this.cleanup(timeoutId);
            reject(new Error(error));
            return;
          }

          // Send success page
          this.logger.info("SSO callback successful");
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(this.getSuccessPage());

          // Clean up and resolve
          this.cleanup(timeoutId);

          resolve({
            session_id,
            wallet_id,
            organization_id,
            auth_user_id,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          this.logger.error(`Failed to process callback: ${errorMessage}`);

          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(this.getErrorPage("Internal server error"));

          this.cleanup(timeoutId);
          reject(new Error(`Failed to process callback: ${errorMessage}`));
        }
      });

      // Start listening
      this.server.listen(this.port, this.host, () => {
        this.logger.info(`Callback server listening on ${this.getCallbackUrl()}`);
        this.listeningResolve?.();
        this.listeningResolve = null;
        this.listeningReject = null;
      });

      // Handle server errors
      this.server.on("error", error => {
        this.logger.error(`Server error: ${error.message}`);
        this.listeningReject?.(error);
        this.listeningResolve = null;
        this.listeningReject = null;
        this.cleanup(timeoutId);
        reject(new Error(`Server error: ${error.message}`));
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          this.logger.error("Callback timeout");
          this.cleanup(null);
          reject(new Error("OAuth callback timeout"));
        }
      }, this.timeoutMs);
    });
  }

  /**
   * Cleans up the server and timeout
   *
   * @param timeoutId - The timeout ID to clear, or null
   */
  private cleanup(timeoutId: NodeJS.Timeout | null): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (this.server) {
      this.server.close(() => {
        this.logger.info("Callback server closed");
      });
      this.server = null;
    }

    this.listeningPromise = null;
    this.listeningResolve = null;
    this.listeningReject = null;
  }

  /**
   * Waits until the callback server is listening for requests
   *
   * @returns Promise resolving when the server is listening
   */
  async waitForListening(): Promise<void> {
    if (this.server?.listening) {
      return;
    }
    if (!this.listeningPromise) {
      throw new Error("Callback server has not been started");
    }
    return this.listeningPromise;
  }

  /**
   * Generates an HTML success page
   *
   * @returns HTML string
   */
  private getSuccessPage(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: #4CAF50;
      stroke-miterlimit: 10;
      margin: 0 auto 2rem;
      box-shadow: inset 0px 0px 0px #4CAF50;
      animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
    }
    .checkmark__circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: #4CAF50;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    .checkmark__check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }
    @keyframes stroke {
      100% {
        stroke-dashoffset: 0;
      }
    }
    @keyframes scale {
      0%, 100% {
        transform: none;
      }
      50% {
        transform: scale3d(1.1, 1.1, 1);
      }
    }
    @keyframes fill {
      100% {
        box-shadow: inset 0px 0px 0px 30px #4CAF50;
      }
    }
    h1 {
      color: #333;
      margin-bottom: 1rem;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
    <h1>Authorization Successful!</h1>
    <p>You have successfully connected your Phantom wallet.</p>
    <p>You can close this window and return to your application.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generates an HTML error page
   *
   * @param message - Error message to display
   * @returns HTML string
   */
  private getErrorPage(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: #f44336;
      stroke-miterlimit: 10;
      margin: 0 auto 2rem;
      box-shadow: inset 0px 0px 0px #f44336;
      animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
    }
    .error-icon__circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: #f44336;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    .error-icon__cross {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }
    @keyframes stroke {
      100% {
        stroke-dashoffset: 0;
      }
    }
    @keyframes scale {
      0%, 100% {
        transform: none;
      }
      50% {
        transform: scale3d(1.1, 1.1, 1);
      }
    }
    @keyframes fill {
      100% {
        box-shadow: inset 0px 0px 0px 30px #f44336;
      }
    }
    h1 {
      color: #333;
      margin-bottom: 1rem;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .error-message {
      color: #f44336;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="error-icon__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="error-icon__cross" fill="none" d="M16 16 36 36 M36 16 16 36"/>
    </svg>
    <h1>Authorization Failed</h1>
    <p class="error-message">${this.escapeHtml(message)}</p>
    <p>Please close this window and try again.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Escapes HTML special characters
   *
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}
