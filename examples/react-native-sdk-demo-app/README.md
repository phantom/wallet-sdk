# Phantom React Native SDK Demo App

This demo application showcases the usage of the `@phantom/react-native-sdk` with embedded provider support. Built with Expo, it uses local development builds with `expo run:ios/android` to handle native dependencies.

## Features

- **Embedded Provider Support**: Server-based wallet management with secure authentication
- **Multiple Authentication Methods**: Support for Google, Apple, and JWT authentication
- **Cross-Platform**: Works on both iOS and Android using Expo with local development builds
- **Secure Storage**: Hardware-backed secure storage
- **OAuth Authentication**: Secure in-app browser authentication flows
- Display connected wallet addresses (Solana and other supported chains)
- Sign messages with base64url encoding
- Sign and send Solana transactions
- Disconnect from wallet
- **Deep Link Handling**: Automatic handling of authentication callbacks

## Prerequisites

- Node.js 16+ and Yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS development: Xcode and iOS Simulator
- For Android development: Android Studio and Android Emulator

## Getting Started

1. From the monorepo root, install dependencies:

   ```bash
   yarn install
   ```

2. Build the SDK packages:

   ```bash
   yarn build
   ```

3. **Configure environment variables**:
   
   Copy `.env.example` to `.env` and fill in your configuration:
   
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your actual values:
   
   ```bash
   # Required - Your Phantom organization ID
   EXPO_PUBLIC_ORGANIZATION_ID=your-organization-id-here
   
   # Required - Your app's custom URL scheme
   EXPO_PUBLIC_APP_SCHEME=your-app-scheme
   
   # Required - Redirect URL after authentication
   EXPO_PUBLIC_REDIRECT_URL=your-app-scheme://phantom-auth-callback
   
   # Optional - Embedded wallet type (default: user-wallet)
   EXPO_PUBLIC_EMBEDDED_WALLET_TYPE=user-wallet
   
   # Optional - API base URL (default: production)
   EXPO_PUBLIC_WALLET_API=https://api.phantom.app/v1/wallets
   
   # Optional - Enable debug logging in development
   EXPO_PUBLIC_DEBUG=false
   ```

4. **Build and run the development build**:

   ```bash
   # For iOS (requires Xcode and iOS Simulator)
   npx expo run:ios
   
   # For Android (requires Android Studio and emulator/device)
   npx expo run:android
   ```

   This will automatically build the native code, install dependencies, and run the app on your simulator/device.

5. The app will open in your simulator/emulator or connected device

## Usage

1. **Authentication**: Choose between Google, Apple, or JWT authentication methods
2. **Connect**: Tap the "Connect" button to initiate the authentication flow
3. **Authentication Flow**: The app will open a web browser for secure authentication
4. **Callback Handling**: After successful authentication, you'll be redirected back to the app
5. **Wallet Operations**: Once connected, you can:
   - View your wallet addresses
   - Sign messages
   - Sign transactions (demo implementation)
   - Disconnect from the wallet

## Architecture

This demo uses:

- `@phantom/react-native-sdk` - The React Native SDK with hooks for wallet interactions
- **Embedded Provider**: Server-based wallet management with multiple authentication options
- **React Native Navigation**: Stack-based navigation system
- **Native Dependencies**: Uses react-native-keychain and react-native-inappbrowser-reborn for secure operations
- Base64url encoding - All messages and transactions are encoded in base64url format

## Configuration

The app is configured in the main App component with your organization details:

```typescript
const config = {
  organizationId: "your-organization-id", // Replace with your actual organization ID
  scheme: "phantom-rn-demo",
  embeddedWalletType: "app-wallet" as const,
  addressTypes: [AddressType.solana],
  authOptions: {
    redirectUrl: "phantom-rn-demo://phantom-auth-callback",
  },
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  debug: true,
};
```

## App Structure

The demo app follows Expo Router's file-based routing structure with TypeScript support.

### Key Features

- Authentication with multiple providers (Google, Apple, JWT)
- Wallet connection and management
- Message signing functionality
- Transaction signing demonstrations
- Secure session handling with deep link callbacks

## Deep Link Configuration

The app uses deep links for authentication callbacks. Deep link configuration is handled automatically by the SDK.

## Network Support

- **Embedded Provider**: Supports multiple networks including Solana, Ethereum, and other chains
- **Primary Focus**: Solana network operations for message signing and transactions

## Development

The demo app uses:

- Expo ~53.0.20
- React Native 0.79.5
- TypeScript
- Expo Router for navigation
- @phantom/react-native-sdk for wallet integration

## Platform-Specific Features

### iOS

- Hardware Security Module (HSM) backed secure storage
- Native authentication flows with system browser

### Android

- Android Keystore backed secure storage
- In-app browser for secure authentication

## Troubleshooting

### Connection Issues

1. **Deep link not working**:
   - Ensure you're using a development build (built with `expo run:ios/android`, not Expo Go)
   - Check that the redirect URL is properly formatted
   - Clear app data and reinstall if necessary

2. **Authentication failures**:
   - Verify your organization ID is correct
   - Check browser popup blockers aren't interfering
   - Ensure your device has internet connectivity

3. **Secure storage errors**:
   - On iOS: Ensure device passcode/biometric is enabled
   - On Android: Check device security settings
   - Clear app data if encountering storage conflicts

### Build Issues

1. **SDK build errors**: Make sure all packages are built with `yarn build`
2. **Expo development build issues**: Clean and rebuild with `npx expo run:ios --clear` or `npx expo run:android --clear`
3. **Native dependency issues**: Native modules like react-native-keychain are automatically linked when using `expo run:ios/android`

### Runtime Issues

1. **Provider not found**: Ensure the embedded provider core is properly initialized
2. **Network errors**: Check API endpoints and network connectivity
3. **Transaction failures**: Verify wallet has sufficient funds for transaction fees

## Learn More

- [Phantom React Native SDK Documentation](../../packages/react-native-sdk/README.md)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Phantom Wallet](https://phantom.app)
- [Solana Documentation](https://docs.solana.com)
