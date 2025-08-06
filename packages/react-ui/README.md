# @phantom/react-ui

React UI components for Phantom Wallet SDK embedded wallets with built-in connection and transaction modals, enhanced hooks, and customizable theming.

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
| Bitcoin         | `bitcoinjs-lib`                    |
| Sui             | `@mysten/sui.js`                   |

**Example for Solana + Ethereum support (using @solana/web3.js):**

```bash
npm install @phantom/react-ui @solana/web3.js viem
```

**Example for Solana + Ethereum support (using @solana/kit):**

```bash
npm install @phantom/react-ui @solana/kit viem
```

For complete dependency information, see the [@phantom/react-sdk documentation](../react-sdk/README.md).

## Solana Provider Configuration

When using `AddressType.solana`, you can choose between two Solana libraries:

```tsx
const phantomConfig = {
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  solanaProvider: "web3js", // or 'kit'
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  organizationId: "your-org-id",
};
```

**Provider Options:**

- `'web3js'` (default) - Uses `@solana/web3.js` library
- `'kit'` - Uses `@solana/kit` library (modern, TypeScript-first)

**When to use each:**

- **@solana/web3.js**: Better ecosystem compatibility, wider community support
- **@solana/kit**: Better TypeScript support, modern architecture, smaller bundle size

## Quick Start

### Basic Setup

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { PhantomUIProvider, useConnect, useSignAndSendTransaction } from "@phantom/react-ui";
import { AddressType, NetworkId } from "@phantom/client";

const phantomConfig = {
  providerType: "embedded",
  embeddedWalletType: "user-wallet",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  solanaProvider: "web3js", // or 'kit'
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  organizationId: "your-org-id",
};

