import { 
  PhantomProvider,
  usePhantom,
  useConnect,
  useDisconnect,
  useAccounts,
  useSignMessage,
  useSignAndSendTransaction,
} from './index';

describe('React Native SDK Exports', () => {
  it('should export PhantomProvider', () => {
    expect(PhantomProvider).toBeDefined();
    expect(typeof PhantomProvider).toBe('function');
  });

  it('should export usePhantom hook', () => {
    expect(usePhantom).toBeDefined();
    expect(typeof usePhantom).toBe('function');
  });

  it('should export individual hooks', () => {
    expect(useConnect).toBeDefined();
    expect(typeof useConnect).toBe('function');
    
    expect(useDisconnect).toBeDefined();
    expect(typeof useDisconnect).toBe('function');
    
    expect(useAccounts).toBeDefined();
    expect(typeof useAccounts).toBe('function');
    
    expect(useSignMessage).toBeDefined();
    expect(typeof useSignMessage).toBe('function');
    
    expect(useSignAndSendTransaction).toBeDefined();
    expect(typeof useSignAndSendTransaction).toBe('function');
  });

  it('should have consistent API structure', async () => {
    // Test that our main exports match expected patterns
    const indexModule = await import('./index');
    const exports = Object.keys(indexModule);
    
    expect(exports).toContain('PhantomProvider');
    expect(exports).toContain('usePhantom');
    expect(exports).toContain('useConnect');
    expect(exports).toContain('useDisconnect');
    expect(exports).toContain('useAccounts');
    expect(exports).toContain('useSignMessage');
    expect(exports).toContain('useSignAndSendTransaction');
  });
});