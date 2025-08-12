import { Stamper, StamperWithKeyManagement, StamperKeyInfo } from './index';

describe('SDK Types', () => {
  it('should export Stamper interface', () => {
    // This is a type-only test - if it compiles, the types are working
    const stamper: Stamper = {
      stamp: async (params: any) => {
        return 'mock-stamp';
      }
    };
    
    expect(stamper).toBeDefined();
  });

  it('should export StamperWithKeyManagement interface', () => {
    // This is a type-only test - if it compiles, the types are working
    const stamperWithKeyManagement: StamperWithKeyManagement = {
      stamp: async (params: any) => {
        return 'mock-stamp';
      },
      init: async () => {
        return { keyId: 'test', publicKey: 'test' };
      },
      getKeyInfo: () => {
        return { keyId: 'test', publicKey: 'test' };
      }
    };
    
    expect(stamperWithKeyManagement).toBeDefined();
  });

  it('should export StamperKeyInfo interface', () => {
    const keyInfo: StamperKeyInfo = {
      keyId: 'test-key-id',
      publicKey: 'test-public-key'
    };
    
    expect(keyInfo.keyId).toBe('test-key-id');
    expect(keyInfo.publicKey).toBe('test-public-key');
  });
});