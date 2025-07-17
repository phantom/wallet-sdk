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
import { ServerSDK } from '@phantom/server-sdk';
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
      walletName: wallet.walletName,
      addresses: wallet.addresses
    });
    
    // IMPORTANT: Save the walletId in your database!
    // You'll need it for all future operations
    return wallet;
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw error;
  }
}
```

### Signing a Message

```typescript
// Sign a message with an existing wallet
async function signMessage(walletId: string, message: string) {
  try {
    const signature = await sdk.signMessage(
      walletId,
      message,
      'solana:101' // Network ID for Solana mainnet
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
import bs58 from 'bs58'; // Added missing import for bs58

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
    
    // Option 1: Sign and have Phantom submit the transaction
    const signedTx = await sdk.signAndSendTransaction(walletId, {
      from: fromAddress,
      to: toAddress,
      data: serializedTransaction.toString('base64'),
      networkId: 'solana:101' // Mainnet
    }, {
      chain: 'solana',
      network: 'mainnet'  // This tells Phantom to submit the transaction
    });
    
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

When integrating the SDK into your backend, it's **CRITICAL** to maintain the relationship between your users and their wallets.

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
  networkId  String
  createdAt  DateTime @default(now())
  
  @@index([userId])
  @@index([walletId])
}
```

### Complete API Example

Here's a production-ready Express API with proper wallet management:

```typescript
import express from 'express';
import { ServerSDK } from '@phantom/server-sdk';
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
        networkId: wallet.networkId
      });
    }
    
    // Create new wallet with meaningful name
    const walletName = `user_${userId}`;
    const result = await sdk.createWallet(walletName);
    
    // CRITICAL: Immediately persist wallet information
    wallet = await prisma.wallet.create({
      data: {
        userId,
        walletId: result.walletId, // NEVER lose this!
        walletName,
        address: result.addresses[0].address,
        networkId: result.addresses[0].networkId
      }
    });
    
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
    const signed = await sdk.signAndSendTransaction(wallet.walletId, {
      from: wallet.address,
      to: recipientAddress,
      data: serialized.toString('base64'),
      networkId: wallet.networkId
    }, {
      chain: 'solana',
      network: 'mainnet' // or 'devnet' for testing
    });
    
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