# @phantom/phantom-wallet-stamper

A stamper implementation for integrating with external Phantom wallets (browser extension and mobile app).

## Overview

The PhantomWalletStamper allows you to connect to an external Phantom wallet and use it to sign requests for authentication with the Phantom KMS API. This is useful for scenarios where you want to:

1. Connect to a user's existing Phantom wallet (browser extension or mobile app)
2. Use the wallet's private key to stamp/authenticate API requests
3. Create a local organization tied to that external wallet
4. Generate a local keypair for subsequent operations

## Installation

```bash
npm install @phantom/phantom-wallet-stamper
```

## Usage

### Browser (Extension) Integration

```typescript
import { PhantomWalletStamper } from '@phantom/phantom-wallet-stamper';
import { PhantomClient } from '@phantom/client';

// Create the stamper
const stamper = new PhantomWalletStamper({
  platform: 'browser', // or 'auto' to detect automatically
  timeout: 30000 // 30 second timeout
});

// Initialize and connect to Phantom wallet
const stamperInfo = await stamper.init();
console.log('Connected to wallet:', stamperInfo.publicKey);

// Use with PhantomClient to create organization
const client = new PhantomClient({ apiBaseUrl: 'your-api-url' }, stamper);

// Get or create organization using external wallet
const organization = await client.getOrCreatePhantomOrganization({
  publicKey: stamperInfo.publicKey
});

// Now create a local wallet with a fixed tag
const wallet = await client.getOrCreateWalletWithTag({
  organizationId: organization.organizationId,
  tag: 'solana-account',
  derivationPaths: ['m/44\'/501\'/0\'/0\''] // Solana path
});
```

### Mobile Integration

Mobile integration uses deep links to connect to the Phantom mobile app:

```typescript
const stamper = new PhantomWalletStamper({
  platform: 'mobile'
});

try {
  await stamper.init(); // Will open phantom://connect deep link
} catch (error) {
  // Mobile implementation requires additional callback handling
  console.error('Mobile connection not yet fully implemented');
}
```

### Configuration

```typescript
interface PhantomWalletStamperConfig {
  platform?: 'browser' | 'mobile' | 'auto'; // Default: 'auto'
  timeout?: number; // Connection timeout in ms, default: 30000
}
```

## API Reference

### PhantomWalletStamper

#### Methods

- `init()`: Initialize and connect to the Phantom wallet
- `stamp(data: { data: Uint8Array })`: Sign data with the external wallet's private key
- `getKeyInfo()`: Get information about the connected wallet's key
- `signTransaction(transaction: Uint8Array)`: Sign a transaction with the external wallet
- `disconnect()`: Disconnect from the external wallet

#### Properties

- `algorithm`: Always "Ed25519" for Solana compatibility

## Platform Detection

The stamper automatically detects the platform:

- **Browser**: Checks for `window.phantom.solana` presence
- **Mobile**: Detects mobile user agents and uses deep links
- **Auto**: Automatically chooses the appropriate method

## Error Handling

Common errors and solutions:

- `"Phantom wallet extension not found"`: Install the Phantom browser extension
- `"Connection to Phantom wallet timed out"`: Increase timeout or check wallet availability
- `"Mobile deep linking not supported"`: Mobile implementation needs additional work

## Integration Flow

1. **Connect**: Use PhantomWalletStamper to connect to external wallet
2. **Authenticate**: Stamp requests with external wallet's private key
3. **Create Organization**: Call `getOrCreatePhantomOrganization` with external public key
4. **Create Local Wallet**: Use `getOrCreateWalletWithTag` for consistent wallet management
5. **Local Operations**: Switch to local keypair (IndexedDBStamper) for subsequent requests

This stamper is designed to work seamlessly with the existing Phantom SDK architecture while providing external wallet integration capabilities.