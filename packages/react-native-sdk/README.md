# Phantom React Native SDK

A comprehensive React Native SDK for integrating Phantom Wallet functionality into your mobile applications. Works with both Expo and bare React Native projects, optimized for iOS and Android platforms.

## Features

- 🔐 **Hardware-backed security** with iOS Keychain + Android Keystore (via react-native-keychain)
- 🌐 **OAuth authentication** flows using system browsers or in-app browsers
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

### Install storage and browser dependencies (choose one option)

#### Option 1: Secure storage with react-native-keychain (Recommended)
```bash
# Install secure storage
npm install react-native-keychain

# For iOS, run:
cd ios && pod install
```

#### Option 2: Basic storage with AsyncStorage
```bash
# Install basic storage (less secure)
npm install @react-native-async-storage/async-storage
```

#### Optional: In-app browser for better UX
```bash
# Install in-app browser (recommended for better UX)
npm install react-native-inappbrowser-reborn

# For iOS, run:
cd ios && pod install
```

#### For Expo projects
```bash
# Expo has built-in support, but you can still use the above for better features
npx expo install @react-native-async-storage/async-storage
# or
npx expo install react-native-keychain
```

## Quick Start

### 1. Configure your app scheme

#### For Expo projects
Add your custom scheme to `app.json`:

```json
{
  "expo": {
    "name": "My Wallet App",
    "slug": "my-wallet-app",
    "scheme": "mywalletapp"
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
import { PhantomProvider, AddressType } from '@phantom/react-native-sdk';

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
          redirectUrl: "mywalletapp://phantom-auth-callback"
        }
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
import React from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { 
  useConnect, 
  useAccounts, 
  useSignMessage,
  useDisconnect 
} from '@phantom/react-native-sdk';

export function WalletScreen() {
  const { connect, isConnecting, error: connectError } = useConnect();
  const { addresses, isConnected, walletId } = useAccounts();
  const { signMessage, isSigning } = useSignMessage();
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    try {
      await connect({ provider: 'google' });
      Alert.alert('Success', 'Wallet connected!');
    } catch (error) {
      Alert.alert('Error', `Failed to connect: ${error.message}`);
    }
  };

  const handleSignMessage = async () => {
    try {
      const signature = await signMessage({
        message: 'Hello from my React Native app!',
        networkId: 'solana:mainnet'
      });
      Alert.alert('Signed!', `Signature: ${signature.slice(0, 10)}...`);
    } catch (error) {
      Alert.alert('Error', `Failed to sign: ${error.message}`);
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
        {connectError && (
          <Text style={{ color: 'red', marginTop: 10 }}>
            Error: {connectError.message}
          </Text>
        )}
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
      
      <Button 
        title="Disconnect"
        onPress={disconnect}
        style={{ marginTop: 10 }}
      />
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
  organizationId: string;           // Your Phantom organization ID
  scheme: string;                   // Custom URL scheme for your app
  embeddedWalletType: "user-wallet" | "app-wallet";
  addressTypes: AddressType[];
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  authOptions?: {
    authUrl?: string;               // Custom auth URL (optional)
    redirectUrl?: string;           // Custom redirect URL (optional)
  };
}
```

### Hooks

#### useConnect

Manages wallet connection functionality.

```typescript
const { 
  connect, 
  isConnecting, 
  error,
} = useConnect();

// Connect with specific provider
await connect({ provider: 'google' });
await connect({ provider: 'apple' });
await connect({ provider: 'jwt', jwtToken: 'your-jwt-token' });
```

#### useAccounts

Provides access to connected wallet information.

```typescript
const { 
  addresses,     // Array of wallet addresses
  isConnected,   // Connection status
  walletId       // Phantom wallet ID
} = useAccounts();
```

#### useSignMessage

Handles message signing operations.

```typescript
const { 
  signMessage, 
  isSigning, 
  error 
} = useSignMessage();

const signature = await signMessage({
  message: 'Message to sign',
  networkId: 'solana:mainnet' // or 'ethereum:1'
});
```

#### useSignAndSendTransaction

Handles transaction signing and sending.

```typescript
const { 
  signAndSendTransaction, 
  isSigning, 
  error 
} = useSignAndSendTransaction();

const result = await signAndSendTransaction({
  transaction: 'base64-encoded-transaction',
  networkId: NetworkId.SOLANA_MAINNET
});
```

#### useDisconnect

Manages wallet disconnection.

```typescript
const { 
  disconnect, 
  isDisconnecting 
} = useDisconnect();

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

The SDK automatically detects and uses the best available storage option:

**Option 1: react-native-keychain (Recommended)**
- **iOS**: Uses Keychain Services with hardware security
- **Android**: Uses Android Keystore with hardware-backed keys
- **Biometric Protection**: Supports biometric authentication for accessing stored data

**Option 2: AsyncStorage (Fallback)**
- Basic storage with simple encoding (not hardware-secured)
- Automatically used if react-native-keychain is not available
- Shows warning about reduced security

### Authentication Security

- **In-App Browser**: Uses react-native-inappbrowser-reborn when available for better UX
- **System Browser Fallback**: Falls back to system browser via deep linking
- **Origin Verification**: Automatic verification of redirect origins
- **Hardware Security**: Private keys stored in secure hardware when available

## Configuration Examples

### Basic Configuration

```tsx
import { PhantomProvider, AddressType } from '@phantom/react-native-sdk';

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
</PhantomProvider>
```

### Advanced Configuration

```tsx
import { PhantomProvider, AddressType } from '@phantom/react-native-sdk';

<PhantomProvider 
  config={{
    organizationId: "org_123456789",
    scheme: "mycompany-wallet",
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana, AddressType.ethereum],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    authOptions: {
      authUrl: "https://auth.yourcompany.com",
      redirectUrl: "mycompany-wallet://auth/success"
    }
  }}
>
  <App />
</PhantomProvider>
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

## Advanced Usage

### Custom Platform Adapters

For advanced use cases, you can access the platform adapters directly:

```typescript
import { 
  ReactNativeSecureStorage,
  ReactNativeAuthProvider, 
  ReactNativeURLParamsAccessor,
  ReactNativeLogger
} from '@phantom/react-native-sdk';

// Check storage backend being used
const storage = new ReactNativeSecureStorage();
const storageInfo = storage.getStorageInfo();
console.log('Storage type:', storageInfo.type); // 'keychain' | 'asyncstorage' | 'none'
console.log('Is secure:', storageInfo.isSecure); // boolean

// Check auth provider capabilities
const authProvider = new ReactNativeAuthProvider();
const isAvailable = await authProvider.isAvailable();
console.log('Auth available:', isAvailable);
```

### Platform Detection

The SDK automatically detects available libraries and chooses the best option:

```typescript
// Storage priority order:
// 1. react-native-keychain (most secure)
// 2. @react-native-async-storage/async-storage (basic)

// Browser priority order: 
// 1. react-native-inappbrowser-reborn (best UX)
// 2. React Native Linking (system browser fallback)
```

### Migration from Expo-only Version

If migrating from an Expo-only setup:

1. **Remove Expo dependencies** (if not using Expo):
   ```bash
   npm uninstall expo-secure-store expo-web-browser expo-auth-session
   ```

2. **Install React Native alternatives**:
   ```bash
   npm install react-native-keychain react-native-inappbrowser-reborn
   ```

3. **No code changes required** - the SDK automatically detects and uses the new libraries

## License

MIT License - see [LICENSE](LICENSE) file for details.