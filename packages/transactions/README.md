# @phantom/transactions

A multi-chain transaction builder package that simplifies transaction creation for dApp development with Phantom Wallet SDK. Build transactions for Solana, Ethereum, and other blockchains with a unified API.

## Installation

```bash
npm install @phantom/transactions
# or
yarn add @phantom/transactions
```

## Overview

The `@phantom/transactions` package provides a simple, unified interface for creating transactions across multiple blockchains. It automatically handles chain-specific logic while providing a consistent developer experience.

### Supported Networks

- **Solana**: Native SOL transfers and SPL tokens
- **Ethereum/EVM**: Native ETH transfers and ERC-20 tokens
  - Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche
- **Bitcoin**: Native BTC transfers (coming soon)
- **Sui**: Native SUI transfers and tokens (coming soon)

## Quick Start

```typescript
import { createSendTokenTransaction } from "@phantom/transactions";
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";

function SendToken() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const handleSend = async () => {
    // Create transaction
    const { transaction, error } = await createSendTokenTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      from: "sender-address",
      to: "recipient-address", 
      amount: "1.5", // 1.5 SOL
    });

    if (error) {
      console.error("Transaction creation failed:", error);
      return;
    }

    // Sign and send with Phantom SDK
    const signature = await signAndSendTransaction({
      transaction,
      networkId: NetworkId.SOLANA_MAINNET,
    });
  };

  return <button onClick={handleSend}>Send 1.5 SOL</button>;
}
```

## API Reference

### createSendTokenTransaction(params)

Creates a transaction for sending tokens on any supported blockchain.

**Parameters:**
- `networkId` (NetworkId) - The target network identifier
- `from` (string) - Sender address
- `to` (string) - Recipient address  
- `amount` (string | number | bigint) - Amount to send
- `token?` (string) - Token contract address (optional for native transfers)
- `decimals?` (number) - Token decimals (auto-detected if not provided)

**Returns:**
- `Promise<TransactionResult>` with:
  - `transaction` - The blockchain-specific transaction object
  - `error?` - Error message if transaction creation failed

## Usage Examples

### Native Token Transfers

```typescript
import { createSendTokenTransaction, NetworkId } from "@phantom/transactions";

// Send SOL on Solana
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  from: "sender-solana-address",
  to: "recipient-solana-address",
  amount: "0.1", // 0.1 SOL
});

// Send ETH on Ethereum
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.ETHEREUM_MAINNET,
  from: "0x...", // sender address
  to: "0x...", // recipient address
  amount: "0.05", // 0.05 ETH
});

// Send MATIC on Polygon
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.POLYGON_MAINNET,
  from: "0x...",
  to: "0x...",
  amount: "10", // 10 MATIC
});
```

### Token Transfers

```typescript
// Send USDC on Solana (SPL Token)
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  from: "sender-address",
  to: "recipient-address",
  amount: "100", // 100 USDC
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint address
  decimals: 6, // USDC has 6 decimals
});

// Send USDC on Ethereum (ERC-20)
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.ETHEREUM_MAINNET,
  from: "0x...",
  to: "0x...",
  amount: "50",
  token: "0xA0b86a33E6441E52bB62c678b9431B57e4FB3b3A", // USDC contract address
  decimals: 6,
});
```

### Convenience Functions

```typescript
import { createNativeTransfer, createTokenTransfer } from "@phantom/transactions";

// Native transfer (convenience function)
const { transaction } = await createNativeTransfer({
  networkId: NetworkId.SOLANA_DEVNET,
  from: "sender",
  to: "recipient", 
  amount: "2.0",
});

// Token transfer (convenience function)
const { transaction } = await createTokenTransfer({
  networkId: NetworkId.ETHEREUM_MAINNET,
  from: "0x...",
  to: "0x...",
  amount: "1000",
  token: "0x...", // Required for token transfers
  decimals: 18,
});
```

## RPC Configuration

Configure custom RPC endpoints for different networks:

```typescript
import { setRPCConfig, getRPCConfig } from "@phantom/transactions";

// Set custom RPC endpoints
setRPCConfig({
  solana: {
    mainnet: "https://your-solana-rpc.com",
    devnet: "https://your-solana-devnet.com",
  },
  ethereum: {
    mainnet: "https://your-ethereum-rpc.com",
    sepolia: "https://your-sepolia-rpc.com",
  },
  polygon: {
    mainnet: "https://your-polygon-rpc.com",
  },
});

// Get current configuration
const config = getRPCConfig();
console.log(config.solana?.mainnet);
```

