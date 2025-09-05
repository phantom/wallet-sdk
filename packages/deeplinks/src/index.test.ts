import {
  generateConnectDeeplink,
  generateSignMessageDeeplink,
  generateSignTransactionDeeplink,
  generateSignAndSendTransactionDeeplink,
  generateDisconnectDeeplink,
  getCurrentOrigin,
  buildRedirectLink,
  PHANTOM_DEEPLINKS_BASE_URL,
} from './index';

describe('@phantom/deeplinks', () => {
  const mockEncryptedPayload = {
    data: "encrypted_data_string",
    nonce: "nonce_string"
  };

  const mockPublicKey = "4XoBQm5uqgKZHDDXpg6sVcV2NbfhP2ECUCqSzjXHbAkR";

  describe('generateConnectDeeplink', () => {
    it('should generate basic connect URL', () => {
      const url = generateConnectDeeplink({
        dappEncryptionPublicKey: mockPublicKey
      });

      expect(url).toBe(`${PHANTOM_DEEPLINKS_BASE_URL}/connect?dapp_encryption_public_key=${mockPublicKey}`);
    });

    it('should generate connect URL with all optional parameters', () => {
      const url = generateConnectDeeplink({
        dappEncryptionPublicKey: mockPublicKey,
        cluster: "mainnet-beta",
        appUrl: "https://myapp.com",
        redirectLink: "https://myapp.com/callback"
      });

      expect(url).toContain(`dapp_encryption_public_key=${mockPublicKey}`);
      expect(url).toContain('cluster=mainnet-beta');
      expect(url).toContain('app_url=https%3A%2F%2Fmyapp.com');
      expect(url).toContain('redirect_link=https%3A%2F%2Fmyapp.com%2Fcallback');
    });
  });

  describe('generateSignMessageDeeplink', () => {
    it('should generate sign message URL', () => {
      const url = generateSignMessageDeeplink({
        data: mockEncryptedPayload
      });

      expect(url).toBe(`${PHANTOM_DEEPLINKS_BASE_URL}/signMessage?data=${mockEncryptedPayload.data}&nonce=${mockEncryptedPayload.nonce}`);
    });

    it('should generate sign message URL with redirect link', () => {
      const url = generateSignMessageDeeplink({
        data: mockEncryptedPayload,
        redirectLink: "https://myapp.com/callback"
      });

      expect(url).toContain(`data=${mockEncryptedPayload.data}`);
      expect(url).toContain(`nonce=${mockEncryptedPayload.nonce}`);
      expect(url).toContain('redirect_link=https%3A%2F%2Fmyapp.com%2Fcallback');
    });
  });

  describe('generateSignTransactionDeeplink', () => {
    it('should generate sign transaction URL', () => {
      const url = generateSignTransactionDeeplink({
        data: mockEncryptedPayload
      });

      expect(url).toBe(`${PHANTOM_DEEPLINKS_BASE_URL}/signTransaction?data=${mockEncryptedPayload.data}&nonce=${mockEncryptedPayload.nonce}`);
    });
  });

  describe('generateSignAndSendTransactionDeeplink', () => {
    it('should generate sign and send transaction URL', () => {
      const url = generateSignAndSendTransactionDeeplink({
        data: mockEncryptedPayload
      });

      expect(url).toBe(`${PHANTOM_DEEPLINKS_BASE_URL}/signAndSendTransaction?data=${mockEncryptedPayload.data}&nonce=${mockEncryptedPayload.nonce}`);
    });
  });

  describe('generateDisconnectDeeplink', () => {
    it('should generate disconnect URL without data', () => {
      const url = generateDisconnectDeeplink();

      expect(url).toBe(`${PHANTOM_DEEPLINKS_BASE_URL}/disconnect`);
    });

    it('should generate disconnect URL with encrypted data', () => {
      const url = generateDisconnectDeeplink({
        data: mockEncryptedPayload,
        redirectLink: "https://myapp.com"
      });

      expect(url).toContain(`data=${mockEncryptedPayload.data}`);
      expect(url).toContain(`nonce=${mockEncryptedPayload.nonce}`);
      expect(url).toContain('redirect_link=https%3A%2F%2Fmyapp.com');
    });
  });

  describe('getCurrentOrigin', () => {
    it('should return empty string in Node.js environment', () => {
      const origin = getCurrentOrigin();
      expect(origin).toBe("");
    });

    it('should return window.location.origin in browser environment', () => {
      // Mock window object
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            origin: 'https://example.com'
          }
        },
        writable: true,
        configurable: true
      });

      const origin = getCurrentOrigin();
      expect(origin).toBe('https://example.com');

      // Clean up
      delete (global as any).window;
    });
  });

  describe('buildRedirectLink', () => {
    describe('with window object', () => {
      beforeEach(() => {
        // Mock window object for browser environment
        Object.defineProperty(global, 'window', {
          value: {
            location: {
              origin: 'https://myapp.com'
            }
          },
          writable: true,
          configurable: true
        });
      });

      afterEach(() => {
        // Clean up
        delete (global as any).window;
      });

      it('should build redirect link with current origin', () => {
        const link = buildRedirectLink();
        expect(link).toBe('https://myapp.com');
      });

      it('should build redirect link with base path', () => {
        const link = buildRedirectLink('/callback');
        expect(link).toBe('https://myapp.com/callback');
      });
    });

    it('should return empty string when no window object', () => {
      // This test runs in Node.js environment where window is undefined by default
      const link = buildRedirectLink();
      expect(link).toBe('');
    });
  });
});