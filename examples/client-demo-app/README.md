# Phantom Client Demo Apps

This directory contains demo applications showcasing Phantom Client functionality, including basic setup and advanced multi-authenticator features.

## Available Scripts

### 1. Basic Setup Tool (`yarn dev`)

Sets up your Phantom wallet infrastructure by generating credentials and creating your organization:

1. Generate a cryptographic Ed25519 key pair for your organization
2. Save credentials to a secure JSON file
3. Create your organization using the Phantom API
4. Generate a test wallet to verify functionality
5. Create comprehensive Server SDK documentation with your credentials

### 2. Multi-Authenticator Demo (`yarn multi-auth`)

Demonstrates the Phantom Client with multi-authenticator support:

1. Generate multiple key pairs for different authenticators
2. Create an organization with multiple authenticators (keypair, PKI, OIDC)
3. Test methods: `getOrganization`, `getWalletWithTag`, `createAuthenticator`, `deleteAuthenticator`
4. Show how different authenticators can access the same organization
5. Demonstrate multi-authenticator functionality

## Setup

1. Install dependencies from the workspace root:

```bash
yarn install
```

2. Run either script:

```bash
cd examples/client-demo-app

# Basic setup (original demo)
yarn dev

# Multi-authenticator demo (NEW)
yarn multi-auth
```

No environment variables needed - the tools generate everything for you!

## What the scripts do

### Basic Setup Script (`yarn dev`)

- Generate a new Ed25519 key pair using `@phantom/crypto`
- Save the key pair to `demo-data.json`
- Initialize a Phantom client with the generated private key
- Create your organization on Phantom's platform
- Update `demo-data.json` with organization details
- Create a test wallet with addresses for Solana, Ethereum, Bitcoin, and Sui
- Generate `SERVER_SDK_USAGE.md` with complete integration instructions

### Multi-Authenticator Demo (`yarn multi-auth`)

- Generate multiple Ed25519 key pairs for different authenticators
- Create an organization with multiple authenticator configurations
- Demonstrate the new `createOrganization` method with authenticator array
- Test `getOrganization` method to retrieve organization details
- Test `getWalletWithTag` method for tagged wallet retrieval
- Test `createAuthenticator` and `deleteAuthenticator` methods
- Show multiple clients accessing the same organization with different authenticators
- Generate `MULTI_AUTH_DEMO_SUMMARY.md` with comprehensive documentation

## Output Files

### Basic Setup Script Output

- **`demo-data.json`**: Contains your organization credentials (keyPair, organization details)
- **`SERVER_SDK_USAGE.md`**: Comprehensive Server SDK integration guide with your credentials

### Multi-Authenticator Demo Output

The multi-authenticator demo runs all tests in memory without creating any files. All test results are displayed in the console output.

## Phantom Client Features

The multi-authenticator demo showcases PhantomClient capabilities:

### Multi-Authenticator Organization Creation

```typescript
const org = await client.createOrganization(name, publicKey, [
  { authenticatorName: "Auth1", authenticatorKind: "keypair", publicKey: "...", algorithm: "Ed25519" },
  { authenticatorName: "Auth2", authenticatorKind: "oidc", jwksUrl: "...", idTokenClaims: {...} }
]);
```

### Organization Management

```typescript
const org = await client.getOrganization(organizationId);
```

### Tagged Wallet Retrieval

```typescript
const wallet = await client.getWalletWithTag({
  organizationId,
  tag: "demo-tag",
  derivationPaths: ["m/44'/501'/0'/0'"],
});
```

### Authenticator Management

```typescript
await client.createAuthenticator({
  organizationId,
  username,
  authenticatorName,
  authenticator: {
    publicKey: "base64url-string",
    authenticatorKind: "keypair",
    algorithm: "Ed25519",
    authenticatorName,
  },
});

await client.deleteAuthenticator({
  organizationId,
  username,
  authenticatorId,
});
```

### OIDC Authenticator Support

```typescript
{
  authenticatorKind: "oidc",
  jwksUrl: "https://issuer.com/.well-known/jwks.json",
  idTokenClaims: { sub: "user-id", iss: "issuer.com" }
}
```

## Next Steps

After running this setup tool:

1. **Secure your credentials**: Store the private key from `demo-data.json` securely
2. **Follow the Server SDK guide**: Use the generated `SERVER_SDK_USAGE.md` for integration
3. **Build your application**: Integrate wallet functionality using the Server SDK

## Security

⚠️ **Important**: The generated private key is your organization's master key. Keep it secure and never commit it to version control.
