# Phantom Client Demo App

This example demonstrates how to use the Phantom Client and Crypto packages to:

1. Generate an Ed25519 key pair
2. Save the key pair to a JSON file
3. Instantiate the Phantom client with API key stamper and private key
4. Create an organization using the client
5. Save organization data to the JSON file
6. Set the organization ID and create a wallet

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up environment variables:
```bash
export PHANTOM_API_KEY_ID="your_api_key_id"
export PHANTOM_API_KEY_SECRET="your_api_key_secret"
```

3. Run the demo:
```bash
yarn dev
```

## What it does

The demo script will:
- Generate a new Ed25519 key pair using `@phantom/crypto`
- Save the key pair to `demo-data.json`
- Initialize a Phantom client with your API credentials and the generated private key
- Create a new organization
- Update `demo-data.json` with the organization details
- Set the organization ID on the client
- Create a Solana wallet within the organization
- Display all the generated data

## Output

The script creates a `demo-data.json` file containing:
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

## API Credentials

You'll need to obtain API credentials from Phantom to run this demo. Set the `PHANTOM_API_KEY_ID` and `PHANTOM_API_KEY_SECRET` environment variables before running the script.