# Phantom React Native SDK

A comprehensive React Native SDK for integrating Phantom Wallet functionality into your mobile applications. Built with Expo compatibility and optimized for both iOS and Android platforms.

## Features

- 🔐 **Hardware-backed security** with Expo SecureStore (iOS Keychain + Android Keystore)
- 🌐 **OAuth authentication** flows using system browsers for security and UX
- 🔗 **Automatic deep linking** with custom URL schemes
- ⚛️ **React hooks API** for easy integration
- 📱 **Cross-platform** support (iOS, Android)
- 🛡️ **Biometric authentication** for accessing stored wallet data
- 🎯 **TypeScript support** with full type safety

## Installation

### Using npm

```bash
npm install @phantom/react-native-sdk
```

### Using yarn

```bash
yarn add @phantom/react-native-sdk
```

### Install peer dependencies

```bash
# For Expo projects
npx expo install expo-secure-store expo-web-browser expo-auth-session expo-router

# For bare React Native projects (additional setup required)
npm install expo-secure-store expo-web-browser expo-auth-session

# Required polyfill for cryptographic operations
npm install react-native-get-random-values
```

### Required Polyfill

You must polyfill random byte generation to ensure cryptographic operations work properly. Add this import **at the very top** of your app's entry point (before any other imports):

```tsx
// index.js, App.tsx, or _layout.tsx - MUST be the first import
import "react-native-get-random-values";

import { PhantomProvider } from "@phantom/react-native-sdk";
// ... other imports
```

> **⚠️ Important**: The polyfill import must be the first import in your application entry point to ensure proper initialization of cryptographic functions.

## Quick Start

### 1. Configure your app scheme

#### For Expo projects

Add your custom scheme to `app.json`:

```json
{
  "expo": {
    "name": "My Wallet App",
    "slug": "my-wallet-app",
    "scheme": "mywalletapp",
    "plugins": [["expo-router"], ["expo-secure-store"], ["expo-web-browser"], ["expo-auth-session"]]
  }
}
```

#### For bare React Native projects

- **iOS**: Configure URL schemes in `Info.plist`
- **Android**: Add intent filters to `AndroidManifest.xml`

### 2. Set up the provider

Wrap your app with `PhantomProvider`:

```tsx
// App.tsx or _layout.tsx (for Expo Router)
import { PhantomProvider, AddressType } from "@phantom/react-native-sdk";

export default function App() {
  return (
    <PhantomProvider
      config={{
        appId: "your-app-id", // Get your app ID from phantom.com/portal
        scheme: "mywalletapp", // Must match app.json scheme
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl: "mywalletapp://phantom-auth-callback",
        },
      }}
    >
      <YourAppContent />
    </PhantomProvider>
  );
}
```

### 3. Use hooks in your components

