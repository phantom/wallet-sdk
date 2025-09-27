// WebView bridge for communicating with React Native
export interface WebViewMessage {
  id: string;
  type: string;
  data?: any;
}

export interface AuthRequest extends WebViewMessage {
  type: 'PHANTOM_AUTH_REQUEST';
  data: {
    provider: 'google' | 'apple';
  };
}

export interface AuthResponse extends WebViewMessage {
  type: 'PHANTOM_AUTH_SUCCESS' | 'PHANTOM_AUTH_ERROR';
  data: {
    walletId?: string;
    addresses?: Array<{ addressType: string; address: string }>;
    error?: string;
  };
}

export interface SignMessageRequest extends WebViewMessage {
  type: 'PHANTOM_SIGN_MESSAGE';
  data: {
    message: string;
  };
}

export interface SignMessageResponse extends WebViewMessage {
  type: 'PHANTOM_SIGN_SUCCESS' | 'PHANTOM_SIGN_ERROR';
  data: {
    signature?: string;
    publicKey?: string;
    error?: string;
  };
}

export interface SignAndSendTransactionRequest extends WebViewMessage {
  type: 'PHANTOM_SIGN_AND_SEND_TRANSACTION';
  data: {
    transaction: any; // Transaction object
  };
}

export interface TransactionResponse extends WebViewMessage {
  type: 'PHANTOM_TRANSACTION_SUCCESS' | 'PHANTOM_TRANSACTION_ERROR';
  data: {
    signature?: string;
    publicKey?: string;
    error?: string;
  };
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export class WebViewBridge {
  private messageId = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    // Listen for messages from React Native
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this));

      // For iOS - messages come through document
      document.addEventListener('message', this.handleMessage.bind(this) as EventListener);
    }
  }

  /**
   * Check if we're running inside a React Native WebView
   */
  public isInWebView(): boolean {
    return typeof window !== 'undefined' && !!window.ReactNativeWebView;
  }

  /**
   * Request authentication through React Native
   */
  public async requestAuth(provider: 'google' | 'apple' = 'google'): Promise<AuthResponse['data']> {
    if (!this.isInWebView()) {
      throw new Error('Not running in React Native WebView');
    }

    const id = (++this.messageId).toString();
    const message: AuthRequest = {
      id,
      type: 'PHANTOM_AUTH_REQUEST',
      data: { provider }
    };

    return new Promise<AuthResponse['data']>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send to React Native
      window.ReactNativeWebView!.postMessage(JSON.stringify(message));

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Authentication timeout - no response from React Native app'));
        }
      }, 60000); // 60 second timeout for auth flow
    });
  }

  /**
   * Request message signing through React Native
   */
  public async requestSignMessage(message: string): Promise<SignMessageResponse['data']> {
    if (!this.isInWebView()) {
      throw new Error('Not running in React Native WebView');
    }

    const id = (++this.messageId).toString();
    const signRequest: SignMessageRequest = {
      id,
      type: 'PHANTOM_SIGN_MESSAGE',
      data: { message }
    };

    return new Promise<SignMessageResponse['data']>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send to React Native
      window.ReactNativeWebView!.postMessage(JSON.stringify(signRequest));

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Sign message timeout - no response from React Native app'));
        }
      }, 30000); // 30 second timeout for signing
    });
  }

  /**
   * Request transaction signing and sending through React Native
   */
  public async requestSignAndSendTransaction(transaction: any): Promise<TransactionResponse['data']> {
    if (!this.isInWebView()) {
      throw new Error('Not running in React Native WebView');
    }

    const id = (++this.messageId).toString();
    const transactionRequest: SignAndSendTransactionRequest = {
      id,
      type: 'PHANTOM_SIGN_AND_SEND_TRANSACTION',
      data: { transaction }
    };

    return new Promise<TransactionResponse['data']>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send to React Native
      window.ReactNativeWebView!.postMessage(JSON.stringify(transactionRequest));

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Transaction timeout - no response from React Native app'));
        }
      }, 60000); // 60 second timeout for transactions
    });
  }

  /**
   * Handle messages from React Native
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message: WebViewMessage = JSON.parse(event.data);

      if (this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id)!;
        this.pendingRequests.delete(message.id);

        if (message.type === 'PHANTOM_AUTH_SUCCESS' || message.type === 'PHANTOM_SIGN_SUCCESS' || message.type === 'PHANTOM_TRANSACTION_SUCCESS') {
          resolve(message.data);
        } else if (message.type === 'PHANTOM_AUTH_ERROR' || message.type === 'PHANTOM_SIGN_ERROR' || message.type === 'PHANTOM_TRANSACTION_ERROR') {
          reject(new Error(message.data?.error || 'Operation failed'));
        }
      }
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  }

  /**
   * Clean up event listeners
   */
  public dispose() {
    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('WebView bridge disposed'));
    }
    this.pendingRequests.clear();

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage.bind(this));
      document.removeEventListener('message', this.handleMessage.bind(this) as EventListener);
    }
  }
}