function MyApp() {
  const { connect, isConnecting } = useConnect();
  const { signAndSendTransaction, isLoading } = useSignAndSendTransaction();

  const handleConnect = async () => {
    try {
      const result = await connect();
      console.log("Connected:", result);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleTransaction = async () => {
    try {
      const result = await signAndSendTransaction({
        networkId: NetworkId.SOLANA_MAINNET,
        transaction: mySolanaTransaction,
      });
      console.log("Transaction successful:", result);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>

      <button onClick={handleTransaction} disabled={isLoading}>
        {isLoading ? "Processing..." : "Send Transaction"}
      </button>

      {/* No need to add modals - they're automatically injected! */}
    </div>
  );
}

function App() {
  return (
    <PhantomProvider config={phantomConfig}>
      <PhantomUIProvider>
        <MyApp />
      </PhantomUIProvider>
    </PhantomProvider>
  );
}
```

## Features

- **🎨 Automatic UI**: Connection and transaction modals are automatically injected and managed
- **🎯 Enhanced Hooks**: Same API as react-sdk but with built-in UI integration
- **🌈 Customizable Theming**: CSS variables for complete visual customization
- **📱 Responsive Design**: Works seamlessly on desktop and mobile
- **♿ Accessible**: Full keyboard navigation and screen reader support
- **🔒 Secure**: All authentication and transaction flows are handled securely

## PhantomUIProvider

The `PhantomUIProvider` wraps your application and automatically manages all UI state, modals, and interactions.

### Features

- **Automatic Modal Management**: Connection and transaction modals are injected automatically
- **State Management**: Handles all UI state (loading, errors, modal visibility)
- **Wallet Type Selection**: Built-in support for app-wallet vs user-wallet choice
- **Theme Integration**: Applies your custom theme across all components
- **Context Sharing**: Provides UI state to all child components

### Usage

```tsx
import { PhantomUIProvider } from "@phantom/react-ui";

function App() {
  return (
    <PhantomProvider config={phantomConfig}>
      <PhantomUIProvider>
        <YourApp />
      </PhantomUIProvider>
    </PhantomProvider>
  );
}
```

## Enhanced Hooks

All hooks have the same API as `@phantom/react-sdk` but with built-in UI integration.

### useConnect

Enhanced connect hook that automatically shows connection modal for embedded wallets.

```tsx
import { useConnect } from "@phantom/react-ui";

function ConnectButton() {
  const { connect, isConnecting, error } = useConnect();

  const handleConnect = async () => {
    // Automatically shows connection modal with provider options
    await connect();
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

#### Connection Modal Features

The connection modal automatically appears when `connect()` is called and includes:

- **Primary Option**: Continue with Google (embedded user-wallet)
- **Alternative Option**: Create Fresh Wallet (embedded app-wallet)
- **Error Handling**: Clear error messages and retry options
- **Loading States**: Visual feedback during connection process

### useSignAndSendTransaction

Enhanced transaction hook that automatically shows transaction confirmation modal.

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-ui";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

function SendTransaction() {
  const { signAndSendTransaction, isLoading, error } = useSignAndSendTransaction();

  const handleSend = async () => {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(toAddress),
        lamports: 1000000,
      }),
    );

    // Automatically shows transaction confirmation modal
    const result = await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? "Processing..." : "Send Transaction"}
    </button>
  );
}
```

#### Transaction Modal Features

The transaction modal automatically appears for transaction confirmations and includes:

- **Transaction Preview**: Chain-specific transaction details
- **Network Information**: Clear network identification
- **Fee Information**: Gas/fee estimates when available
- **Security Warnings**: Alerts for potentially risky transactions
- **Approve/Reject**: User confirmation buttons with loading states

### useSignMessage

Enhanced message signing hook with automatic confirmation modal.

```tsx
import { useSignMessage, NetworkId } from "@phantom/react-ui";

function SignMessage() {
  const { signMessage, isLoading, error } = useSignMessage();

  const handleSign = async () => {
    // Automatically shows message confirmation modal
    const signature = await signMessage({
      message: "Hello from Phantom!",
      networkId: NetworkId.SOLANA_MAINNET,
    });
  };

  return (
    <button onClick={handleSign} disabled={isLoading}>
      {isLoading ? "Signing..." : "Sign Message"}
    </button>
  );
}
```

## Theming System

Customize the appearance of all UI components using CSS variables.

### CSS Variables

```css
:root {
  /* Colors */
  --primary: #ab9ff2;
  --primary-hover: #9c8dff;
  --secondary: #6c757d;
  --secondary-hover: #545b62;
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ffc107;
  --info: #17a2b8;

  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-modal: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Text */
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #868e96;
  --text-inverse: #ffffff;

  /* Border */
  --border-color: #dee2e6;
  --border-radius: 8px;
  --border-radius-lg: 12px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 600;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Animation */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.35s ease;
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-modal: #2d2d2d;
  --bg-overlay: rgba(0, 0, 0, 0.8);

  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --text-muted: #808080;

  --border-color: #404040;
}
```

### Custom Theme Example

```css
/* Custom brand theme */
:root {
  --primary: #ff6b35;
  --primary-hover: #e55a2b;
  --bg-modal: #f0f8ff;
  --border-radius: 16px;
  --font-family: "Inter", sans-serif;
}
```

### Applying Themes

```tsx
// Apply theme at the root level
function App() {
  return (
    <div data-theme="dark">
      <PhantomProvider config={phantomConfig}>
        <PhantomUIProvider>
          <YourApp />
        </PhantomUIProvider>
      </PhantomProvider>
    </div>
  );
}

// Or toggle themes dynamically
function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>Toggle Theme</button>;
}
```

## Advanced Usage

### Multi-Chain Application

#### Using @solana/web3.js

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-ui";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { parseEther } from "viem";

function MultiChainApp() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendSolana = async () => {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: new PublicKey(recipient),
        lamports: 1000000,
      }),
    );

    await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };

  const sendEthereum = async () => {
    await signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: recipient,
        value: parseEther("0.1"),
        gas: 21000n,
      },
    });
  };

  return (
    <div>
      <button onClick={sendSolana}>Send SOL</button>
      <button onClick={sendEthereum}>Send ETH</button>
    </div>
  );
}
```

#### Using @solana/kit

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-ui";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { parseEther } from "viem";

