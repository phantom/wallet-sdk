import { VersionedTransaction, Transaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import bs58 from 'bs58'
import type { 
  SwapperSolanaQuoteRepresentation, 
  SwapperEvmQuoteRepresentation,
  SwapperXChainQuoteRepresentation 
} from '../types/quotes'

/**
 * Converts a base58 encoded transaction string to a VersionedTransaction object
 * @param transactionString - Base58 encoded serialized transaction
 * @param encoding - Encoding format (should be "bs58" for Solana)
 * @returns Parsed VersionedTransaction
 */
export function transactionStringToTransaction(
  transactionString: string,
  encoding: "bs58"
): VersionedTransaction {
  try {
    // Step 1: Decode the base58 string to raw bytes
    const transactionBytes = bs58.decode(transactionString)

    // Step 2: Deserialize the bytes into a VersionedTransaction
    const transaction = VersionedTransaction.deserialize(transactionBytes)

    return transaction
  } catch (error) {
    throw new Error(`Failed to parse transaction string: ${error}`)
  }
}

/**
 * Parses Solana transaction data from a SwapperSolanaQuoteRepresentation
 * @param quote - The Solana quote containing transaction data
 * @returns Array of parsed VersionedTransaction objects
 */
export function getSolanaTransactionFromQuote(quote: SwapperSolanaQuoteRepresentation): VersionedTransaction[] {
  if (!quote.transactionData || !Array.isArray(quote.transactionData)) {
    throw new Error('Invalid Solana quote: missing or invalid transaction data')
  }

  if (quote.transactionData.length === 0) {
    throw new Error('No transaction data in Solana quote')
  }

  const parsedTransactions: VersionedTransaction[] = []

  for (const [index, txString] of quote.transactionData.entries()) {
    try {
      // Validate input
      if (!txString || typeof txString !== 'string') {
        throw new Error(`Invalid transaction string at index ${index}`)
      }

      // Parse the transaction using base58 encoding
      const transaction = transactionStringToTransaction(txString, "bs58")

      // Verify it's a valid transaction
      if (!transaction.message || !transaction.message.staticAccountKeys) {
        throw new Error(`Invalid transaction structure at index ${index}`)
      }

      parsedTransactions.push(transaction)

      console.log(`✅ Transaction ${index} parsed successfully`)
      console.log(`   - ${transaction.message.staticAccountKeys.length} account keys`)
      console.log(`   - ${transaction.message.compiledInstructions.length} instructions`)
      
      // Log address table lookups for debugging
      if (transaction.message.addressTableLookups && transaction.message.addressTableLookups.length > 0) {
        console.log(`   - ${transaction.message.addressTableLookups.length} address table lookups`)
      }

    } catch (error) {
      console.error(`❌ Failed to parse transaction ${index}:`, error)
      throw new Error(`Failed to parse transaction ${index}: ${error}`)
    }
  }

  return parsedTransactions
}

/**
 * Gets EVM transaction data from a SwapperEvmQuoteRepresentation
 * @param quote - The EVM quote containing transaction data
 * @returns Raw transaction data string (not implemented yet)
 */
export function getEvmTransactionFromQuote(quote: SwapperEvmQuoteRepresentation): string {
  if (!quote.transactionData || typeof quote.transactionData !== 'string') {
    throw new Error('Invalid EVM quote: missing or invalid transaction data')
  }

  // For now, just return the raw transaction data
  // TODO: Implement proper EVM transaction parsing when needed
  return quote.transactionData
}

/**
 * Gets cross-chain transaction data from a SwapperXChainQuoteRepresentation
 * @param quote - The cross-chain quote containing transaction steps
 * @returns Array of transaction step data (not implemented yet)
 */
export function getXChainTransactionFromQuote(quote: SwapperXChainQuoteRepresentation): string[] {
  if (!quote.steps || !Array.isArray(quote.steps)) {
    throw new Error('Invalid cross-chain quote: missing or invalid steps')
  }

  // For now, just return the transaction data from each step
  // TODO: Implement proper cross-chain transaction parsing when needed
  return quote.steps.map(step => step.transactionData)
}

/**
 * Inspects a parsed Solana transaction and logs detailed information
 * @param transaction - The VersionedTransaction to inspect
 * @param index - Optional index for logging
 */
export function inspectSolanaTransaction(transaction: VersionedTransaction, index?: number): void {
  const prefix = index !== undefined ? `Transaction ${index}:` : 'Transaction:'
  
  console.log(`${prefix} Details`)
  console.log('- Version:', transaction.version)
  console.log('- Signatures:', transaction.signatures.map(sig => sig?.toString() || 'unsigned'))

  // Message details
  const message = transaction.message
  console.log('Message Details:')
  console.log('- Account Keys:', message.staticAccountKeys.map(key => key.toString()))
  console.log('- Recent Blockhash:', message.recentBlockhash)
  console.log('- Instructions Count:', message.compiledInstructions.length)

  // Instruction details
  message.compiledInstructions.forEach((instruction, instructionIndex) => {
    console.log(`Instruction ${instructionIndex}:`, {
      programIdIndex: instruction.programIdIndex,
      accountsLength: instruction.accountKeyIndexes.length,
      dataLength: instruction.data.length,
      data: Buffer.from(instruction.data).toString('hex').substring(0, 32) + '...'
    })
  })

  // Address table lookups (for versioned transactions)
  if (message.addressTableLookups && message.addressTableLookups.length > 0) {
    console.log('Address Table Lookups:', message.addressTableLookups.length)
    message.addressTableLookups.forEach((lookup, lookupIndex) => {
      console.log(`Lookup ${lookupIndex}:`, {
        accountKey: lookup.accountKey.toString(),
        writableIndexes: lookup.writableIndexes,
        readonlyIndexes: lookup.readonlyIndexes
      })
    })
  }
}