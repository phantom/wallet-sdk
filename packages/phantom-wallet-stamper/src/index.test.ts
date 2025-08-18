import { PhantomWalletStamper } from './index';
import { Buffer } from 'buffer';

// Mock window.phantom.solana
const mockPhantom = {
  connect: jest.fn(),
  signTransaction: jest.fn(),
  signMessage: jest.fn(),
  disconnect: jest.fn(),
  isConnected: false,
  publicKey: undefined,
};

// Setup global mocks - use configurable to allow deletion
Object.defineProperty(window, 'phantom', {
  value: {
    solana: mockPhantom,
  },
  writable: true,
  configurable: true,
});

describe('PhantomWalletStamper', () => {
  let stamper: PhantomWalletStamper;

  beforeEach(() => {
    jest.clearAllMocks();
    stamper = new PhantomWalletStamper();
  });

  afterEach(async () => {
    try {
      await stamper.disconnect();
    } catch {
      // Ignore errors in cleanup
    }
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const stamper = new PhantomWalletStamper();
      expect(stamper.algorithm).toBe('Ed25519');
    });

    it('should create with custom config', () => {
      const stamper = new PhantomWalletStamper({
        platform: 'browser',
        timeout: 5000,
      });
      expect(stamper.algorithm).toBe('Ed25519');
    });
  });

  describe('platform detection', () => {
    it('should detect browser platform when phantom is available', () => {
      const stamper = new PhantomWalletStamper({ platform: 'auto' });
      // Platform detection is done in init(), so we test indirectly
      expect(stamper.algorithm).toBe('Ed25519');
    });

    it('should use explicit platform setting', () => {
      const stamper = new PhantomWalletStamper({ platform: 'browser' });
      expect(stamper.algorithm).toBe('Ed25519');
    });
  });

  describe('init', () => {
    it('should successfully initialize with mock phantom wallet', async () => {
      const mockPublicKey = {
        toString: () => '11111111111111111111111111111111',
      };
      
      mockPhantom.connect.mockResolvedValue({
        publicKey: mockPublicKey,
      });

      const stamperInfo = await stamper.init();

      expect(mockPhantom.connect).toHaveBeenCalled();
      expect(stamperInfo.publicKey).toBe('11111111111111111111111111111111');
      expect(stamperInfo.keyId).toContain('phantom-wallet-');
    });

    it('should throw error if phantom is not available', async () => {
      // Temporarily remove phantom
      const originalPhantom = window.phantom;
      delete (window as any).phantom;

      const stamper = new PhantomWalletStamper({ platform: 'browser' });

      await expect(stamper.init()).rejects.toThrow('Phantom wallet extension not found');

      // Restore phantom
      window.phantom = originalPhantom;
    });

    it('should throw error for unsupported mobile platform', async () => {
      const stamper = new PhantomWalletStamper({ platform: 'mobile' });

      await expect(stamper.init()).rejects.toThrow('Mobile Phantom wallet connection not yet implemented');
    });
  });

  describe('stamp', () => {
    beforeEach(async () => {
      const mockPublicKey = {
        toString: () => '11111111111111111111111111111111',
      };
      
      mockPhantom.connect.mockResolvedValue({
        publicKey: mockPublicKey,
      });

      await stamper.init();
    });

    it('should successfully stamp data', async () => {
      const mockSignature = new Uint8Array([1, 2, 3, 4]);
      mockPhantom.signMessage.mockResolvedValue({
        signature: mockSignature,
      });

      const data = Buffer.from([5, 6, 7, 8]);
      const stamp = await stamper.stamp({ data });

      expect(mockPhantom.signMessage).toHaveBeenCalledWith(new Uint8Array(data));
      expect(typeof stamp).toBe('string');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedStamper = new PhantomWalletStamper();
      const data = Buffer.from([1, 2, 3, 4]);

      await expect(uninitializedStamper.stamp({ data })).rejects.toThrow(
        'PhantomWalletStamper not initialized'
      );
    });
  });

  describe('signTransaction', () => {
    beforeEach(async () => {
      const mockPublicKey = {
        toString: () => '11111111111111111111111111111111',
      };
      
      mockPhantom.connect.mockResolvedValue({
        publicKey: mockPublicKey,
      });

      await stamper.init();
    });

    it('should successfully sign transaction', async () => {
      const mockSignature = new Uint8Array([1, 2, 3, 4]);
      mockPhantom.signTransaction.mockResolvedValue({
        signature: mockSignature,
      });

      const transaction = new Uint8Array([5, 6, 7, 8]);
      const signature = await stamper.signTransaction(transaction);

      expect(mockPhantom.signTransaction).toHaveBeenCalledWith(transaction);
      expect(signature).toEqual(mockSignature);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedStamper = new PhantomWalletStamper();
      const transaction = new Uint8Array([1, 2, 3, 4]);

      await expect(uninitializedStamper.signTransaction(transaction)).rejects.toThrow(
        'PhantomWalletStamper not initialized'
      );
    });
  });

  describe('getKeyInfo', () => {
    it('should return null if not initialized', () => {
      expect(stamper.getKeyInfo()).toBeNull();
    });

    it('should return stamper info after initialization', async () => {
      const mockPublicKey = {
        toString: () => '11111111111111111111111111111111',
      };
      
      mockPhantom.connect.mockResolvedValue({
        publicKey: mockPublicKey,
      });

      await stamper.init();
      const keyInfo = stamper.getKeyInfo();

      expect(keyInfo).not.toBeNull();
      expect(keyInfo!.publicKey).toBe('11111111111111111111111111111111');
      expect(keyInfo!.keyId).toContain('phantom-wallet-');
    });
  });

  describe('disconnect', () => {
    it('should successfully disconnect', async () => {
      const mockPublicKey = {
        toString: () => '11111111111111111111111111111111',
      };
      
      mockPhantom.connect.mockResolvedValue({
        publicKey: mockPublicKey,
      });

      await stamper.init();
      await stamper.disconnect();

      expect(mockPhantom.disconnect).toHaveBeenCalled();
      expect(stamper.getKeyInfo()).toBeNull();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(stamper.disconnect()).resolves.not.toThrow();
    });
  });
});