# @phantom/api-key-stamper

API key stamper for authenticating requests to Phantom Wallet API.

## Installation

```bash
npm install @phantom/api-key-stamper
# or
yarn add @phantom/api-key-stamper
```

## Usage

The `ApiKeyStamper` is used to sign HTTP requests with Ed25519 signatures for authentication with Phantom's API.

### Basic Usage

```typescript
import { ApiKeyStamper } from '@phantom/api-key-stamper';
import { PhantomClient } from '@phantom/client';

// Create a stamper with your secret key
const stamper = new ApiKeyStamper({
  apiSecretKey: 'your-base58-encoded-secret-key'
});

// Use it with PhantomClient
const client = new PhantomClient({
  baseUrl: 'https://api.phantom.com',
  organizationId: 'your-org-id'
}, stamper);

// Now all requests will be automatically signed
const wallet = await client.createWallet('My Wallet');
```

### With Server SDK

The `@phantom/server-sdk` package uses this stamper internally:

```typescript
import { ServerSDK } from '@phantom/server-sdk';

const sdk = new ServerSDK({
  organizationId: 'your-org-id',
  apiBaseUrl: 'https://api.phantom.com',
  apiPrivateKey: 'your-base58-encoded-secret-key'
});

// The SDK automatically creates and uses an ApiKeyStamper
const wallet = await sdk.createWallet('My Wallet');
```

### How it Works

1. The stamper takes your base58-encoded Ed25519 secret key
2. For each request, it signs the request body with the secret key
3. The signature is added to the request headers as `X-Phantom-Sig` in base64url format
4. The server verifies the signature to authenticate the request

### Security Notes

- Keep your secret key secure and never expose it in client-side code
- Only use this stamper in server-side applications
- The secret key should be stored securely (e.g., in environment variables)

## API Reference

### ApiKeyStamper

```typescript
class ApiKeyStamper {
  constructor(config: ApiKeyStamperConfig)
  stamp(config: AxiosRequestConfig): Promise<AxiosRequestConfig>
}

interface ApiKeyStamperConfig {
  apiSecretKey: string  // Base58-encoded Ed25519 secret key
}
```