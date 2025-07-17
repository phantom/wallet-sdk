# Phantom SDK Scripts

This package contains demonstration scripts for the Phantom SDK capabilities.

## Server SDK Demo

The `server-sdk-demo` script demonstrates the core functionality of the Phantom Server SDK by:

1. Creating a new wallet
2. Executing a self-transfer transaction with a minimal amount of SOL
3. Tracking and reporting on transaction confirmation

### Prerequisites

Before running the demo, you need:

1. **Phantom Organization Credentials**
   - Organization ID
   - Organization Private Key (base58 encoded)
   - These are provided when you create an organization with Phantom

2. **Node.js** version 16 or higher

3. **SOL tokens** (for transaction fees)
   - For devnet: Use the [Solana Faucet](https://faucet.solana.com/)
   - For mainnet: You'll need real SOL

### Setup

1. **Install dependencies** from the monorepo root:
   ```bash
   yarn install
   ```

2. **Configure environment variables**:
   ```bash
   cd packages/scripts
   cp env.example .env
   ```

3. **Edit `.env`** and add your credentials:
   ```env
   PHANTOM_ORGANIZATION_ID=your-organization-id
   PHANTOM_ORGANIZATION_PRIVATE_KEY=your-base58-encoded-private-key
   PHANTOM_WALLET_API=https://api.phantom.app/wallet
   SOLANA_RPC_URL=https://api.devnet.solana.com
   NETWORK=devnet
   ```

### Running the Demo

From the `packages/scripts` directory:

```bash
yarn server-sdk-demo
```

Or from the monorepo root:

```bash
yarn workspace @phantom/scripts server-sdk-demo
```

### What the Demo Does

1. **Initializes the SDK** with your organization credentials
2. **Creates a new wallet** with a unique name
3. **Checks the wallet balance** and provides instructions if empty
4. **Creates a self-transfer transaction** for a minimal amount (0.000001 SOL)
5. **Signs and sends the transaction** using the Phantom Server SDK
6. **Monitors transaction confirmation** with real-time status updates
7. **Reports final results** including transaction fees and explorer links

### Sample Output

```
🚀 Phantom Server SDK Demo

📦 Initializing Server SDK...
🌐 Connected to Solana devnet at https://api.devnet.solana.com

1️⃣ Creating a new wallet...
✅ Wallet created successfully!
   Wallet ID: abc123...
   Name: Demo Wallet 1699999999999
   Solana Address: 5XY...ABC

2️⃣ Checking wallet balance...
   Balance: 1.5 SOL

3️⃣ Creating a self-transfer transaction...
   Amount: 0.000001 SOL (1000 lamports)
   From/To: 5XY...ABC
✅ Transaction created

4️⃣ Signing and sending transaction...
✅ Transaction signed and sent!
   Signature: 3ab...xyz

5️⃣ Waiting for transaction confirmation...
...
✅ Transaction confirmed in 2.3 seconds!
   Status: confirmed
   Slot: 123456789
   Fee: 0.000005 SOL

🔗 View on Explorer: https://explorer.solana.com/tx/3ab...xyz?cluster=devnet

6️⃣ Final balance check...
   Balance: 1.499994 SOL
   Change: 0.000006 SOL (fees)

🎉 Demo completed successfully!
```

### Troubleshooting

1. **"Missing required environment variables"**
   - Ensure `.env` file exists and contains all required values
   - Check that values are not wrapped in quotes

2. **"Wallet has 0 balance"**
   - For devnet: Request SOL from https://faucet.solana.com/
   - For mainnet: Send SOL to the displayed address

3. **"Transaction confirmation timeout"**
   - Network congestion may cause delays
   - Check the explorer link for manual verification

4. **Build errors**
   - Run `yarn build` from the monorepo root
   - Ensure all dependencies are installed

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PHANTOM_ORGANIZATION_ID` | Your organization ID | `org_abc123...` |
| `PHANTOM_ORGANIZATION_PRIVATE_KEY` | Base58 encoded private key | `5Kb8kL...` |
| `PHANTOM_WALLET_API` | Phantom API endpoint | `https://api.phantom.app/wallet` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `NETWORK` | Network to use | `devnet` or `mainnet` |

### Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to version control
- Keep your organization private key secure
- Use environment-specific credentials (dev/staging/prod)

### Next Steps

After running the demo, you can:

1. Explore the [Server SDK documentation](../server-sdk/README.md)
2. Integrate wallet creation into your backend
3. Build transaction signing flows for your application
4. Implement wallet management for your users

### Support

For issues or questions:
- Check the [Server SDK Integration Guide](../server-sdk/INTEGRATION.md)
- Review the demo source code at `src/server-sdk-demo.ts`
- Contact Phantom support for organization-specific issues 