# @phantom/embedded-provider-core

Platform-agnostic embedded provider core logic for Phantom Wallet SDK.

## Overview

This package contains the core business logic for Phantom's embedded wallet provider, designed to be shared across different platforms (browser, React Native, etc.). It provides a unified interface for wallet operations while allowing platform-specific implementations through adapters.

## Architecture

The embedded provider core follows a platform adapter pattern:

```
┌─────────────────────────────────────┐
│         Platform SDK                │
│    (browser-sdk, react-native)      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      EmbeddedProvider (Core)        │
│  - Authentication flows             │
│  - Session management               │
│  - Wallet operations                │
│  - Business logic                   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Platform Adapters             │
│  - Storage (IndexedDB/AsyncStorage) │
│  - Auth (redirects/deep links)      │
│  - URL params (window/linking)      │
│  - Logger (debug/console)           │
└─────────────────────────────────────┘
```

## Key Features

- **Cross-platform compatibility**: Share 90%+ of wallet logic across platforms
- **Clean separation of concerns**: Platform-specific code isolated in adapters
- **Multiple auth flows**: JWT, Google OAuth, Apple OAuth, app-wallet creation
- **Session management**: Persistent sessions with validation and recovery
- **Retry logic**: Built-in retry with exponential backoff for network operations
- **Type safety**: Full TypeScript support with comprehensive interfaces

## Usage

### Basic Setup

```typescript
import {
  EmbeddedProvider,
  EmbeddedProviderConfig,
  PlatformAdapter,
  DebugLogger,
} from "@phantom/embedded-provider-core";

// 1. Define your configuration
const config: EmbeddedProviderConfig = {
  apiBaseUrl: "https://api.phantom.app",
  appId: "your-app-id",
  embeddedWalletType: "user-wallet", // or 'app-wallet'
  addressTypes: ["solana", "ethereum"],
  authOptions: {
    authUrl: "https://auth.phantom.app",
    redirectUrl: "https://your-app.com/callback",
  },
};

// 2. Implement platform adapters (see examples below)
const platform: PlatformAdapter = {
  storage: new YourStorageAdapter(),
  authProvider: new YourAuthProvider(),
  urlParamsAccessor: new YourURLParamsAccessor(),
};

// 3. Implement logger
const logger: DebugLogger = new YourLogger();

// 4. Create provider instance
const provider = new EmbeddedProvider(config, platform, logger);

// 5. Use the provider
const result = await provider.connect();
console.log("Connected addresses:", result.addresses);
```

## Platform Adapter Interfaces

### Storage Adapter

Handles persistent session storage:

```typescript
import { EmbeddedStorage, Session } from "@phantom/embedded-provider-core";

export class YourStorageAdapter implements EmbeddedStorage {
  async getSession(): Promise<Session | null> {
    // Platform-specific session retrieval
    // Browser: IndexedDB, React Native: AsyncStorage
  }

  async saveSession(session: Session): Promise<void> {
    // Platform-specific session storage
  }

  async clearSession(): Promise<void> {
    // Platform-specific session cleanup
  }
}
```

### Auth Provider

Handles authentication flows:

```typescript
import { AuthProvider, AuthResult, PhantomConnectOptions } from "@phantom/embedded-provider-core";

export class YourAuthProvider implements AuthProvider {
  async authenticate(options: PhantomConnectOptions): Promise<void | AuthResult> {
    // Platform-specific authentication
    // Browser: window redirects, React Native: deep links
  }

  resumeAuthFromRedirect?(provider: EmbeddedProviderAuthType): AuthResult | null {
    // Resume authentication after redirect/deep link
  }
}
```

### URL Params Accessor

Handles URL parameter access:

```typescript
import { URLParamsAccessor } from "@phantom/embedded-provider-core";

export class YourURLParamsAccessor implements URLParamsAccessor {
  getParam(key: string): string | null {
    // Platform-specific URL parameter access
    // Browser: window.location.search, React Native: Linking.getInitialURL()
  }
}
```

