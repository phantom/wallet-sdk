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
        organizationId: "your-organization-id",
        scheme: "mywalletapp", // Must match app.json scheme
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.solana],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
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
import { useConnect, useAccounts, useSignMessage, useDisconnect } from "@phantom/react-native-sdk";

export function WalletScreen() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { addresses, isConnected, walletId } = useAccounts();
  const { signMessage, isSigning } = useSignMessage();
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    try {
      await connect({ provider: "google" });
      Alert.alert("Success", "Wallet connected!");
    } catch (error) {
      Alert.alert("Error", `Failed to connect: ${error.message}`);
    }
  };

  const handleSignMessage = async () => {
    try {
      const signature = await signMessage({
        message: "Hello from my React Native app!",
        networkId: "solana:mainnet",
      });
      Alert.alert("Signed!", `Signature: ${signature.slice(0, 10)}...`);
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
      <Text>Wallet ID: {walletId}</Text>
      <Text>Address: {addresses[0]?.address}</Text>

      <Button
        title={isSigning ? "Signing..." : "Sign Message"}
        onPress={handleSignMessage}
        disabled={isSigning}
        style={{ marginTop: 10 }}
      />

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
interface PhantomProviderConfig {
  organizationId: string; // Your Phantom organization ID
  scheme: string; // Custom URL scheme for your app
  embeddedWalletType: "user-wallet" | "app-wallet";
  addressTypes: AddressType[];
  apiBaseUrl: "https://api.phantom.app/v1/wallets";
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional)
    redirectUrl?: string; // Custom redirect URL (optional)
  };
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

#### useSignMessage

Handles message signing operations.

```typescript
const { signMessage, isSigning, error } = useSignMessage();

const signature = await signMessage({
  message: "Message to sign",
  networkId: "solana:mainnet", // or 'ethereum:1'
});
```

#### useSignAndSendTransaction

Handles transaction signing and sending.

```typescript
const { signAndSendTransaction, isSigning, error } = useSignAndSendTransaction();

const result = await signAndSendTransaction({
  transaction: "base64-encoded-transaction",
  networkId: NetworkId.SOLANA_MAINNET,
});
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
    organizationId: "org_123456789",
    scheme: "myapp",
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
  }}
>
  <App />
</PhantomProvider>;
```

### Advanced Configuration

```tsx
import { PhantomProvider, AddressType } from "@phantom/react-native-sdk";

<PhantomProvider
  config={{
    organizationId: "org_123456789",
    scheme: "mycompany-wallet",
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana, AddressType.ethereum],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    authOptions: {
      authUrl: "https://auth.yourcompany.com",
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
  organizationId: "test-org",
  scheme: "testapp",
  embeddedWalletType: "app-wallet" as const,
  addressTypes: [AddressType.solana],
  apiBaseUrl: "https://api.phantom.app/v1/wallets",

};

// Use app-wallet for testing (no OAuth required)
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

### Debug Mode

Enable debug logging in development:

```typescript
<PhantomProvider
  config={{
    ...config,
    debug: true  // Enable debug logging
  }}
>
  <App />
</PhantomProvider>
```

## Support

- **Documentation**: [phantom.app/docs](https://phantom.app/docs)
- **GitHub Issues**: [github.com/phantom/wallet-sdk/issues](https://github.com/phantom/wallet-sdk/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details.