```tsx
// WalletScreen.tsx
import React from "react";
import { View, Button, Text, Alert } from "react-native";
import { useConnect, useAccounts, useSolana, useEthereum, useDisconnect } from "@phantom/react-native-sdk";

export function WalletScreen() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { addresses, isConnected } = useAccounts();
  const solana = useSolana();
  const ethereum = useEthereum();
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    try {
      await connect({ provider: "google" });
      Alert.alert("Success", "Wallet connected!");
    } catch (error) {
      Alert.alert("Error", `Failed to connect: ${error.message}`);
    }
  };

  const handleSignSolanaMessage = async () => {
    try {
      if (solana.isAvailable) {
        const signature = await solana.solana.signMessage("Hello from Solana!");
        Alert.alert("Solana Signed!", `Signature: ${signature.signature.slice(0, 10)}...`);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to sign: ${error.message}`);
    }
  };

  const handleSignEthereumMessage = async () => {
    try {
      if (ethereum.isAvailable) {
        const accounts = await ethereum.ethereum.getAccounts();
        const signature = await ethereum.ethereum.signPersonalMessage("Hello from Ethereum!", accounts[0]);
        Alert.alert("Ethereum Signed!", `Signature: ${signature.slice(0, 10)}...`);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to sign: ${error.message}`);
    }
  };

  if (!isConnected) {
    return (
      <View style={{ padding: 20 }}>
        <Button
          title={isConnecting ? "Connecting..." : "Connect Wallet"}
          onPress={handleConnect}
          disabled={isConnecting}
        />
        {connectError && <Text style={{ color: "red", marginTop: 10 }}>Error: {connectError.message}</Text>}
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Wallet Connected</Text>
      {addresses.map((addr, index) => (
        <Text key={index}>
          {addr.addressType}: {addr.address}
        </Text>
      ))}

      <Button title="Sign Solana Message" onPress={handleSignSolanaMessage} style={{ marginTop: 10 }} />

      <Button title="Sign Ethereum Message" onPress={handleSignEthereumMessage} style={{ marginTop: 10 }} />

      <Button title="Disconnect" onPress={disconnect} style={{ marginTop: 10 }} />
    </View>
  );
}
```

## API Reference

### PhantomProvider

The main provider component that initializes the SDK and provides context to all hooks.

```tsx
<PhantomProvider config={config}>
  <App />
</PhantomProvider>
```

#### Configuration Options

```typescript
interface PhantomSDKConfig {
  scheme: string; // Custom URL scheme for your app
  appId: string; // Your app ID from phantom.com/portal (required)
  addressTypes: [AddressType, ...AddressType[]]; // e.g., [AddressType.solana]
  
  // Optional configuration
  embeddedWalletType?: "user-wallet"; // optional, defaults to "user-wallet", currently the only supported type
  apiBaseUrl?: string; // e.g., "https://api.phantom.app/v1/wallets" (optional, has default)
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional)
    redirectUrl?: string; // Custom redirect URL (optional)
  };
  autoConnect?: boolean; // Auto-connect to existing session on SDK instantiation (optional, defaults to true)
}
```

### Hooks

#### useConnect

Manages wallet connection functionality.

```typescript
const { connect, isConnecting, error } = useConnect();

// Connect with specific provider
await connect({ provider: "google" });
await connect({ provider: "apple" });
await connect({ provider: "jwt", jwtToken: "your-jwt-token" });
```

#### useAccounts

Provides access to connected wallet information.

```typescript
const {
  addresses, // Array of wallet addresses
  isConnected, // Connection status
  walletId, // Phantom wallet ID
} = useAccounts();
```

#### useSolana

Provides access to Solana-specific operations.

```typescript
const { solana, isAvailable } = useSolana();

if (isAvailable) {
  // Sign a message
  const signature = await solana.signMessage("Hello Solana!");

  // Sign a transaction (without sending)
  const signedTx = await solana.signTransaction(transaction);

  // Sign and send a transaction
  const result = await solana.signAndSendTransaction(transaction);
}
```

#### useEthereum

Provides access to Ethereum-specific operations.

```typescript
const { ethereum, isAvailable } = useEthereum();

if (isAvailable) {
  // Get accounts
  const accounts = await ethereum.getAccounts();

  // Sign a personal message
  const signature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);

  // Sign a transaction (without sending)
  const signedTx = await ethereum.signTransaction(transactionData);

  // Sign and send a transaction  
  const result = await ethereum.sendTransaction(transactionData);

  // Get current chain ID
  const chainId = await ethereum.getChainId();
}
```

#### useDisconnect

Manages wallet disconnection.

```typescript
const { disconnect, isDisconnecting } = useDisconnect();

await disconnect();
```

## Authentication Flows

### OAuth Providers

The SDK supports multiple OAuth providers:

- **Google** (`provider: 'google'`)
- **Apple** (`provider: 'apple'`)
- **JWT** (`provider: 'jwt'`) - For custom authentication

### Authentication Process

1. User taps "Connect Wallet" in your app
2. System browser opens (Safari on iOS, Chrome Custom Tab on Android)
3. User authenticates with their chosen provider
4. Browser redirects back to your app using the custom scheme
5. SDK automatically processes the authentication result
6. Wallet is connected and ready to use

### Deep Link Handling

The SDK automatically handles deep link redirects. Ensure your app's URL scheme is properly configured:

**Redirect URL format:** `{scheme}://phantom-auth-callback?wallet_id=...&session_id=...`

## Security Features

### Secure Storage

- **iOS**: Uses Keychain Services with hardware security
- **Android**: Uses Android Keystore with hardware-backed keys
- **Biometric Protection**: Optional biometric authentication for accessing stored data

### Authentication Security

- **System Browser**: Uses secure system browsers, not in-app webviews
- **Origin Verification**: Automatic verification of redirect origins
- **PKCE**: Support for Proof Key for Code Exchange in OAuth flows
- **Hardware Security**: Private keys stored in secure hardware when available

## Configuration Examples

### Basic Configuration

```tsx
import { PhantomProvider, AddressType } from "@phantom/react-native-sdk";

<PhantomProvider
  config={{
    appId: "your-app-id",
    scheme: "myapp",
    addressTypes: [AddressType.solana],
  }}
>
  <App />
</PhantomProvider>;
```

### Multi-Chain Configuration

```tsx
import { PhantomProvider, AddressType } from "@phantom/react-native-sdk";

<PhantomProvider
  config={{
    appId: "your-app-id",
    scheme: "mycompany-wallet",
    addressTypes: [AddressType.solana, AddressType.ethereum],
    authOptions: {
      redirectUrl: "mycompany-wallet://auth/success",
    },
  }}
>
  <App />
</PhantomProvider>;
```

## Platform Setup

### iOS Setup

1. **URL Scheme**: Automatically configured by Expo
2. **Keychain Access**: Ensure your app has keychain access entitlements
3. **Associated Domains**: Configure if using universal links

### Android Setup

1. **Intent Filters**: Automatically configured by Expo
2. **Keystore Access**: Ensure your app targets API level 23+
3. **Network Security**: Configure network security config if needed

## Testing

### Development Testing

```typescript
// Mock provider for testing
import { PhantomProvider, AddressType } from '@phantom/react-native-sdk';

const testConfig = {
  appId: "test-app",
  scheme: "testapp",
  addressTypes: [AddressType.solana],
};

<PhantomProvider config={testConfig}>
  <TestApp />
</PhantomProvider>
```

### Deep Link Testing

Test deep links in development builds (not Expo Go):

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://phantom-auth-callback?wallet_id=test"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "myapp://phantom-auth-callback?wallet_id=test" com.yourcompany.myapp
```

### Common Issues

1. **"Scheme not configured"**
   - Ensure your app's URL scheme matches the `scheme` in config
   - Check `app.json` (Expo) or platform-specific configuration

2. **"Authentication failed"**
   - Verify your organization ID is correct
   - Check network connectivity
   - Ensure redirect URL matches your scheme

3. **"Storage access denied"**
   - Check device security settings
   - Ensure app has proper permissions
   - Verify biometric authentication is available

4. **Deep links not working**
   - Test with development builds, not Expo Go
   - Verify URL scheme configuration
   - Check intent filters (Android) or URL schemes (iOS)

### Debug Configuration

The React Native SDK supports separate debug configuration for better performance and dynamic control:

```typescript
import { PhantomProvider, type PhantomSDKConfig, type PhantomDebugConfig } from "@phantom/react-native-sdk";

function App() {
  // SDK configuration - static, won't change when debug settings change
  const config: PhantomSDKConfig = {
    appId: "your-app-id",
    scheme: "mywalletapp",
    // ... other config
  };

  // Debug configuration - separate to avoid SDK reinstantiation
  const debugConfig: PhantomDebugConfig = {
    enabled: true, // Enable debug logging
  };

  return (
    <PhantomProvider config={config} debugConfig={debugConfig}>
      <App />
    </PhantomProvider>
  );
}
```

**PhantomDebugConfig Interface:**

```typescript
interface PhantomDebugConfig {
  enabled?: boolean; // Enable debug logging (default: false)
}
```

## Support

- **Documentation**: [phantom.app/docs](https://phantom.app/docs)
- **GitHub Issues**: [github.com/phantom/wallet-sdk/issues](https://github.com/phantom/wallet-sdk/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details.
