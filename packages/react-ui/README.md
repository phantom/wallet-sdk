# @phantom/react-ui

React UI components for Phantom Wallet SDK with built-in connection modal and customizable theming.

## Installation

```bash
npm install @phantom/react-ui
```

## Dependencies

This package requires the same network dependencies as the underlying SDK. Install based on the networks you want to support:

| Network Support | Required Dependencies              |
| --------------- | ---------------------------------- |
| Solana          | `@solana/web3.js` OR `@solana/kit` |
| Ethereum/EVM    | `viem`                             |

**Example for Solana + Ethereum support:**

```bash
npm install @phantom/react-ui @solana/web3.js viem
```

## Quick Start

The `@phantom/react-ui` package is a lightweight wrapper around `@phantom/react-sdk` that provides:

- **Modal-enhanced `useConnect`**: Connection hook with automatic modal UI
- **Re-exported hooks**: All other hooks from `@phantom/react-sdk` (useSolana, useEthereum, etc.)
- **Customizable theming**: CSS variables for styling

```tsx
import { PhantomProvider, useConnect , useSolana, useEthereum } from "@phantom/react-ui";
import { AddressType } from "@phantom/browser-sdk";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded",
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.solana, AddressType.ethereum],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
      }}
    >
        <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect, isConnecting } = useConnect(); // UI-enhanced
  const { solana } = useSolana(); // Standard from react-sdk
  const { ethereum } = useEthereum(); // Standard from react-sdk

  const handleConnect = () => {
    // Shows connection modal automatically
    connect();
  };

  const sendSolanaTransaction = async () => {
    // Use standard Solana hook - no UI wrapper needed
    if (solana.isAvailable) {
      const result = await solana.solana.signAndSendTransaction(transaction);
      console.log("Transaction sent:", result.signature);
    }
  };

  const sendEthereumTransaction = async () => {
    // Use standard Ethereum hook - no UI wrapper needed
    if (ethereum.isAvailable) {
      const result = await ethereum.ethereum.sendTransaction(transaction);
      console.log("Transaction sent:", result);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      <button onClick={sendSolanaTransaction}>Send SOL</button>
      <button onClick={sendEthereumTransaction}>Send ETH</button>
    </div>
  );
}
```

## What's Different

### Enhanced Hooks

- **`useConnect`**: Shows a connection modal with provider selection (injected/embedded)
- All other hooks are **re-exported directly** from `@phantom/react-sdk`

### Standard Hooks (Re-exported)

All other hooks work exactly the same as `@phantom/react-sdk`:

- `useSolana` - Solana operations
- `useEthereum` - Ethereum operations
- `usePhantom` - Core SDK state
- `useAccounts` - Account management
- `useDisconnect` - Disconnect functionality
- `useIsExtensionInstalled` - Extension detection
- `useAutoConfirm` - Auto-confirm settings

## API Reference

### useConnect (Enhanced)

The only UI-enhanced hook. Shows a modal for provider selection.

```tsx
import { useConnect } from "@phantom/react-ui";

function ConnectButton() {
  const { connect, isConnecting, error } = useConnect();

  const handleConnect = () => {
    connect(); // Shows modal automatically
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

### Connection Modal Features

- Provider selection (Browser Extension vs Embedded Wallet)
- Error handling with clear messages
- Loading states during connection
- Responsive design for mobile/desktop
- Keyboard navigation support

## Theming

Customize the modal appearance using CSS variables:

```css
:root {
  /* Modal */
  --phantom-ui-modal-bg: #ffffff;
  --phantom-ui-modal-overlay: rgba(0, 0, 0, 0.5);
  --phantom-ui-modal-border-radius: 12px;

  /* Buttons */
  --phantom-ui-button-bg: #ab9ff2;
  --phantom-ui-button-hover-bg: #9c8dff;
  --phantom-ui-button-text: #ffffff;
  --phantom-ui-button-border-radius: 8px;

  /* Text */
  --phantom-ui-text-primary: #212529;
  --phantom-ui-text-secondary: #6c757d;

  /* Spacing */
  --phantom-ui-spacing-sm: 8px;
  --phantom-ui-spacing-md: 16px;
  --phantom-ui-spacing-lg: 24px;
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --phantom-ui-modal-bg: #2d2d2d;
  --phantom-ui-text-primary: #ffffff;
  --phantom-ui-text-secondary: #b3b3b3;
}
```

Apply themes via the `theme` prop or CSS:

```tsx
<PhantomProvider theme="dark">
  <App />
</PhantomProvider>

// Or via CSS
<div data-theme="dark">
  <PhantomProvider>
    <App />
  </PhantomProvider>
</div>
```

## Migration from @phantom/react-sdk

Migration is simple - just add the UI provider and import `useConnect` from `@phantom/react-ui`:

### Before

```tsx
import { PhantomProvider, useConnect } from "@phantom/react-sdk";
```

### After

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { PhantomProvider, useConnect } from "@phantom/react-ui";
```

That's it! All other hooks work exactly the same.

## Architecture

- **`PhantomProvider`**: Provides modal context and connection UI
- **`useConnect`**: Enhanced with modal functionality
- **All other hooks**: Direct re-exports from `@phantom/react-sdk`

This keeps the package lightweight while providing the essential UI enhancement most applications need.

For detailed usage of chain-specific hooks, see the [@phantom/react-sdk documentation](../react-sdk/README.md).
