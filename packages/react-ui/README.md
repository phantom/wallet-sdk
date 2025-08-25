# @phantom/react-ui

React UI components for Phantom Wallet SDK with built-in connection and transaction modals, chain-specific operations, and customizable theming.

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

**Example for Solana + Ethereum support (using @solana/web3.js):**

```bash
npm install @phantom/react-ui @solana/web3.js viem
```

**Example for Solana + Ethereum support (using @solana/kit):**

```bash
npm install @phantom/react-ui @solana/kit viem
```

## Quick Start

### Basic Setup with Chain-Specific Operations

```tsx
import { PhantomProvider, useConnect, useSolana, useEthereum } from "@phantom/react-sdk";
import { PhantomUIProvider } from "@phantom/react-ui";
import { AddressType } from "@phantom/browser-sdk";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded",
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.solana, AddressType.ethereum],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        organizationId: "your-org-id",
      }}
    >
      <PhantomUIProvider>
        <WalletComponent />
      </PhantomUIProvider>
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect, isConnecting } = useConnect();
  const solana = useSolana();
  const ethereum = useEthereum();

  const handleConnect = async () => {
    // Automatically shows connection modal
    const { addresses } = await connect();
    console.log("Connected addresses:", addresses);
  };

  const sendSolanaTransaction = async () => {
    // Create Solana transaction
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();
    
    const fromAddress = await solana.getPublicKey();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: 1000000, // 0.001 SOL
    });

    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Automatically shows transaction confirmation modal
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.hash);
  };

  const signEthereumMessage = async () => {
    const accounts = await ethereum.getAccounts();
    // Automatically shows message signing modal
    const signature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);
    console.log("Message signed:", signature);
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      <button onClick={sendSolanaTransaction}>Send SOL</button>
      <button onClick={signEthereumMessage}>Sign Ethereum Message</button>
    </div>
  );
}
```

### Embedded Wallet Setup

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { PhantomUIProvider } from "@phantom/react-ui";
import { AddressType } from "@phantom/browser-sdk";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded",
        embeddedWalletType: "app-wallet", // or 'user-wallet'
        addressTypes: [AddressType.solana, AddressType.ethereum],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        organizationId: "your-org-id",
      }}
    >
      <PhantomUIProvider>
        <YourApp />
      </PhantomUIProvider>
    </PhantomProvider>
  );
}
```

## Connection Flow

The React UI follows the same connection pattern as the base SDK:

1. **Provider Setup**: Wrap your app with `PhantomProvider` and `PhantomUIProvider`
2. **Connection**: Use `useConnect()` to establish wallet connection with automatic UI
3. **Chain Operations**: Use chain-specific hooks (`useSolana()`, `useEthereum()`) for transactions with automatic modals

```tsx
function WalletExample() {
  const { connect } = useConnect();
  const solana = useSolana();
  const ethereum = useEthereum();

  // 1. Connect first (shows connection modal automatically)
  const handleConnect = async () => {
    await connect();
  };

  // 2. Then use chain-specific operations (shows transaction modals automatically)
  const sendSolanaTransaction = async () => {
    const result = await solana.signAndSendTransaction(transaction);
  };

  const sendEthereumTransaction = async () => {
    const result = await ethereum.sendTransaction(transaction);
  };
}
```

### Connection Options

For embedded user-wallets, you can specify authentication providers:

```tsx
const { connect } = useConnect();

// Default: Show provider selection screen
await connect();

// Google authentication (skips provider selection)
await connect({
  authOptions: {
    provider: "google",
  },
});

