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

// Create X-Phantom-Stamp header value for API requests
const requestData = Buffer.from(JSON.stringify({ action: 'transfer', amount: 100 }), 'utf8');
const stamp = await stamper.stamp(requestData);
console.log('X-Phantom-Stamp:', stamp);
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

// Stamp different data types
const stringData = Buffer.from('string data', 'utf8');
const binaryData = Buffer.from([1, 2, 3]);
const jsonData = Buffer.from(JSON.stringify({ key: 'value' }), 'utf8');

await stamper.stamp(stringData);
await stamper.stamp(binaryData);
await stamper.stamp(jsonData);

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

#### `stamp(data: Buffer): Promise<string>`
Create X-Phantom-Stamp header value using the stored private key.

**Parameters:**
- `data: Buffer` - Data to sign (typically JSON stringified request body)

**Returns:** Complete X-Phantom-Stamp header value (base64url-encoded JSON with publicKey, signature, and kind fields)

#### `clear(): Promise<void>`
Remove all stored keys from IndexedDB.

## Security Features

### Non-Extractable Keys
The stamper generates ECDSA P-256 CryptoKey objects with `extractable: false`, meaning private keys cannot be exported, extracted, or accessed outside of Web Crypto API signing operations. This provides the strongest possible security in browser environments.

### Cryptographic Isolation  
Keys are generated and stored entirely within the browser's secure cryptographic context:
- Private keys never exist in JavaScript memory at any point
- Signing operations happen within Web Crypto API secure boundaries
- Secure elements used when available by the browser
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