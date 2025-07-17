# Server SDK Integration Guide

This guide demonstrates how to integrate the `@phantom/server-sdk` into your application for secure wallet management and transaction signing.

## ⚠️ Critical Security Information

**IMPORTANT**: The private key for your organization is meant to be stored **ONLY on your server**, in a secure environment. 

- **NEVER expose this key in client-side code**
- **NEVER commit it to version control**
- **Store it securely using environment variables or secret management systems**



## Table of Contents
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Basic Examples](#basic-examples)
  - [Creating a Wallet](#creating-a-wallet)
  - [Listing Wallets](#listing-wallets)
  - [Signing a Message](#signing-a-message)
  - [Signing a Transaction](#signing-a-transaction)
- [Backend Integration](#backend-integration)
  - [Database Schema](#database-schema)
  - [Complete API Example](#complete-api-example)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

## Installation

```bash
npm install @phantom/server-sdk
# or
yarn add @phantom/server-sdk
# or
pnpm add @phantom/server-sdk
```

## Getting Started

### 1. Set up Environment Variables

Create a `.env` file in your project root:

```env
PRIVATE_KEY=your-base58-encoded-private-key
ORGANIZATION_ID=your-organization-id
PHANTOM_API_URL=https://api.phantom.app/wallet
```

### 2. Initialize the SDK

```typescript
import { ServerSDK, NetworkId } from '@phantom/server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the SDK
const sdk = new ServerSDK({
  apiPrivateKey: process.env.PRIVATE_KEY!,
  organizationId: process.env.ORGANIZATION_ID!,
  apiBaseUrl: process.env.PHANTOM_API_URL!
});
```

## Basic Examples

Let's start with simple examples before moving to a complete backend integration.

### Creating a Wallet

```typescript
// Create a new wallet
async function createWallet() {
  try {
    // Use a meaningful name for wallet recovery
    const walletName = 'user_123456';
    const wallet = await sdk.createWallet(walletName);
    
    console.log('Wallet created:', {
      walletId: wallet.walletId,
      addresses: wallet.addresses
    });
    
    // The addresses array contains addresses for multiple chains
    // Each address has 'addressType' (e.g., 'Solana', 'Ethereum') and 'address' fields
    const solanaAddress = wallet.addresses.find(addr => addr.addressType === 'Solana');
    const ethereumAddress = wallet.addresses.find(addr => addr.addressType === 'Ethereum');
    
    console.log('Solana address:', solanaAddress?.address);
    console.log('Ethereum address:', ethereumAddress?.address);
    
    // IMPORTANT: Save the walletId in your database!
    // You'll need it for all future operations
    return wallet;
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw error;
  }
}
```

### Listing Wallets

```typescript
// Get all wallets for your organization
async function listWallets(limit?: number, offset?: number) {
  try {
    const result = await sdk.getWallets(limit, offset);
    
    console.log(`Found ${result.totalCount} wallets total`);
    console.log(`Showing ${result.wallets.length} wallets (offset: ${result.offset})`);
    
    // Note: getWallets returns wallet metadata but not addresses
    // To get addresses, use sdk.getWalletAddresses(walletId)
    result.wallets.forEach(wallet => {
      console.log(`- ${wallet.walletName} (ID: ${wallet.walletId})`);
    });
    
    return result;
  } catch (error) {
    console.error('Failed to list wallets:', error);
    throw error;
  }
}

// Example: Get first 10 wallets
const firstPage = await listWallets(10, 0);

// Example: Get next 10 wallets
const secondPage = await listWallets(10, 10);

// Example: Get all wallets (default limit is 20)
const allWallets = await sdk.getWallets();
```

### Signing a Message

```typescript
import { NetworkId } from '@phantom/server-sdk';

// Sign a message with an existing wallet
async function signMessage(walletId: string, message: string) {
  try {
    const signature = await sdk.signMessage(
      walletId,
      message,
      NetworkId.SOLANA_MAINNET 
    );
    
    console.log('Message signed:', {
      message,
      signature
    });
    
    return signature;
  } catch (error) {
    console.error('Failed to sign message:', error);
    throw error;
  }
}

// Example usage
const walletId = 'your-wallet-id';
const message = 'Hello, Phantom!';
const signature = await signMessage(walletId, message);
```

### Signing a Transaction

```typescript
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NetworkId } from '@phantom/server-sdk';
import bs58 from 'bs58';

// Sign and send a Solana transaction
async function sendSOL(walletId: string, fromAddress: string, toAddress: string, amount: number) {
  try {
    // Create connection to Solana
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(toAddress),
        lamports: amount * LAMPORTS_PER_SOL
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromAddress);
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    // Sign and have Phantom submit the transaction
    const signedTx = await sdk.signAndSendTransaction(
      walletId,
      serializedTransaction,
      NetworkId.SOLANA_MAINNET 
    );
    
    // Extract the transaction signature from the signed transaction
    const signedTransaction = Transaction.from(
      Buffer.from(signedTx.rawTransaction, 'base64')
    );
    
    // Get the signature (transaction hash)
    const signature = signedTransaction.signature 
      ? bs58.encode(signedTransaction.signature)
      : signedTransaction.signatures[0].signature 
        ? bs58.encode(signedTransaction.signatures[0].signature)
        : null;
    
    if (!signature) {
      throw new Error('Failed to extract transaction signature');
    }
    
    console.log('Transaction signature:', signature);
    
    // Wait for confirmation (Phantom submitted it for us)
    const confirmation = await connection.confirmTransaction(signature);
    
    return {
      signature,
      confirmed: !confirmation.value.err
    };
  } catch (error) {
    console.error('Failed to send transaction:', error);
    throw error;
  }
}
```

## Backend Integration

When integrating the SDK into your backend, it's **IMPORTANT** to maintain the relationship between your users and their wallets.

### Key Requirements

1. **Always store the wallet ID** in your database immediately after creation
2. **Associate each wallet with a user ID** to maintain ownership
3. **Use meaningful wallet names** (e.g., `user_${userId}`) for easier recovery

### Database Schema

Here's an example using Prisma:

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
  walletId   String   @unique // Phantom wallet ID - CRITICAL to store!
  walletName String
  address    String
  addressType String  // Changed from networkId to addressType
  createdAt  DateTime @default(now())
  
  @@index([userId])
  @@index([walletId])
}
```

### Complete API Example

Here's a production-ready Express API with proper wallet management:

```typescript
import express from 'express';
import { ServerSDK, NetworkId } from '@phantom/server-sdk';
import { PrismaClient } from '@prisma/client';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const prisma = new PrismaClient();
const sdk = new ServerSDK({
  apiPrivateKey: process.env.PRIVATE_KEY!,
  organizationId: process.env.ORGANIZATION_ID!,
  apiBaseUrl: process.env.PHANTOM_API_URL!
});

const connection = new Connection(process.env.SOLANA_RPC_URL!);

// List all wallets for the organization
app.get('/api/wallets', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await sdk.getWallets(limit, offset);
    
    res.json({
      wallets: result.wallets,
      pagination: {
        total: result.totalCount,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.wallets.length < result.totalCount
      }
    });
  } catch (error) {
    console.error('Failed to list wallets:', error);
    res.status(500).json({ error: 'Failed to list wallets' });
  }
});

// Create or get wallet for user
app.post('/api/users/:userId/wallet', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user already has a wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (wallet) {
      // Return existing wallet
      return res.json({
        walletId: wallet.walletId,
        address: wallet.address,
        addressType: wallet.addressType
      });
    }
    
    // Create new wallet with meaningful name
    const walletName = `user_${userId}`;
    const result = await sdk.createWallet(walletName);
    
    // Find Solana address from the addresses array
    const solanaAddress = result.addresses.find(
      addr => addr.addressType === 'Solana'
    );

    if (!solanaAddress) {
      throw new Error('No Solana address found in wallet');
    }
    
    // Immediately persist wallet information
    wallet = await prisma.wallet.create({
      data: {
        userId,
        walletId: result.walletId, 
        walletName,
        address: solanaAddress.address,
        addressType: solanaAddress.addressType
      }
    });
    
    res.json({
      walletId: wallet.walletId,
      address: wallet.address,
      addressType: wallet.addressType
    });
  } catch (error) {
    console.error('Wallet operation failed:', error);
    res.status(500).json({ error: 'Failed to process wallet request' });
  }
});

// Sign a message
app.post('/api/users/:userId/sign-message', async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    
    // Get user's wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Sign message using stored wallet ID
    const signature = await sdk.signMessage(
      wallet.walletId,
      message,
      NetworkId.SOLANA_MAINNET
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

// Send SOL transaction
app.post('/api/users/:userId/send-sol', async (req, res) => {
  try {
    const { userId } = req.params;
    const { recipientAddress, amount } = req.body;
    
    // Validate inputs
    if (!recipientAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    // Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Check balance (optional but recommended)
    const balance = await connection.getBalance(new PublicKey(wallet.address));
    if (balance < amount * LAMPORTS_PER_SOL) {
      return res.status(400).json({ error: 'Insufficient balance' });
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
    
    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    // Sign and send using stored wallet ID
    const signed = await sdk.signAndSendTransaction(
      wallet.walletId,
      serialized,
      NetworkId.SOLANA_MAINNET 
    );
    
    // Extract the transaction signature from the signed transaction
    const signedTransaction = Transaction.from(
      Buffer.from(signed.rawTransaction, 'base64')
    );
    
    // Get the signature (transaction hash)
    const signature = signedTransaction.signature 
      ? bs58.encode(signedTransaction.signature)
      : signedTransaction.signatures[0].signature 
        ? bs58.encode(signedTransaction.signatures[0].signature)
        : null;
    
    if (!signature) {
      return res.status(500).json({ error: 'Failed to extract transaction signature' });
    }
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    
    res.json({
      signature: signature, 
      txHash: signature,
      amount,
      recipient: recipientAddress,
      confirmed: !confirmation.value.err
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    res.status(500).json({ error: 'Failed to send transaction' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Best Practices

### 1. Wallet Management

- **Always use meaningful wallet names**: Use identifiers like `user_${userId}` or `org_${orgId}_wallet_${timestamp}` to make wallet recovery easier.
- **Store wallet IDs immediately**: As soon as you create a wallet, persist the `walletId` in your database. This is critical for accessing the wallet later.
- **Maintain wallet-user relationships**: Always associate wallets with user accounts in your database to ensure proper ownership tracking.

### 2. Error Handling

- **Implement retry logic**: Network requests can fail. Implement exponential backoff for transient failures.
- **Log errors comprehensively**: Log both the error message and any response data for debugging.
- **Handle specific error cases**: Different errors require different handling (e.g., insufficient balance vs network errors).

### 3. Performance

- **Cache wallet addresses**: After fetching addresses, cache them to reduce API calls.
- **Use pagination**: When listing wallets, always use pagination to handle large datasets efficiently.
- **Batch operations**: If you need to perform multiple operations, consider batching where possible.

### 4. Transaction Management

- **Always verify transactions**: After signing and sending, always wait for confirmation.
- **Implement timeout handling**: Set reasonable timeouts for transaction confirmations.
- **Store transaction history**: Keep records of all transactions for audit trails.

## Security Considerations

### 1. API Key Management

```typescript
// ❌ NEVER do this
const sdk = new ServerSDK({
  apiPrivateKey: 'your-actual-private-key', // NEVER hardcode!
  organizationId: 'org-id',
  apiBaseUrl: 'url'
});

// ✅ Always use environment variables
const sdk = new ServerSDK({
  apiPrivateKey: process.env.PRIVATE_KEY!,
  organizationId: process.env.ORGANIZATION_ID!,
  apiBaseUrl: process.env.PHANTOM_API_URL!
});
```

### 2. Environment Security

- **Use secret management services**: In production, use services like AWS Secrets Manager, HashiCorp Vault, or similar.
- **Rotate keys regularly**: Implement a key rotation strategy.
- **Limit key access**: Only give access to the private key to services that absolutely need it.
- **Monitor API usage**: Set up alerts for unusual API activity.

### 3. Database Security

- **Encrypt sensitive data**: Consider encrypting wallet IDs and user associations at rest.
- **Use database access controls**: Implement proper RBAC for database access.
- **Audit wallet operations**: Log all wallet creation and transaction operations.

### 4. API Security

- **Implement rate limiting**: Protect your endpoints from abuse.
- **Use authentication**: Require proper authentication for all wallet operations.
- **Validate all inputs**: Never trust client-provided data.
- **Use HTTPS only**: Ensure all API communications are encrypted.

### 5. Monitoring and Alerts

```typescript
// Example: Add monitoring to wallet operations
async function createWalletWithMonitoring(userId: string) {
  const startTime = Date.now();
  
  try {
    const wallet = await sdk.createWallet(`user_${userId}`);
    
    // Log success metrics
    logger.info('Wallet created successfully', {
      userId,
      walletId: wallet.walletId,
      duration: Date.now() - startTime
    });
    
    // Send metrics to monitoring service
    metrics.increment('wallet.created');
    metrics.timing('wallet.creation.duration', Date.now() - startTime);
    
    return wallet;
  } catch (error) {
    // Log error with context
    logger.error('Failed to create wallet', {
      userId,
      error: error.message,
      duration: Date.now() - startTime
    });
    
    // Alert on critical failures
    alerting.sendAlert('Wallet creation failed', {
      userId,
      error: error.message
    });
    
    throw error;
  }
}
```

### 6. Compliance

- **Know Your Customer (KYC)**: Implement appropriate KYC procedures before creating wallets.
- **Transaction monitoring**: Monitor transactions for suspicious activity.
- **Data retention**: Follow regulations for data retention and deletion.
- **Geographic restrictions**: Ensure compliance with geographic restrictions on crypto services.
