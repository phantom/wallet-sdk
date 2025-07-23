import type { EmbeddedWalletType } from '../../types';

export interface AuthConfig {
  iframeUrl: string;
  organizationId: string;
  embeddedWalletType: EmbeddedWalletType;
}

export interface AuthResult {
  walletId: string;
}

export class IframeAuth {
  private iframe: HTMLIFrameElement | null = null;

  async authenticate(config: AuthConfig): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      try {
        // Create iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = `${config.iframeUrl}?organizationId=${config.organizationId}&walletType=${config.embeddedWalletType}`;
        this.iframe.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 600px;
          border: none;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          z-index: 10000;
          background: white;
        `;

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
        `;

        // Mock auth flow - in real implementation this would listen for postMessage
        const mockAuth = () => {
          // Simulate auth delay
          setTimeout(() => {
            // Clean up
            document.body.removeChild(this.iframe!);
            document.body.removeChild(backdrop);
            
            // Return mock wallet ID based on wallet type
            const walletPrefix = config.embeddedWalletType === 'phantom-wallet' ? 'phantom' : 'new';
            resolve({
              walletId: `mock-${walletPrefix}-wallet-${Date.now()}`,
            });
          }, 2000); // 2 second mock delay
        };

        // Handle close on backdrop click
        backdrop.onclick = () => {
          document.body.removeChild(this.iframe!);
          document.body.removeChild(backdrop);
          reject(new Error('Authentication cancelled'));
        };

        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(this.iframe);

        // Start mock auth
        mockAuth();

        // In real implementation, we would listen for postMessage
        // window.addEventListener('message', (event) => {
        //   if (event.origin !== new URL(config.iframeUrl).origin) return;
        //   if (event.data.type === 'auth-success') {
        //     resolve({ walletId: event.data.walletId });
        //   }
        // });

      } catch (error) {
        reject(error);
      }
    });
  }

  cleanup() {
    if (this.iframe && document.body.contains(this.iframe)) {
      document.body.removeChild(this.iframe);
    }
  }
}