function MultiChainAppWithKit() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendSolana = async () => {
    const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };

  const sendEthereum = async () => {
    await signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: recipient,
        value: parseEther("0.1"),
        gas: 21000n,
      },
    });
  };

  return (
    <div>
      <button onClick={sendSolana}>Send SOL</button>
      <button onClick={sendEthereum}>Send ETH</button>
    </div>
  );
}
```

### Custom Error Handling

```tsx
function TransactionWithErrorHandling() {
  const { signAndSendTransaction, error } = useSignAndSendTransaction();

  const handleTransaction = async () => {
    try {
      await signAndSendTransaction({
        networkId: NetworkId.SOLANA_MAINNET,
        transaction: myTransaction,
      });
    } catch (error) {
      // Handle specific error types
      if (error.message.includes("User rejected")) {
        console.log("User cancelled transaction");
      } else if (error.message.includes("insufficient funds")) {
        console.log("Insufficient balance");
      }
    }
  };

  return (
    <div>
      <button onClick={handleTransaction}>Send Transaction</button>
      {error && <div className="error-message">Error: {error.message}</div>}
    </div>
  );
}
```

## Modal Behavior

### Automatic Modal Management

The `PhantomUIProvider` automatically handles all modal state:

- **Connection Modal**: Shows when `connect()` is called
- **Transaction Modal**: Shows when `signAndSendTransaction()` is called
- **Message Modal**: Shows when `signMessage()` is called
- **Auto-close**: Modals close automatically on success or user cancellation
- **Error States**: Modals show errors inline without closing
- **Loading States**: Modals show loading indicators during processing

### Modal Features

- **Responsive Design**: Optimized for desktop and mobile
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Click Outside**: Close modals by clicking the overlay
- **Animation**: Smooth entrance and exit animations
- **Accessibility**: ARIA labels and screen reader support

## API Reference

### PhantomUIProvider Props

```typescript
interface PhantomUIProviderProps {
  children: React.ReactNode;
  theme?: "light" | "dark" | "auto";
  customTheme?: Record<string, string>;
}
```

### Enhanced Hook Returns

All hooks return the same interface as `@phantom/react-sdk` but with enhanced UI integration:

```typescript
// useConnect
interface UseConnectReturn {
  connect: () => Promise<{ walletId: string; addresses: WalletAddress[] }>;
  isConnecting: boolean;
  error: Error | null;
}

// useSignAndSendTransaction
interface UseSignAndSendTransactionReturn {
  signAndSendTransaction: (params: TransactionParams) => Promise<TransactionResult>;
  isLoading: boolean;
  error: Error | null;
}

// useSignMessage
interface UseSignMessageReturn {
  signMessage: (params: SignMessageParams) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}
```

## Migration from @phantom/react-sdk

Migration is straightforward - just replace the provider and imports:

### Before

```tsx
import { PhantomProvider, useConnect, useSignAndSendTransaction } from "@phantom/react-sdk";

function App() {
  return (
    <PhantomProvider config={config}>
      <MyApp />
    </PhantomProvider>
  );
}
```

### After

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { PhantomUIProvider, useConnect, useSignAndSendTransaction } from "@phantom/react-ui";

function App() {
  return (
    <PhantomProvider config={config}>
      <PhantomUIProvider>
        <MyApp />
      </PhantomUIProvider>
    </PhantomProvider>
  );
}
```

The hook APIs remain identical, but now include automatic UI integration!

## Troubleshooting

### Modals Not Appearing

Make sure you've wrapped your app with `PhantomUIProvider`:

```tsx
// Correct
<PhantomProvider config={config}>
  <PhantomUIProvider>
    <App />
  </PhantomUIProvider>
</PhantomProvider>

// Incorrect - missing PhantomUIProvider
<PhantomProvider config={config}>
  <App />
</PhantomProvider>
```

### Styling Issues

Ensure CSS variables are properly loaded:

```css
/* Include in your main CSS file */
@import "@phantom/react-ui/dist/styles.css";
```

### Theme Not Applied

Check the theme attribute is set correctly:

```tsx
<div data-theme="dark">
  <App />
</div>
```

For more details and examples, see the [implementation guide](../../PHANTOM_SDK_IMPLEMENTATION_GUIDE.md).
