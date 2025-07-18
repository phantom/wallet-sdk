#!/usr/bin/env node

import { ServerSDK, NetworkId } from '@phantom/server-sdk';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const config = {
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  apiPrivateKey: process.env.PHANTOM_ORGANIZATION_PRIVATE_KEY!,
  apiBaseUrl: process.env.PHANTOM_WALLET_API!,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  network: process.env.NETWORK || 'devnet'
};

// Validate configuration
function validateConfig() {
  const required = ['organizationId', 'apiPrivateKey', 'apiBaseUrl'];
  const missing = required.filter(key => !config[key as keyof typeof config]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please copy env.example to .env and fill in your values.');
    process.exit(1);
  }
}

// Helper function to wait
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main demo function
async function runDemo() {
  console.log('🚀 Phantom Server SDK Demo\n');
  
  validateConfig();
  
  // Initialize SDK
  console.log('📦 Initializing Server SDK...');
  const sdk = new ServerSDK({
    apiPrivateKey: config.apiPrivateKey,
    organizationId: config.organizationId,
    apiBaseUrl: config.apiBaseUrl
  });
  
  // Initialize Solana connection
  const connection = new Connection(config.solanaRpcUrl, 'confirmed');
  const networkId = config.network === 'mainnet' ? NetworkId.SOLANA_MAINNET : NetworkId.SOLANA_DEVNET;
  
  console.log(`🌐 Connected to Solana ${config.network} at ${config.solanaRpcUrl}\n`);
  
  try {
    // Step 1: Create a wallet
    console.log('1️⃣ Creating a new wallet...');
    const walletName = `Demo Wallet ${Date.now()}`;
    const wallet = await sdk.createWallet(walletName);
    
    console.log('✅ Wallet created successfully!');
    console.log(`\n🔍 Wallet Details:`);
    console.log(`   Wallet ID: ${wallet.walletId}`);
    console.log(`   Wallet Name: ${walletName}`);
    const solanaAddress = wallet.addresses.find((addr: any) => addr.addressType === 'Solana')?.address;
    console.log(`   Solana Address: ${solanaAddress}`);
    
    // Find the Solana address
    if (!solanaAddress) {
      throw new Error('No Solana address found in wallet');
    }
        
    // Step 2: Check wallet balance
    console.log('2️⃣ Checking wallet balance...');
    let balance = await connection.getBalance(new PublicKey(solanaAddress));
    console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance === 0) {
      console.log('\n⚠️  Wallet has 0 balance. Please fund the wallet to continue:');
      if (config.network === 'devnet') {
        console.log(`   1. Request devnet SOL from: https://faucet.solana.com/`);
        console.log(`   2. Use address: ${solanaAddress}`);
      } else {
        console.log(`   1. Send some SOL to address: ${solanaAddress}`);
      }
      console.log('\n⏳ Waiting for funds...');
      
      // Wait for balance
      let checkCount = 0;
      while (balance === 0) {
        await sleep(5000); // Check every 5 seconds
        balance = await connection.getBalance(new PublicKey(solanaAddress));
        checkCount++;
        
        if (checkCount % 12 === 0) { // Every minute
          console.log(`   Still waiting... (checked ${checkCount} times)`);
        } else {
          process.stdout.write('.');
        }
        
        if (balance > 0) {
          console.log(`\n\n✅ Funds received! Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
          break;
        }
      }
    }
    
    // Step 3: Create a self-transfer transaction
    console.log('\n3️⃣ Creating a self-transfer transaction...');
    const transferAmount = 0.000001; // Minimal amount in SOL
    const lamports = Math.floor(transferAmount * LAMPORTS_PER_SOL);
    
    console.log(`   Amount: ${transferAmount} SOL (${lamports} lamports)`);
    console.log(`   From/To: ${solanaAddress}`);
    
    // Create transaction with priority fees
    const transaction = new Transaction();
    
    // Add priority fee instructions
    // Set compute unit price (micro-lamports per compute unit)
    const priorityFee = 1000; // 1000 micro-lamports per compute unit
    console.log(`   Priority fee: ${priorityFee} micro-lamports per compute unit`);
    
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee
      })
    );
    
    // Add the actual transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: new PublicKey(solanaAddress), // Self transfer
        lamports: lamports
      })
    );
    
    // Get recent blockhash - needed for transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(solanaAddress);
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    console.log('✅ Transaction created\n');
    
    // Step 4: Sign and send transaction
    console.log('4️⃣ Signing and sending transaction...');
    const signedResult = await sdk.signAndSendTransaction(
      wallet.walletId,
      serializedTransaction,
      networkId
    );
    
    console.log('✅ Transaction signed and sent!');
    console.log(`   Raw transaction (base64): ${signedResult.rawTransaction}`);
    
    // Extract signature from the signed transaction
    const signedTx = Transaction.from(Buffer.from(signedResult.rawTransaction, 'base64'));
    let signature: string | null = null;
    
    if (signedTx.signature) {
      signature = bs58.encode(signedTx.signature);
    } else if (signedTx.signatures && signedTx.signatures.length > 0 && signedTx.signatures[0].signature) {
      signature = bs58.encode(signedTx.signatures[0].signature);
    }
    
    if (!signature) {
      throw new Error('Failed to extract transaction signature');
    }
    
    console.log(`   Signature: ${signature}\n`);
    
    // Step 5: Wait for confirmation
    console.log('5️⃣ Waiting for transaction confirmation...');
    const startTime = Date.now();
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status && status.value) {
          if (status.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          }
          
          if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
            confirmed = true;
            const elapsed = (Date.now() - startTime) / 1000;
            console.log(`\n✅ Transaction confirmed in ${elapsed.toFixed(1)} seconds!`);
            console.log(`   Status: ${status.value.confirmationStatus}`);
            console.log(`   Slot: ${status.value.slot}`);
            
            // Get transaction details
            const txDetails = await connection.getTransaction(signature, {
              maxSupportedTransactionVersion: 0
            });
            
            if (txDetails?.meta) {
              console.log(`   Fee: ${txDetails.meta.fee / LAMPORTS_PER_SOL} SOL`);
            }
          }
        }
        
        if (!confirmed) {
          process.stdout.write('.');
          attempts++;
          await sleep(1000); // Wait 1 second before next check
        }
      } catch (error) {
        console.error('\n❌ Error checking transaction status:', error);
        break;
      }
    }
    
    if (!confirmed) {
      console.log('\n⚠️  Transaction confirmation timeout. Check manually:');
      console.log(`   https://explorer.solana.com/tx/${signature}?cluster=${config.network}`);
    } else {
      console.log(`\n🔗 View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=${config.network}`);
    }
    
    // Final balance check
    console.log('\n6️⃣ Final balance check...');
    const finalBalance = await connection.getBalance(new PublicKey(solanaAddress));
    console.log(`   Balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Change: ${(balance - finalBalance) / LAMPORTS_PER_SOL} SOL (includes base fee + priority fee)\n`);
    
    console.log('🎉 Demo completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(console.error); 