// Apple authentication (skips provider selection)
await connect({
  authOptions: {
    provider: "apple",
  },
});
```

## Features

- **🎨 Automatic UI**: Connection and transaction modals are automatically injected and managed
- **⛓️ Chain-Specific**: Uses dedicated hooks for Solana and Ethereum operations
- **🌈 Customizable Theming**: CSS variables for complete visual customization
- **📱 Responsive Design**: Works seamlessly on desktop and mobile
- **♿ Accessible**: Full keyboard navigation and screen reader support
- **🔒 Secure**: All authentication and transaction flows are handled securely

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
import { PhantomProvider } from "@phantom/react-sdk";
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

## Available Hooks

### Core Connection Hooks

#### useConnect

Enhanced connect hook that automatically shows connection modal for embedded wallets.

```tsx
import { useConnect } from "@phantom/react-sdk";

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

### Chain-Specific Hooks with UI

#### useSolana

Solana operations with automatic transaction modals:

```tsx
import { useSolana } from "@phantom/react-sdk";
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";

function SolanaOperations() {
  const solana = useSolana();

  const signMessage = async () => {
    // Automatically shows message confirmation modal
    const signature = await solana.signMessage("Hello Solana!");
    console.log("Signature:", signature);
  };

  const signAndSendTransaction = async () => {
    // Create transaction
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();
    
    const fromAddress = await solana.getPublicKey();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: 1000000, // 0.001 SOL
    });

    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Automatically shows transaction confirmation modal
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.hash);
  };

  const switchNetwork = async () => {
    await solana.switchNetwork('devnet');
  };

  return (
    <div>
      <button onClick={signMessage}>Sign Message</button>
      <button onClick={signAndSendTransaction}>Send Transaction</button>
      <button onClick={switchNetwork}>Switch to Devnet</button>
      <p>Connected: {solana.isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

#### useEthereum

Ethereum operations with automatic transaction modals:

```tsx
import { useEthereum } from "@phantom/react-sdk";

