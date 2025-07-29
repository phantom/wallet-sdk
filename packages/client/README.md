# @phantom/client

HTTP client for Phantom Wallet API.

## Installation

```bash
npm install @phantom/client
# or
yarn add @phantom/client
```

## Usage

The `PhantomClient` class provides a fully typed HTTP client for interacting with Phantom's wallet service API.

### Basic Usage (Without Authentication)

```typescript
import { PhantomClient } from "@phantom/client";

const client = new PhantomClient({
  apiBaseUrl: "https://api.phantom.com",
  organizationId: "your-org-id",
});

// Use the client for public endpoints
const wallets = await client.getWallets();
```

### With Authentication (Using a Stamper)

The client accepts an optional `stamper` parameter that can be used to sign requests. You can use the `@phantom/api-key-stamper` package for API key authentication:

```typescript
import { PhantomClient } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";

// Create a stamper for authentication
const stamper = new ApiKeyStamper({
  apiSecretKey: "your-base58-encoded-secret-key",
});

// Create client with authentication
const client = new PhantomClient(
  {
    apiBaseUrl: "https://api.phantom.com",
    organizationId: "your-org-id",
  },
  stamper,
);

// Now you can use authenticated endpoints
const wallet = await client.createWallet("My Wallet");
```

### Available Methods

#### Wallet Management

- `createWallet(walletName?: string)` - Create a new wallet with default addresses for Solana, Ethereum, Bitcoin, and Sui
- `getWallets(limit?, offset?)` - List wallets for the organization with pagination support
- `getWalletAddresses(walletId, derivationPaths?)` - Get addresses for a wallet, optionally specifying custom derivation paths

#### Transaction & Signing

- `signAndSendTransaction(walletId, transaction, networkId)` - Sign and optionally submit a transaction to the blockchain
- `signMessage(walletId, message, networkId)` - Sign a message with a wallet's private key

#### Organization Management

- `getOrCreateOrganization(params)` - Get an existing organization or create a new one if it doesn't exist
- `createOrganization(params)` - Create a new organization
- `grantOrganizationAccess(params)` - Grant access permissions to an organization

#### Authentication Management

- `createAuthenticator(params)` - Create a new authenticator for a user in an organization
- `deleteAuthenticator(params)` - Delete an authenticator from a user in an organization

### Network Support

The client supports multiple blockchain networks through CAIP-2 identifiers:

```typescript
import { NetworkId } from "@phantom/client";

// Solana
await client.signAndSendTransaction(walletId, transaction, NetworkId.SOLANA_MAINNET);
await client.signAndSendTransaction(walletId, transaction, NetworkId.SOLANA_DEVNET);

// Ethereum
await client.signAndSendTransaction(walletId, transaction, NetworkId.ETHEREUM_MAINNET);
await client.signAndSendTransaction(walletId, transaction, NetworkId.ETHEREUM_SEPOLIA);

// Other supported networks
NetworkId.POLYGON_MAINNET;
NetworkId.OPTIMISM_MAINNET;
NetworkId.ARBITRUM_ONE;
NetworkId.BASE_MAINNET;
// ... and more
```

### Custom Stamper Implementation

You can implement your own stamper for custom authentication methods:

```typescript
class CustomStamper {
  async stamp(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Add your custom authentication logic here
    config.headers = config.headers || {};
    config.headers["Authorization"] = "Bearer your-token";
    return config;
  }
}

const client = new PhantomClient(config, new CustomStamper());
```

### Organization and Authentication Examples

```typescript
// Create or get an organization
const organization = await client.createOrganization({
  name: "My Organization",
  // ... other organization parameters
});

// Grant access to an organization
await client.grantOrganizationAccess({
  organizationId: "org-id",
  userId: "user-id",
  role: "admin",
  // ... other access parameters
});

// Create an authenticator for a user
const authenticator = await client.createAuthenticator({
  organizationId: "org-id",
  userId: "user-id",
  type: "passkey",
  // ... other authenticator parameters
});

// Delete an authenticator
await client.deleteAuthenticator({
  organizationId: "org-id",
  authenticatorId: "auth-id",
  // ... other parameters
});
```

## TypeScript Support

This package is written in TypeScript and provides full type definitions for all API methods and responses. All request parameter types are imported from `@phantom/openapi-wallet-service`.
