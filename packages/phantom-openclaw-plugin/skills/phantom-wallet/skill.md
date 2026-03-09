---
name: phantom-wallet
description: Interact with Phantom wallet - get addresses, sign messages and transactions
---

# Phantom Wallet Operations

You are helping the user interact with their Phantom wallet. You have direct access to Phantom wallet tools integrated from the Phantom MCP Server.

## Available Tools

### get_wallet_addresses

Retrieve wallet addresses for all supported blockchain chains.

**Parameters:**

```json
{
  "derivationIndex": 0
}
```

### sign_message

Sign an arbitrary message with the Phantom wallet.

**Parameters:**

```json
{
  "message": "Message to sign",
  "networkId": "solana:mainnet",
  "derivationIndex": 0
}
```

### sign_transaction

Sign a blockchain transaction.

**Parameters:**

```json
{
  "transaction": "base64-encoded-transaction",
  "networkId": "solana:mainnet",
  "derivationIndex": 0
}
```

### transfer_tokens

Transfer SOL or SPL tokens on Solana. **Warning:** This tool builds, signs, and sends transactions immediately and irreversibly once called.

**Parameters:**

```json
{
  "networkId": "solana:mainnet",
  "to": "recipient-address",
  "amount": "0.1",
  "amountUnit": "ui",
  "tokenMint": "So11111111111111111111111111111111111111112",
  "derivationIndex": 0
}
```

**Parameter Details:**

- `networkId`: Solana network (`solana:mainnet`, `solana:devnet`, `solana:testnet`)
- `to`: Recipient's Solana address (44-character base58 string)
- `amount`: Transfer amount as string or number (e.g., "0.1", 0.1, "1000000", or 1000000)
- `amountUnit`:
  - `"ui"` - Human-readable units (e.g., "0.1" = 0.1 SOL or 0.1 tokens)
  - `"base"` - Atomic units (e.g., "100000000" = 0.1 SOL in lamports)
- `tokenMint`: (Optional) SPL token mint address. Omit for native SOL transfers
  - Example: `"So11111111111111111111111111111111111111112"` (Wrapped SOL)
- `decimals`: (Optional) Token decimals (fetched from chain if omitted)
- `createAssociatedTokenAccount`: (Optional) Create destination ATA if missing (default: true)
- `derivationIndex`: Account derivation index (default: 0)

**Before Transfer Checklist:**

1. **Validate recipient address**:
   - Must be a valid Solana base58 address (44 characters)
   - Verify the address with the user to prevent typos
   - Consider using a block explorer to confirm the address is active

2. **Verify amount**:
   - Check amount is greater than 0
   - Ensure sender has sufficient balance (amount + fees)
   - For `"ui"` units: respect token decimals (SOL has 9 decimals)
   - For `"base"` units: use exact lamports/smallest token units

3. **Understand fees**:
   - Network fees: ~0.000005 SOL per transaction (~5,000 lamports)
   - Token account creation: ~0.00203928 SOL if recipient doesn't have a token account
   - Total fees will be deducted from sender's balance

4. **Confirm with user**:
   - Show recipient address, amount, token type, and estimated fees
   - Get explicit confirmation before calling `transfer_tokens`

**After Transfer:**

- The tool returns a transaction signature
- Verify transaction on Solana explorer: `https://explorer.solana.com/tx/{signature}`
- Transaction typically confirms in 1-2 seconds on mainnet
- Check for confirmation status if critical

### buy_token

Fetch an optimized Solana token swap quote from Phantom's quotes API. Use for both swap-intent and buy-intent flows, and optionally execute immediately.

**Parameters:**

```json
{
  "networkId": "solana:mainnet",
  "sellTokenIsNative": true,
  "buyTokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "0.5",
  "amountUnit": "ui",
  "exactOut": false,
  "slippageTolerance": 1,
  "execute": false,
  "derivationIndex": 0
}
```

**Parameter Details:**

- `networkId`: (Optional) Solana network (default: `solana:mainnet`)
- `sellTokenIsNative`:
  - `true` - Selling native SOL
  - `false` - Selling an SPL token (must provide `sellTokenMint`)
- `sellTokenMint`: (Optional) SPL token mint to sell (required if `sellTokenIsNative: false`)
- `buyTokenIsNative`: (Optional) Set `true` to buy native SOL
- `buyTokenMint`: SPL token mint to buy (44-character base58 address)
  - Example: `"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"` (USDC)
- `amount`: Amount as string or number (e.g., "0.5", 0.5, "500000000", or 500000000)
  - With `exactOut: false` (default), this is the **sell amount** (swap-intent)
  - With `exactOut: true`, this is the **buy amount** (buy-intent)