function EthereumOperations() {
  const ethereum = useEthereum();

  const signPersonalMessage = async () => {
    const accounts = await ethereum.getAccounts();
    // Automatically shows message confirmation modal
    const signature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);
    console.log("Signature:", signature);
  };

  const signTypedData = async () => {
    const accounts = await ethereum.getAccounts();
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" }
        ],
        Mail: [
          { name: "from", type: "string" },
          { name: "to", type: "string" },
          { name: "contents", type: "string" }
        ]
      },
      primaryType: "Mail",
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 1,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      },
      message: {
        from: "Alice",
        to: "Bob",
        contents: "Hello!"
      }
    };

    // Automatically shows typed data confirmation modal
    const signature = await ethereum.signTypedData(typedData);
    console.log("Typed data signature:", signature);
  };

  const sendTransaction = async () => {
    // Automatically shows transaction confirmation modal
    const result = await ethereum.sendTransaction({
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: "1000000000000000000", // 1 ETH in wei
      gas: "21000",
    });
    console.log("Transaction sent:", result.hash);
  };

  const switchChain = async () => {
    await ethereum.switchChain(137); // Switch to Polygon
  };

  return (
    <div>
      <button onClick={signPersonalMessage}>Sign Personal Message</button>
      <button onClick={signTypedData}>Sign Typed Data</button>
      <button onClick={sendTransaction}>Send Transaction</button>
      <button onClick={switchChain}>Switch to Polygon</button>
      <p>Connected: {ethereum.isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## Transaction Examples

### Solana with @solana/web3.js

```tsx
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";
import { useSolana } from "@phantom/react-sdk";

function SolanaExample() {
  const solana = useSolana();

  const sendTransaction = async () => {
    // Get recent blockhash
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transfer instruction
    const fromAddress = await solana.getPublicKey();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: 1000000, // 0.001 SOL
    });

    // Create VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Automatically shows transaction confirmation modal
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.hash);
  };

  return <button onClick={sendTransaction}>Send SOL</button>;
}
```

### Solana with @solana/kit

```tsx
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { useSolana } from "@phantom/react-sdk";

function SolanaKitExample() {
  const solana = useSolana();

  const sendTransaction = async () => {
    const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const userPublicKey = await solana.getPublicKey();
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    // Automatically shows transaction confirmation modal
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.hash);
  };

  return <button onClick={sendTransaction}>Send SOL</button>;
}
```

### Ethereum with Viem

```tsx
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { useEthereum } from "@phantom/react-sdk";

function EthereumExample() {
  const ethereum = useEthereum();

  const sendEth = async () => {
    // Automatically shows transaction confirmation modal
    const result = await ethereum.sendTransaction({
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: parseEther("1").toString(), // 1 ETH
      gas: "21000",
      gasPrice: parseGwei("20").toString(), // 20 gwei
    });
    console.log("ETH sent:", result.hash);
  };

  const sendToken = async () => {
    // Automatically shows transaction confirmation modal
    const result = await ethereum.sendTransaction({
      to: tokenContractAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, parseEther("100")],
      }),
      gas: "50000",
      maxFeePerGas: parseGwei("30").toString(),
      maxPriorityFeePerGas: parseGwei("2").toString(),
    });
    console.log("Token sent:", result.hash);
  };

  return (
    <div>
      <button onClick={sendEth}>Send ETH</button>
      <button onClick={sendToken}>Send Token</button>
    </div>
  );
}
```

## Modal Features

### Transaction Modal Features

The transaction modal automatically appears for transaction confirmations and includes:

- **Transaction Preview**: Chain-specific transaction details
- **Network Information**: Clear network identification
- **Fee Information**: Gas/fee estimates when available
- **Security Warnings**: Alerts for potentially risky transactions
- **Approve/Reject**: User confirmation buttons with loading states

### Message Modal Features

The message modal automatically appears for message signing and includes:

- **Message Preview**: Clear display of message content
- **Chain Identification**: Shows which chain is being used
- **Security Information**: Explains what signing means
- **Typed Data Support**: Special formatting for EIP-712 structured data

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

## Modal Behavior

### Automatic Modal Management

The `PhantomUIProvider` automatically handles all modal state:

- **Connection Modal**: Shows when `connect()` is called
- **Transaction Modal**: Shows when chain-specific transaction methods are called
- **Message Modal**: Shows when chain-specific message signing methods are called
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

### Chain-Specific Hook Returns

All hooks return the same interface as `@phantom/react-sdk` with automatic UI integration:

```typescript
// useSolana
interface UseSolanaReturn {
  solana: ISolanaChain | null;
  signMessage: (message: string | Uint8Array) => Promise<ParsedSignatureResult>;
  signTransaction: <T>(transaction: T) => Promise<T>;
  signAndSendTransaction: <T>(transaction: T) => Promise<ParsedTransactionResult>;
  switchNetwork: (network: "mainnet" | "devnet") => Promise<void>;
  getPublicKey: () => Promise<string | null>;
  isAvailable: boolean;
  isConnected: boolean;
}

// useEthereum
interface UseEthereumReturn {
  ethereum: IEthereumChain | null;
  request: <T = any>(args: { method: string; params?: unknown[] }) => Promise<T>;
  signPersonalMessage: (message: string, address: string) => Promise<ParsedSignatureResult>;
  signTypedData: (typedData: any) => Promise<ParsedSignatureResult>;
  sendTransaction: (transaction: EthTransactionRequest) => Promise<ParsedTransactionResult>;
  switchChain: (chainId: number) => Promise<void>;
  getChainId: () => Promise<number>;
  getAccounts: () => Promise<string[]>;
  isAvailable: boolean;
  isConnected: boolean;
}
```

## Migration from @phantom/react-sdk

Migration is straightforward - just add the UI provider and enjoy automatic modals:

### Before

```tsx
import { PhantomProvider, useConnect, useSolana, useEthereum } from "@phantom/react-sdk";

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
import { PhantomProvider, useConnect, useSolana, useEthereum } from "@phantom/react-sdk";
import { PhantomUIProvider } from "@phantom/react-ui";

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

For more details and examples, see the [@phantom/react-sdk documentation](../react-sdk/README.md).