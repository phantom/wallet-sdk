# @phantom/indexed-db-stamper

A secure IndexedDB-based key stamper for the Phantom Wallet SDK that stores cryptographic keys directly in the browser's IndexedDB without ever exposing private key material.

## Features

- **Maximum Security**: Uses non-extractable ECDSA P-256 keys that never exist in JavaScript memory
- **Web Crypto API**: Leverages browser's native cryptographic secure context
- **Secure Storage**: Keys stored as non-extractable CryptoKey objects in IndexedDB
- **DER Signatures**: Converts Web Crypto IEEE P1363 signatures to standard DER format
- **Hardware Integration**: Utilizes browser's hardware-backed cryptographic isolation when available
- **Compatible Interface**: Drop-in replacement for other stamper implementations

## Installation

```bash
npm install @phantom/indexed-db-stamper
```

## Usage

### Basic Usage

```typescript
import { IndexedDbStamper } from '@phantom/indexed-db-stamper';

// Create stamper instance
const stamper = new IndexedDbStamper({
  dbName: 'my-app-keys',      // optional, defaults to 'phantom-indexed-db-stamper'
  storeName: 'crypto-keys',   // optional, defaults to 'crypto-keys'
  keyName: 'signing-key'      // optional, defaults to 'signing-key'
});

// Initialize and generate/load keys
const keyInfo = await stamper.init();
console.log('Key ID:', keyInfo.keyId);
console.log('Public Key:', keyInfo.publicKey);

// Sign data
const signature = await stamper.sign('Hello, World!');
console.log('Signature:', signature);

// Create API request signature
const payload = { action: 'transfer', amount: 100 };
const stamp = await stamper.stamp(payload);
```

### Advanced Usage

```typescript
// Check if already initialized
if (stamper.getKeyInfo()) {
  console.log('Stamper already has keys');
} else {
  await stamper.init();
}

// Reset keys (generate new keypair)
const newKeyInfo = await stamper.resetKeyPair();

// Sign different data types
await stamper.sign('string data');
await stamper.sign(new Uint8Array([1, 2, 3]));
await stamper.sign(Buffer.from('buffer data'));

// Clear all stored keys
await stamper.clear();
```

## API Reference

### Constructor

```typescript
new IndexedDbStamper(config?: IndexedDbStamperConfig)
```

**Config Options:**
- `dbName?: string` - IndexedDB database name (default: 'phantom-indexed-db-stamper')
- `storeName?: string` - Object store name (default: 'crypto-keys')  
- `keyName?: string` - Key identifier prefix (default: 'signing-key')

### Methods

#### `init(): Promise<StamperKeyInfo>`
Initialize the stamper and generate/load cryptographic keys.

**Returns:** `StamperKeyInfo` with `keyId` and `publicKey`

#### `getKeyInfo(): StamperKeyInfo | null`
Get current key information without async operation.

#### `resetKeyPair(): Promise<StamperKeyInfo>`  
Generate and store a new key pair, replacing any existing keys.

#### `sign(data: string | Uint8Array | Buffer): Promise<string>`
Sign data using the stored private key.

**Returns:** Base64url-encoded DER signature

#### `stamp(payload: any): Promise<string>`
Create a signature for API requests (compatible with other stamper interfaces).

#### `clear(): Promise<void>`
Remove all stored keys from IndexedDB.

## Security Features

### Non-Extractable Keys
The stamper generates ECDSA P-256 CryptoKey objects with `extractable: false`, meaning private keys cannot be exported, extracted, or accessed outside of Web Crypto API signing operations. This provides the strongest possible security in browser environments.

### Cryptographic Isolation  
Keys are generated and stored entirely within the browser's secure cryptographic context:
- Private keys never exist in JavaScript memory at any point
- Signing operations happen within Web Crypto API secure boundaries
- Hardware security modules used when available by the browser
- Origin-based security isolation through IndexedDB

### Signature Format Compatibility
The stamper automatically converts ECDSA signatures from IEEE P1363 format (64 bytes for P-256) to DER format for broader compatibility with cryptographic libraries and standards.

## Error Handling

The stamper includes comprehensive error handling for:

```typescript
// Environment validation
if (typeof window === 'undefined') {
  throw new Error('IndexedDbStamper requires a browser environment');
}

// Initialization checks
if (!stamper.getKeyInfo()) {
  throw new Error('Stamper not initialized. Call init() first.');
}

// Storage errors
try {
  await stamper.init();
} catch (error) {
  console.error('Failed to initialize stamper:', error);
}
```

## Browser Compatibility

Requires IndexedDB and Web Crypto API support.

## License

MIT