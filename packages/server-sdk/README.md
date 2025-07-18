# Phantom Server SDK

The Phantom Server SDK provides a secure and straightforward way to create and manage wallets, sign transactions, and interact with multiple blockchains from your backend services.

## 📖 Documentation

Visit **[docs.phantom.com/server-sdk](https://docs.phantom.com/server-sdk)** for comprehensive documentation including:

- Getting Started Guide
- Creating and Managing Wallets
- Signing Transactions
- Signing Messages
- Complete API Reference
- Integration Examples
- Best Practices
- Security Considerations

## Installation

```bash
npm install @phantom/server-sdk
```

```bash
yarn add @phantom/server-sdk
```

```bash
pnpm add @phantom/server-sdk
```

## Quick Start

```typescript
import { ServerSDK, NetworkId } from '@phantom/server-sdk';

// Initialize the SDK
const sdk = new ServerSDK({
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  apiPrivateKey: process.env.PHANTOM_PRIVATE_KEY!,
  apiBaseUrl: process.env.PHANTOM_API_URL!
});

// Create a wallet
const wallet = await sdk.createWallet('My First Wallet');
console.log('Wallet ID:', wallet.walletId);
console.log('Addresses:', wallet.addresses);

// Sign a message
const signature = await sdk.signMessage(
  wallet.walletId,
  'Hello, Phantom!',
  NetworkId.SOLANA_MAINNET
);
console.log('Signature:', signature);
```

For complete documentation and examples, visit **[docs.phantom.com/server-sdk](https://docs.phantom.com/server-sdk)**.

## Resources

- [Documentation](https://docs.phantom.com/server-sdk)
- [Example Code](https://github.com/phantom/wallet-sdk/tree/main/examples/server-sdk-examples)
- [Integration Guide](https://docs.phantom.com/server-sdk/integration-guide)
- [API Reference](https://docs.phantom.com/server-sdk/api-reference)
- [Changelog](./CHANGELOG.md)

## License

This SDK is distributed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