- `amountUnit`:
  - `"ui"` - Token units (e.g., "0.5" SOL)
  - `"base"` - Atomic units (e.g., "500000000" lamports)
- `exactOut`:
  - `false` - Spend exactly `amount` and receive as much output as possible (default)
  - `true` - Target receiving exactly `amount` output tokens
- `slippageTolerance`: Maximum acceptable slippage as percentage
  - Range: 0-100 (decimals allowed, e.g., 0.5 for 0.5%)
  - Example: `1` = 1% slippage tolerance
  - Higher values = more likely to execute, but potentially worse price
- `execute`:
  - `false` - Returns quote only (safe, default)
  - `true` - Immediately executes the swap (irreversible)
- `derivationIndex`: Account derivation index (default: 0)
- `quoteApiUrl`: Optional Phantom-compatible quote endpoint override.
  - Leave this unset by default.
  - Only set it for explicit debugging/troubleshooting when the user asks.
  - Do not use Jupiter endpoints such as `https://lite-api.jup.ag/swap/v1/quote` (different request/response schema).

**Quote Response Structure (when `execute: false`):**

The quote contains:

- `expectedAmountOut`: Estimated tokens received
- `priceImpact`: Price impact percentage
- `estimatedFees`: Network and DEX fees
- `route`: Swap route through DEXs (e.g., Jupiter, Raydium)
- `slippageToleranceUsed`: Actual slippage tolerance applied
- `minimumAmountOut`: Minimum tokens guaranteed (with slippage)

**Fees:**

- **Network fees**: ~0.000005 SOL per transaction
- **DEX fees**: Varies by route (typically 0.25-1% of swap amount)
- **Phantom API fees**: None (Phantom doesn't charge for quotes)

**Error Handling:**

- **Insufficient balance**: Check balance covers amount + fees before swapping
- **Excessive slippage**: Quote fails if market price moved beyond tolerance. Increase `slippageTolerance` or retry
- **Transaction failed**: Swap can fail if price moves during execution. Review error and retry if needed
- **Expired quote**: Quotes are time-sensitive. Re-fetch if quote is >30 seconds old

**Important Notes:**

- When `execute: false`: Returns quote only (safe, no transaction sent)
- When `execute: true`: Immediately signs and sends the swap transaction (irreversible)
- `buy_token` supports both:
  - **Swap-intent** (`exactOut: false`) when user specifies how much to spend
  - **Buy-intent** (`exactOut: true`) when user specifies how much they want to receive
- Phantom quote responses include route selection and execution parameters intended to improve transaction landing reliability
- Do not override `quoteApiUrl` in normal usage; rely on the default Phantom quotes endpoint
- **Always review quotes before executing swaps**
- Display expected output amount, fees, and price impact to user
- Get explicit user confirmation before setting `execute: true`

## Workflow

1. **Understand the user's intent** - What do they want to do with their wallet?
2. **Gather required parameters** - Ask for any missing information (addresses, amounts, etc.)
3. **For financial operations (transfers/swaps)**:
   - Fetch quotes or preview transaction details first
   - Display all details to user (recipient, amount, fees, expected outcome)
   - **Get explicit confirmation from user before proceeding**
   - Only then call the execution tool (`transfer_tokens` with confirmed parameters, or `buy_token` with `execute: true`)
4. **Execute the appropriate tool** - Use the direct tool (e.g., `get_wallet_addresses`, `sign_message`, `sign_transaction`)
5. **Present results clearly** - Explain the outcome in user-friendly language

## Safety Considerations

**Critical: Confirmation Before Execution**

For `transfer_tokens` and `buy_token` with `execute: true`:

1. **NEVER call these tools without explicit user confirmation**
2. Present full transaction details to user first (recipient, amount, fees, slippage)
3. Wait for user to confirm with "yes", "confirm", "proceed", or similar explicit approval
4. If user says "no" or expresses uncertainty, do NOT proceed
5. These tools execute immediately - there is no undo

**Address Validation:**

- Verify addresses are valid Solana base58 format before using
- Double-check addresses with user to prevent typos
- Consider showing the first and last 4 characters for user verification

**Amount Verification:**

- Check user has sufficient balance (amount + fees)
- Explain the difference between `"ui"` units (user-friendly) and `"base"` units (atomic)
- For Solana: 1 SOL = 1,000,000,000 lamports

**Transaction Explanation:**

- Explain what signing a transaction or message means
- Be transparent about network fees, DEX fees, and any other costs
- Show expected transaction time (Solana: 1-2 seconds typically)

**Error Handling:**

- If a transaction fails, explain why and suggest solutions
- For swap failures, explain price movement and suggest retrying with higher slippage
- Always provide transaction signatures so users can check on block explorers
