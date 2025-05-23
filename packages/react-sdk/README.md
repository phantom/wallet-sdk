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
  const { status, provider, error } = useProvider();

  if (status === 'loading') {
    return <div>Loading wallet...</div>;
  }

  if (status === 'error') {
    return <div>Error: {error}</div>;
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

```tsx
import { useProvider } from '@phantom/react-sdk/solana';

function SolanaComponent() {
  const { status, provider, error } = useProvider();

  switch (status) {
    case 'loading':
      return <div>Connecting to wallet...</div>;
    
    case 'error':
      return <div>Failed to connect: {error}</div>;
    
    case 'success':
      // Provider is available, you can use it to interact with Solana
      return (
        <button onClick={() => provider.connect()}>
          Connect Wallet
        </button>
      );
  }
}
```

#### Return Value

The hook returns an object with the following properties:

- `status: 'loading' | 'success' | 'error'` - Current status of the provider
- `provider: NonNullable<unknown> | null` - The Solana provider instance (null when not available)
- `error: string | null` - Error message if provider failed to load

#### Features

- **Automatic Retry**: Implements exponential backoff retry logic when provider is not immediately available
- **State Management**: Returns loading, success, and error states for better UX
- **Provider Observation**: Continuously observes for provider availability instead of throwing errors
- **React Integration**: Properly integrated with React lifecycle and context

### usePhantom

The `usePhantom` hook provides access to the base Phantom instance.

```tsx
import { usePhantom } from '@phantom/react-sdk';

function MyComponent() {
  const { phantom, isReady } = usePhantom();

  if (!isReady) {
    return <div>Initializing Phantom...</div>;
  }

  return (
    <div>
      <button onClick={() => phantom.show()}>Show Wallet</button>
      <button onClick={() => phantom.hide()}>Hide Wallet</button>
    </div>
  );
}
```

## Migration from Previous Version

If you were using the previous version of `useProvider` that could throw errors, update your code as follows:

### Before

```tsx
function MyComponent() {
  try {
    const provider = useProvider();
    // Use provider
  } catch (error) {
    // Handle error
  }
}
```

### After

```tsx
function MyComponent() {
  const { status, provider, error } = useProvider();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'error') {
    return <div>Error: {error}</div>;
  }

  // Provider is guaranteed to be available here
  // Use provider
}
```

## Advanced Usage

### Custom Error Handling

```tsx
function WalletComponent() {
  const { status, provider, error } = useProvider();

  if (status === 'error') {
    // Custom error handling based on error message
    if (error.includes('PhantomProvider')) {
      return <div>Please configure PhantomProvider properly</div>;
    }
    if (error.includes('solana plugin')) {
      return <div>Solana plugin not configured</div>;
    }
    return <div>Wallet connection failed: {error}</div>;
  }

  // ... rest of component
}
```

### Loading States

```tsx
function WalletComponent() {
  const { status, provider } = useProvider();

  return (
    <div>
      {status === 'loading' && (
        <div className="loading-spinner">
          Connecting to Phantom wallet...
        </div>
      )}
      
      {status === 'success' && (
        <SolanaWalletInterface provider={provider} />
      )}
    </div>
  );
}
```
