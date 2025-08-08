# @phantom/crypto

Cryptographic utilities for Phantom SDK, providing Ed25519 key generation, key pair management, and digital signing functionality.

## Features

- **Ed25519 Key Pair Generation**: Generate cryptographically secure key pairs
- **Key Pair Recovery**: Recreate key pairs from existing secret keys
- **Digital Signing**: Sign data using Ed25519 with detached signatures
- **Base58 Encoding**: All keys are encoded in base58 format for compatibility
- **Cross-platform**: Works in both Node.js and browser environments

## Installation

```bash
npm install @phantom/crypto
# or
yarn add @phantom/crypto
```

## Usage

### Generate a New Key Pair

```typescript
import { generateKeyPair } from "@phantom/crypto";

const keyPair = generateKeyPair();
console.log("Public Key:", keyPair.publicKey);
console.log("Secret Key:", keyPair.secretKey);
```

### Create Key Pair from Existing Secret Key

```typescript
import { createKeyPairFromSecret } from "@phantom/crypto";

const existingSecretKey = "your-base58-encoded-secret-key";
const keyPair = createKeyPairFromSecret(existingSecretKey);
console.log("Recovered Public Key:", keyPair.publicKey);
```

### Sign Data

```typescript
import { signWithSecret } from "@phantom/crypto";

const secretKey = "your-base58-encoded-secret-key";
const message = "Hello, world!";

const signature = signWithSecret(secretKey, message);
console.log("Signature:", signature);
```

## API Reference

### Types

#### `Keypair`

```typescript
interface Keypair {
  publicKey: string; // Base58-encoded public key
  secretKey: string; // Base58-encoded secret key
}
```

### Functions

#### `generateKeyPair(): Keypair`

Generates a new Ed25519 key pair with cryptographically secure random keys.

**Returns:** A `Keypair` object with base58-encoded public and secret keys.

#### `createKeyPairFromSecret(b58PrivateKey: string): Keypair`

Reconstructs a key pair from an existing base58-encoded secret key.

**Parameters:**

- `b58PrivateKey`: Base58-encoded private key string

**Returns:** A `Keypair` object with the corresponding public key derived from the secret key.

#### `signWithSecret(secretKey: string | Uint8Array, data: string | Uint8Array | Buffer): Uint8Array`

Signs data using Ed25519 with a secret key, producing a detached signature.

**Parameters:**

- `secretKey`: Base58-encoded secret key string or raw Uint8Array
- `data`: Data to sign (accepts string, Uint8Array, or Buffer)

**Returns:** Raw signature as Uint8Array

## Security Notes

- Always keep secret keys secure and never expose them in client-side code
- Use cryptographically secure random number generation (provided by TweetNaCl)
- Ed25519 provides strong security with 128-bit security level
- Signatures are deterministic but secure against forgery

## Dependencies

This package uses:

- **TweetNaCl**: Cryptographic library for Ed25519 operations
- **bs58**: Base58 encoding/decoding
- **buffer**: Buffer polyfill for cross-platform compatibility

## License

MIT
