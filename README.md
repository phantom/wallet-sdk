# Phantom Wallet SDK Monorepo

This monorepo contains the Phantom Wallet SDKs and demo applications.

## ⚠️ Deprecation Notice

**@phantom/wallet-sdk** (the embedded wallet SDK) is now deprecated. Future development and support will focus on the following packages:

- [@phantom/browser-sdk](https://www.npmjs.com/package/@phantom/browser-sdk): Core browser SDK for Phantom wallet integration (no UI components).
- [@phantom/react-sdk](https://www.npmjs.com/package/@phantom/react-sdk): React wrapper for the browser SDK, providing hooks and components for easy integration.

## Packages

- **[@phantom/browser-sdk](./packages/browser-sdk/README.md)**: Core browser SDK for Phantom wallet functionality. [NPM](https://www.npmjs.com/package/@phantom/browser-sdk)
- **[@phantom/react-sdk](./packages/react-sdk/README.md)**: React hooks and components for Phantom wallet. [NPM](https://www.npmjs.com/package/@phantom/react-sdk)
- **[@phantom/server-sdk](./packages/server-sdk/README.md)**: Server-side SDK for secure wallet management and transaction signing. [NPM](https://www.npmjs.com/package/@phantom/server-sdk)
- **@phantom/wallet-sdk (DEPRECATED)**: Embedded wallet SDK with UI (no longer maintained).

## Examples

You can find example applications in the [`examples/`](./examples) folder:

- [`examples/react-sdk-demo-app`](./examples/react-sdk-demo-app)
- [`examples/browser-sdk-demo-app`](./examples/browser-sdk-demo-app)
- [`examples/browser-embedded-sdk-demo-app`](./examples/browser-embedded-sdk-demo-app)

## Quick Start

### Using @phantom/browser-sdk

```bash
npm install @phantom/browser-sdk
# or
yarn add @phantom/browser-sdk
```

```typescript
import { createPhantom } from "@phantom/browser-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";

const phantom = createPhantom({
  plugins: [createSolanaPlugin()],
});

// Example: connect to wallet
const connect = async () => {
  const result = await phantom.solana.connect();
  console.log("Connected address:", result.address);
};
```

See the [@phantom/browser-sdk README](./packages/browser-sdk/README.md) for more details and API reference.

### Using @phantom/react-sdk

```bash
npm install @phantom/react-sdk @phantom/browser-sdk
# or
yarn add @phantom/react-sdk @phantom/browser-sdk
```

```tsx
import React from "react";
import { PhantomProvider, useConnect } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";

function App() {
  return (
    <PhantomProvider config={{ plugins: [createSolanaPlugin()] }}>
      <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect } = useConnect();
  const handleConnect = async () => {
    try {
      const connectedAccount = await connect();
      console.log("Wallet connected:", connectedAccount?.publicKey?.toString());
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };
  return <button onClick={handleConnect}>Connect to Solana</button>;
}
```

See the [@phantom/react-sdk README](./packages/react-sdk/README.md) for more details and API reference.

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build
```

### Developing locally

If you wanna contribute to this SDK and develop locally, we recommend using [`yalc`](https://github.com/wclr/yalc)

```
# Install yalc globally
npm install -g yalc

# In your monorepo package
cd packages/your-package
yalc publish

# In your external project
yalc add your-package-name
npm install
```

to update after changes:

```
# In monorepo package
yalc push

# Or in external project
yalc update
```

Don't forget to build changes: `yarn build`

NOTE: You can run this automatically using `yarn watch` in the root of this repo

## Give Feedback

Phantom SDKs are in active development and will be prioritizing features requested by early adopters. If you are interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Disclaimers

The embedded wallet is a beta version, and Phantom will not be liable for any losses or damages suffered by you or your end users.

Any suggestions, enhancement requests, recommendations, or other feedback provided by you regarding the embedded wallet will be the exclusive property of Phantom. By using this beta version and providing feedback, you agree to assign any rights in that feedback to Phantom.
