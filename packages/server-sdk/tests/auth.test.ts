import { createAuthenticatedAxiosInstance } from '../src/auth';
import nacl from 'tweetnacl';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('createAuthenticatedAxiosInstance', () => {
  let testKeypair: nacl.SignKeyPair;
  let mockAxiosInstance: any;
  let mockInterceptor: any;

  beforeEach(() => {
    // Create a test keypair
    testKeypair = nacl.sign.keyPair();

    // Reset mocks
    mockInterceptor = {
      request: {
        use: jest.fn()
      }
    };

    mockAxiosInstance = {
      interceptors: mockInterceptor
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an axios instance', () => {
    createAuthenticatedAxiosInstance(testKeypair);
    
    expect(mockedAxios.create).toHaveBeenCalledTimes(1);
    expect(mockedAxios.create).toHaveBeenCalledWith();
  });

  it('should add a request interceptor', () => {
    createAuthenticatedAxiosInstance(testKeypair);
    
    expect(mockInterceptor.request.use).toHaveBeenCalledTimes(1);
    expect(mockInterceptor.request.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should return the axios instance', () => {
    const result = createAuthenticatedAxiosInstance(testKeypair);
    
    expect(result).toBe(mockAxiosInstance);
  });

  describe('Request Interceptor', () => {
    let interceptorFunction: Function;

    beforeEach(() => {
      createAuthenticatedAxiosInstance(testKeypair);
      interceptorFunction = mockInterceptor.request.use.mock.calls[0][0];
    });

    it('should sign string request data with Ed25519', () => {
      const config = {
        data: 'test request body',
        headers: {}
      };

      const result = interceptorFunction(config);

      // Verify signature header was added
      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      expect(typeof result.headers['X-Phantom-Sig']).toBe('string');

      // Verify the signature is valid base64
      expect(() => Buffer.from(result.headers['X-Phantom-Sig'], 'base64')).not.toThrow();

      // Verify the signature
      const dataUtf8 = Buffer.from(config.data, 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should sign object request data as JSON', () => {
      const config = {
        data: { message: 'test', value: 123 },
        headers: {}
      };

      const result = interceptorFunction(config);

      // Verify signature header was added
      expect(result.headers['X-Phantom-Sig']).toBeDefined();

      // Verify the signature
      const jsonString = JSON.stringify(config.data);
      const dataUtf8 = Buffer.from(jsonString, 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle empty string data', () => {
      const config = {
        data: '',
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      // Verify signature for empty string
      const dataUtf8 = Buffer.from('', 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle null data as JSON', () => {
      const config = {
        data: null,
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      // null should be stringified as "null"
      const dataUtf8 = Buffer.from('null', 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle undefined data', () => {
      const config = {
        data: undefined,
        headers: {}
      };

      // JSON.stringify(undefined) returns undefined (not a string)
      // which will cause Buffer.from to throw an error
      expect(() => interceptorFunction(config)).toThrow();
    });

    it('should handle complex nested objects', () => {
      const config = {
        data: {
          user: {
            name: 'Test User',
            id: 12345,
            tags: ['admin', 'user']
          },
          timestamp: new Date('2023-01-01').toISOString(),
          active: true
        },
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      const jsonString = JSON.stringify(config.data);
      const dataUtf8 = Buffer.from(jsonString, 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle arrays as request data', () => {
      const config = {
        data: [1, 2, 3, 'test', { key: 'value' }],
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      const jsonString = JSON.stringify(config.data);
      const dataUtf8 = Buffer.from(jsonString, 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should preserve existing headers', () => {
      const config = {
        data: 'test data',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      };

      const result = interceptorFunction(config);

      // Original headers should be preserved
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer token123');
      expect(result.headers['X-Custom-Header']).toBe('custom-value');
      
      // And signature header should be added
      expect(result.headers['X-Phantom-Sig']).toBeDefined();
    });

    it('should handle UTF-8 characters correctly', () => {
      const config = {
        data: '🚀 Unicode test: 你好世界 émojis!',
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      const dataUtf8 = Buffer.from(config.data, 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle boolean values', () => {
      const config = {
        data: true,
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      // true should be stringified as "true"
      const dataUtf8 = Buffer.from('true', 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should handle number values', () => {
      const config = {
        data: 42.5,
        headers: {}
      };

      const result = interceptorFunction(config);

      expect(result.headers['X-Phantom-Sig']).toBeDefined();
      
      // 42.5 should be stringified as "42.5"
      const dataUtf8 = Buffer.from('42.5', 'utf8');
      const signature = Buffer.from(result.headers['X-Phantom-Sig'], 'base64');
      const isValid = nacl.sign.detached.verify(
        dataUtf8,
        signature,
        testKeypair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should produce different signatures for different data', () => {
      const config1 = {
        data: 'test data 1',
        headers: {}
      };

      const config2 = {
        data: 'test data 2',
        headers: {}
      };

      const result1 = interceptorFunction(config1);
      const result2 = interceptorFunction(config2);

      expect(result1.headers['X-Phantom-Sig']).not.toBe(result2.headers['X-Phantom-Sig']);
    });

    it('should produce same signature for same data', () => {
      const config = {
        data: 'test data',
        headers: {}
      };

      const result1 = interceptorFunction({ ...config, headers: {} });
      const result2 = interceptorFunction({ ...config, headers: {} });

      expect(result1.headers['X-Phantom-Sig']).toBe(result2.headers['X-Phantom-Sig']);
    });

    it('should return the config object', () => {
      const config = {
        data: 'test',
        headers: {},
        url: 'https://api.example.com',
        method: 'POST'
      };

      const result = interceptorFunction(config);

      expect(result).toBe(config);
      expect(result.url).toBe('https://api.example.com');
      expect(result.method).toBe('POST');
    });
  });

  describe('Edge cases', () => {
    it('should handle circular references in objects by letting JSON.stringify handle it', () => {
      createAuthenticatedAxiosInstance(testKeypair);
      const interceptorFunction = mockInterceptor.request.use.mock.calls[0][0];

      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      const config = {
        data: circularObj,
        headers: {}
      };

      // JSON.stringify will throw on circular references
      expect(() => interceptorFunction(config)).toThrow();
    });
  });
}); 