# Server SDK Integration Guide

This guide demonstrates how to integrate the `@phantom/server-sdk` into your application for secure wallet management and transaction signing.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Setup](#basic-setup)
- [Wallet Management](#wallet-management)
- [Transaction Signing](#transaction-signing)
- [Message Signing](#message-signing)
- [Best Practices](#best-practices)
- [Complete Example](#complete-example)

## Installation

```bash
npm install @phantom/server-sdk
# or
yarn add @phantom/server-sdk
# or
pnpm add @phantom/server-sdk
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Phantom Wallet Service Configuration
PHANTOM_ORGANIZATION_PRIVATE_KEY=your-base58-encoded-private-key
PHANTOM_ORGANIZATION_ID=your-organization-id
PHANTOM_WALLET_API=https://api.phantom.app/wallet

# Database Configuration (example using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
```

### SDK Initialization

```typescript
import { ServerSDK } from '@phantom/server-sdk';

// Initialize the SDK
const sdk = new ServerSDK({
  privateKey: process.env.PHANTOM_ORGANIZATION_PRIVATE_KEY!,
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  walletApi: process.env.PHANTOM_WALLET_API!
});
```

## Basic Setup

Here's a minimal Express application setup:

```typescript
import express from 'express';
import { ServerSDK } from '@phantom/server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Initialize SDK
const sdk = new ServerSDK({
  privateKey: process.env.PHANTOM_ORGANIZATION_PRIVATE_KEY!,
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  walletApi: process.env.PHANTOM_WALLET_API!
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Wallet Management

### Creating Wallets

**Important**: Always persist the wallet ID in your database to maintain the relationship between your users and their wallets.

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

app.post('/api/wallets/create', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check if user already has a wallet
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (existingWallet) {
      return res.json({ 
        walletId: existingWallet.walletId,
        address: existingWallet.address 
      });
    }
    
    // Create wallet using userId as wallet name for easy recovery
    const walletName = `user_${userId}`;
    const wallet = await sdk.createWallet(walletName);
    
    // Persist wallet information
    const savedWallet = await prisma.wallet.create({
      data: {
        userId,
        walletId: wallet.walletId,
        walletName,
        // Example storing one address
        address: wallet.addresses[0].address,
        networkId: wallet.addresses[0].networkId
      }
    });
    
    res.json({
      walletId: savedWallet.walletId,
      address: savedWallet.address,
      networkId: savedWallet.networkId
    });
  } catch (error) {
    console.error('Failed to create wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});
```

### Database Schema Example (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  wallet    Wallet?
  createdAt DateTime @default(now())
}

model Wallet {
  id         String   @id @default(cuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id])
  walletId   String   @unique
  walletName String
  address    String
  networkId  String
  createdAt  DateTime @default(now())
  
  @@index([userId])
  @@index([walletId])
}
```

## Transaction Signing

### Solana Transaction Example

```typescript
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

app.post('/api/transactions/sign', async (req, res) => {
  try {
    const { userId, recipientAddress, amount } = req.body;
    
    // Get user's wallet from database
    const userWallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!userWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Create Solana transaction
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(userWallet.address),
        toPubkey: new PublicKey(recipientAddress),
        lamports: amount * 1e9 // Convert SOL to lamports
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(userWallet.address);
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    // Sign and send with SDK
    const signedTx = await sdk.signAndSendTransaction({
      from: userWallet.address,
      to: recipientAddress,
      data: serializedTransaction.toString('base64'),
      networkId: 'solana:101' // Mainnet
    }, userWallet.walletId);
    
    res.json({
      signature: signedTx.signature,
      txHash: signedTx.txHash
    });
  } catch (error) {
    console.error('Failed to sign transaction:', error);
    res.status(500).json({ error: 'Failed to sign transaction' });
  }
});
```

## Message Signing

```typescript
app.post('/api/messages/sign', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    // Get user's wallet from database
    const userWallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!userWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Sign message
    const signature = await sdk.signMessage(
      userWallet.walletId,
      message,
      userWallet.networkId
    );
    
    res.json({
      message,
      signature,
      publicKey: userWallet.address
    });
  } catch (error) {
    console.error('Failed to sign message:', error);
    res.status(500).json({ error: 'Failed to sign message' });
  }
});
```

## Best Practices

### 1. Wallet ID Persistence

Always store the wallet ID in your database immediately after creation:

```typescript
// ✅ Good: Store wallet information
const wallet = await sdk.createWallet(walletName);
await saveWalletToDatabase(userId, wallet);

// ❌ Bad: Not persisting wallet ID
const wallet = await sdk.createWallet(walletName);
// If your app crashes here, the wallet ID is lost!
```

### 2. Use User ID as Wallet Name

Using a predictable wallet name helps with recovery:

```typescript
// ✅ Good: Predictable wallet name
const walletName = `user_${userId}`;
const wallet = await sdk.createWallet(walletName);

// ✅ Also good: Include email for better identification
const walletName = `user_${userId}_${userEmail}`;
const wallet = await sdk.createWallet(walletName);

// ❌ Bad: Random or no wallet name
const wallet = await sdk.createWallet(); // Uses timestamp
```

### 3. Error Handling

Always implement proper error handling:

```typescript
try {
  const wallet = await sdk.createWallet(walletName);
  // Handle success
} catch (error) {
  if (error.message.includes('already exists')) {
    // Handle duplicate wallet
  } else {
    // Handle other errors
  }
}
```

### 4. Transaction Verification

After signing, verify the transaction on-chain:

```typescript
const signedTx = await sdk.signAndSendTransaction(transaction);

// Wait for confirmation
const confirmation = await connection.confirmTransaction(signedTx.txHash);
if (confirmation.value.err) {
  throw new Error('Transaction failed');
}
```

## Complete Example

Here's a complete example of an Express API with wallet management:

```typescript
import express from 'express';
import { ServerSDK } from '@phantom/server-sdk';
import { PrismaClient } from '@prisma/client';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const prisma = new PrismaClient();
const sdk = new ServerSDK({
  privateKey: process.env.PHANTOM_ORGANIZATION_PRIVATE_KEY!,
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  walletApi: process.env.PHANTOM_WALLET_API!
});

const connection = new Connection(process.env.SOLANA_RPC_URL!);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create or get wallet
app.post('/api/users/:userId/wallet', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check existing wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      // Create new wallet
      const walletName = `user_${userId}`;
      const result = await sdk.createWallet(walletName);
      
      wallet = await prisma.wallet.create({
        data: {
          userId,
          walletId: result.walletId,
          walletName,
          address: result.addresses[0].address,
          networkId: result.addresses[0].networkId
        }
      });
    }
    
    res.json({
      walletId: wallet.walletId,
      address: wallet.address,
      networkId: wallet.networkId
    });
  } catch (error) {
    console.error('Wallet operation failed:', error);
    res.status(500).json({ error: 'Failed to process wallet request' });
  }
});