### Debug Logger

Handles logging:

```typescript
import { DebugLogger } from "@phantom/embedded-provider-core";

export class YourLogger implements DebugLogger {
  info(category: string, message: string, data?: any): void {
    // Platform-specific logging
  }

  warn(category: string, message: string, data?: any): void {
    // Platform-specific warning
  }

  error(category: string, message: string, data?: any): void {
    // Platform-specific error logging
  }

  log(category: string, message: string, data?: any): void {
    // Platform-specific debug logging
  }
}
```

## Authentication Flows

### JWT Authentication

For server-side authenticated users:

```typescript
const authOptions = {
  provider: "jwt",
  jwtToken: "your-jwt-token",
};

const result = await provider.connect(authOptions);
```

### OAuth Authentication

For social login flows:

```typescript
// Google OAuth
const authOptions = {
  provider: "google",
};

await provider.connect(authOptions); // Will redirect/deep link

// Apple OAuth
const authOptions = {
  provider: "apple",
};

await provider.connect(authOptions); // Will redirect/deep link
```

### App Wallet

For application-controlled wallets:

```typescript
const config = {
  // ... other config
  embeddedWalletType: "app-wallet",
};

const result = await provider.connect(); // No auth needed
```

## Session Management

Sessions are automatically managed by the core provider:

```typescript
// Check connection status
if (provider.isConnected()) {
  const addresses = provider.getAddresses();
  console.log("Available addresses:", addresses);
}

// Sign a message
const signature = await provider.signMessage({
  message: "Hello, world!",
  networkId: "solana:mainnet",
});

// Sign and send transaction
const result = await provider.signAndSendTransaction({
  transaction: transactionBytes,
  networkId: "solana:mainnet",
});

// Disconnect
await provider.disconnect();
```

## Error Handling

The core provider provides detailed error messages:

```typescript
try {
  await provider.connect();
} catch (error) {
  if (error.message.includes("JWT")) {
    // Handle JWT authentication errors
  } else if (error.message.includes("Storage")) {
    // Handle storage errors
  } else if (error.message.includes("Network")) {
    // Handle network errors
  }
}
```

## Configuration Options

```typescript
interface EmbeddedProviderConfig {
  // Required
  apiBaseUrl: string; // Phantom API base URL
  appId: string;
  embeddedWalletType: "app-wallet" | "user-wallet";
  addressTypes: [AddressType, ...AddressType[]]; // Supported blockchain addresses

  // Optional
  authOptions?: {
    authUrl?: string; // Custom auth URL
    redirectUrl?: string; // OAuth redirect URL
  };
}
```

## Session Object

```typescript
interface Session {
  sessionId: string; // Unique session identifier
  walletId: string; // Phantom wallet ID
  keypair: {
    // Cryptographic keypair
    publicKey: string;
    secretKey: string;
  };
  authProvider: string; // Auth method used
  userInfo: Record<string, any>; // User information
  status: "pending" | "completed"; // Session status
  createdAt: number; // Creation timestamp
  lastUsed: number; // Last access timestamp
}
```

## Best Practices

1. **Platform Adapters**: Keep platform-specific code in adapters only
2. **Error Handling**: Always handle authentication and network errors
3. **Session Validation**: The core automatically validates sessions
4. **Logging**: Use structured logging with categories for debugging
5. **Security**: Never log sensitive data like private keys

## Examples

See the `@phantom/browser-sdk` package for a complete implementation example using this core package with browser-specific adapters.

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Run tests
yarn test

# Run linting
yarn lint

# Format code
yarn prettier
```

## Contributing

This package is designed to be extended for new platforms. When adding support for a new platform:

1. Implement all required platform adapter interfaces
2. Add comprehensive tests for your adapters
3. Update documentation with platform-specific examples
4. Ensure error handling covers platform-specific edge cases

## License

MIT
