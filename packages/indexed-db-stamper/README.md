# @phantom/indexed-db-stamper

A secure IndexedDB-based key stamper for the Phantom Wallet SDK that stores cryptographic keys directly in the browser's IndexedDB without ever exposing private key material.

## Features

- **Maximum Security**: Uses non-extractable Ed25519 keys that never exist in JavaScript memory
- **Web Crypto API**: Leverages browser's native cryptographic secure context
- **Secure Storage**: Keys stored as non-extractable CryptoKey objects in IndexedDB
- **Raw Signatures**: Uses Ed25519 raw signature format for maximum efficiency
- **Hardware Integration**: Utilizes browser's hardware-backed cryptographic isolation when available
- **Compatible Interface**: Drop-in replacement for other stamper implementations

## Installation

```bash
npm install @phantom/indexed-db-stamper
```

## Usage

### Basic Usage

```typescript
import { IndexedDbStamper } from "@phantom/indexed-db-stamper";

// Create stamper instance
const stamper = new IndexedDbStamper({
  dbName: "my-app-keys", // optional, defaults to 'phantom-indexed-db-stamper'
  storeName: "crypto-keys", // optional, defaults to 'crypto-keys'
  keyName: "signing-key", // optional, defaults to 'signing-key',
  type: "PKI", // optional, defaults to 'PKI', accepts 'PKI' or 'OIDC'
  idToken?: undefined, // required for OIDC type, optional for PKI
  salt?: undefined, // required for OIDC type, optional for PKI
});

// Initialize and generate/load keys
const keyInfo = await stamper.init();
console.log("Key ID:", keyInfo.keyId);
console.log("Public Key:", keyInfo.publicKey);

// Create X-Phantom-Stamp header value for API requests
const requestData = Buffer.from(JSON.stringify({ action: "transfer", amount: 100 }), "utf8");
const stamp = await stamper.stamp({ data: requestData });
console.log("X-Phantom-Stamp:", stamp);
```

### Advanced Usage

```typescript
// Check if already initialized
if (stamper.getKeyInfo()) {
  console.log("Stamper already has keys");
} else {
  await stamper.init();
}

// Reset keys (generate new keypair)
const newKeyInfo = await stamper.resetKeyPair();

// Stamp different data types with PKI (default)
const stringData = Buffer.from("string data", "utf8");
const binaryData = Buffer.from([1, 2, 3]);
const jsonData = Buffer.from(JSON.stringify({ key: "value" }), "utf8");

await stamper.stamp({ data: stringData });
await stamper.stamp({ data: binaryData }); // explicit PKI type
await stamper.stamp({ data: jsonData });

// OIDC type stamping (requires idToken and salt)
const oidcStamp = await stamper.stamp({
  data: requestData,
  type: "OIDC",
  idToken: "your-id-token",
  salt: "your-salt-value",
});

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

#### `stamp(params: { data: Buffer; type?: 'PKI'; idToken?: never; salt?: never; } | { data: Buffer; type: 'OIDC'; idToken: string; salt: string; }): Promise<string>`

Create X-Phantom-Stamp header value using the stored private key.

**Parameters:**

- `params.data: Buffer` - Data to sign (typically JSON stringified request body)
- `params.type?: 'PKI' | 'OIDC'` - Stamp type (defaults to 'PKI')
- `params.idToken?: string` - Required for OIDC type
- `params.salt?: string` - Required for OIDC type

**Returns:** Complete X-Phantom-Stamp header value (base64url-encoded JSON with base64url-encoded publicKey, signature, and kind fields)

**Note:** The public key is stored internally in base58 format but converted to base64url when creating stamps for API compatibility.

#### `clear(): Promise<void>`

Remove all stored keys from IndexedDB.

## Security Features

### Non-Extractable Keys

The stamper generates Ed25519 CryptoKey objects with `extractable: false`, meaning private keys cannot be exported, extracted, or accessed outside of Web Crypto API signing operations. This provides the strongest possible security in browser environments.

### Cryptographic Isolation

Keys are generated and stored entirely within the browser's secure cryptographic context:

- Private keys never exist in JavaScript memory at any point
- Signing operations happen within Web Crypto API secure boundaries
- Secure elements used when available by the browser
- Origin-based security isolation through IndexedDB

### Signature Format

The stamper uses Ed25519 signatures in their native 64-byte format, providing efficient and secure signing operations.

## Error Handling

The stamper includes comprehensive error handling for:

```typescript
// Environment validation
if (typeof window === "undefined") {
  throw new Error("IndexedDbStamper requires a browser environment");
}

// Initialization checks
if (!stamper.getKeyInfo()) {
  throw new Error("Stamper not initialized. Call init() first.");
}

// Storage errors
try {
  await stamper.init();
} catch (error) {
  console.error("Failed to initialize stamper:", error);
}
```

## Browser Compatibility

Requires IndexedDB and Web Crypto API support.

## License

MIT