// Send SOL
app.post('/api/users/:userId/send-sol', async (req, res) => {
  try {
    const { userId } = req.params;
    const { recipientAddress, amount } = req.body;
    
    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.address),
        toPubkey: new PublicKey(recipientAddress),
        lamports: amount * LAMPORTS_PER_SOL
      })
    );
    
    // Prepare transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(wallet.address);
    
    // Sign transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    const signed = await sdk.signAndSendTransaction({
      from: wallet.address,
      to: recipientAddress,
      data: serialized.toString('base64'),
      networkId: wallet.networkId
    }, wallet.walletId);
    
    res.json({
      signature: signed.signature,
      amount,
      recipient: recipientAddress
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    res.status(500).json({ error: 'Failed to send transaction' });
  }
});

// Sign message
app.post('/api/users/:userId/sign-message', async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const signature = await sdk.signMessage(
      wallet.walletId,
      message,
      wallet.networkId
    );
    
    res.json({
      message,
      signature,
      publicKey: wallet.address
    });
  } catch (error) {
    console.error('Message signing failed:', error);
    res.status(500).json({ error: 'Failed to sign message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Security Considerations

1. **Never expose your organization private key** - Keep it secure in environment variables
2. **Validate all inputs** - Sanitize user inputs before processing
3. **Use HTTPS in production** - Ensure all API calls are encrypted
4. **Implement rate limiting** - Prevent abuse of wallet creation and signing endpoints
5. **Add authentication** - Protect your endpoints with proper user authentication
