# Phantom Client Setup Tool

This tool helps you set up your Phantom wallet infrastructure by generating the necessary credentials and creating your organization. It uses the Phantom Client and Crypto packages to:

1. Generate a cryptographic Ed25519 key pair for your organization
2. Save credentials to a secure JSON file
3. Create your organization using the Phantom API
4. Generate a test wallet to verify functionality
5. Create comprehensive Server SDK documentation with your credentials

## Setup

1. Install dependencies from the workspace root:
```bash
yarn install
```

2. Run the setup tool:
```bash
cd examples/client-demo-app
yarn dev
```

No environment variables needed - the tool generates everything for you!

## What it does

The setup script will:
- Generate a new Ed25519 key pair using `@phantom/crypto`
- Save the key pair to `demo-data.json` 
- Initialize a Phantom client with the generated private key
- Create your organization on Phantom's platform
- Update `demo-data.json` with organization details
- Create a test wallet with addresses for Solana, Ethereum, Bitcoin, and Sui
- Generate `SERVER_SDK_USAGE.md` with complete integration instructions

## Output Files

### `demo-data.json`
Contains your organization credentials:
```json
{
  "keyPair": {
    "publicKey": "...",
    "secretKey": "..."
  },
  "organization": {
    "organizationId": "...",
    "name": "..."
  }
}
```

### `SERVER_SDK_USAGE.md`
A comprehensive guide for integrating with the Phantom Server SDK, including:
- Your specific credentials and organization ID
- Installation and setup instructions
- Complete code examples for wallet creation, message signing, and transactions
- Multi-chain wallet management
- Security best practices

## Next Steps

After running this setup tool:

1. **Secure your credentials**: Store the private key from `demo-data.json` securely
2. **Follow the Server SDK guide**: Use the generated `SERVER_SDK_USAGE.md` for integration
3. **Build your application**: Integrate wallet functionality using the Server SDK

## Security

⚠️ **Important**: The generated private key is your organization's master key. Keep it secure and never commit it to version control.