# Phantom React SDK

React hooks and components for integrating with Phantom wallet.

## Installation

```bash
npm install @phantom/react-sdk @phantom/browser-sdk
```

## Quick Start

```tsx
import React from 'react';
import { PhantomProvider } from '@phantom/react-sdk';
import { createSolanaPlugin } from '@phantom/browser-sdk/solana';
import { useProvider } from '@phantom/react-sdk/solana';

function App() {
  return (
    <PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>
      <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { status, provider } = useProvider();

  if (status === 'loading') {
    return <div>Loading wallet...</div>;
  }

  if (status === 'error') {
    return <div>Error</div>;
  }

  if (status === 'success') {
    return (
      <div>
        <div>Wallet connected!</div>
        <button onClick={() => provider.connect()}>
          Connect to Solana
        </button>
      </div>
    );
  }

  return null;
}
```

## API Reference

### PhantomProvider

The PhantomProvider component provides the Phantom context to child components.

```tsx
import { PhantomProvider } from '@phantom/react-sdk';
import { createSolanaPlugin } from '@phantom/browser-sdk/solana';

<PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>
  {children}
</PhantomProvider>
```

### useProvider (Solana)

The `useProvider` hook provides access to the Solana provider with automatic retry logic and state management.

#### Return Value

The hook returns an object with the following properties:

- `status: 'loading' | 'success' | 'error'` - Current status of the provider
- `provider: NonNullable<unknown> | null` - The Solana provider instance (null when not available)