### Environment Variables

You can also configure RPC endpoints via environment variables:

```bash
# Solana
SOLANA_MAINNET_RPC=https://api.mainnet-beta.solana.com
SOLANA_DEVNET_RPC=https://api.devnet.solana.com

# Ethereum
ETHEREUM_MAINNET_RPC=https://mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY

# Polygon
POLYGON_MAINNET_RPC=https://polygon-mainnet.infura.io/v3/YOUR_KEY

# Other networks...
```

## Integration with Phantom SDKs

### React SDK Integration

```typescript
import { createSendTokenTransaction } from "@phantom/transactions";
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";

function TokenSender() {
  const { signAndSendTransaction, loading } = useSignAndSendTransaction();

  const sendUSDC = async () => {
    const { transaction, error } = await createSendTokenTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      from: "your-address",
      to: "recipient-address",
      amount: "10",
      token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    });

    if (error) {
      alert(error);
      return;
    }

    try {
      const signature = await signAndSendTransaction({
        transaction,
        networkId: NetworkId.SOLANA_MAINNET,
      });
      console.log("Transaction sent:", signature);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  return (
    <button onClick={sendUSDC} disabled={loading}>
      Send 10 USDC
    </button>
  );
}
```

### Server SDK Integration

```typescript
import { createSendTokenTransaction } from "@phantom/transactions";
import { ServerSDK, NetworkId } from "@phantom/server-sdk";

const sdk = new ServerSDK({
  organizationId: process.env.ORGANIZATION_ID!,
  apiPrivateKey: process.env.PRIVATE_KEY!,
  apiBaseUrl: process.env.API_URL!,
});

async function serverSideTransfer(walletId: string) {
  // Create transaction
  const { transaction, error } = await createSendTokenTransaction({
    networkId: NetworkId.ETHEREUM_MAINNET,
    from: "wallet-address",
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    amount: "0.1", // 0.1 ETH
  });

  if (error) {
    throw new Error(error);
  }

  // Sign and send with server SDK
  const result = await sdk.signAndSendTransaction({
    walletId,
    transaction,
    networkId: NetworkId.ETHEREUM_MAINNET,
  });

  return result;
}
```

## Error Handling

```typescript
const { transaction, error } = await createSendTokenTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  from: "invalid-address",
  to: "recipient",
  amount: "1.0",
});

if (error) {
  console.error("Transaction creation failed:", error);
  // Handle specific error cases
  if (error.includes("Invalid address")) {
    // Handle invalid address
  } else if (error.includes("Insufficient")) {
    // Handle insufficient balance
  }
  return;
}

// Transaction created successfully
console.log("Transaction ready:", transaction);
```

## Network Support

| Network | Native Token | Custom Tokens | Status |
|---------|-------------|---------------|---------|
| Solana | ✅ SOL | 🚧 SPL Tokens | Partial |
| Ethereum | ✅ ETH | 🚧 ERC-20 | Partial |
| Polygon | ✅ MATIC | 🚧 ERC-20 | Partial |
| Arbitrum | ✅ ETH | 🚧 ERC-20 | Partial |
| Optimism | ✅ ETH | 🚧 ERC-20 | Partial |
| Base | ✅ ETH | 🚧 ERC-20 | Partial |
| BSC | ✅ BNB | 🚧 BEP-20 | Partial |
| Avalanche | ✅ AVAX | 🚧 ERC-20 | Partial |
| Bitcoin | 🚧 BTC | ❌ | Coming Soon |
| Sui | 🚧 SUI | 🚧 Sui Tokens | Coming Soon |

## Development Status

This package is in active development. Current limitations:

- **SPL Token transfers**: Need @solana/spl-token implementation
- **ERC-20 transfers**: Need proper contract call encoding
- **Bitcoin**: Full implementation needed
- **Sui tokens**: Token-specific logic needed

## Contributing

This package is part of the Phantom Wallet SDK monorepo. Contributions are welcome!

```bash
# Install dependencies
yarn install

# Build the package
yarn workspace @phantom/transactions build

# Run tests
yarn workspace @phantom/transactions test

# Lint code
yarn workspace @phantom/transactions lint
```

## License

MIT License - see LICENSE file for details.