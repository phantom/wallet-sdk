# WebView + PWA Example

This example demonstrates how to create a PWA using `@phantom/browser-sdk` that works seamlessly in both regular browsers AND React Native WebViews, solving the Google OAuth restriction in WebViews.

## The Problem

- **PWA with browser-sdk works great in browsers**
- **Same PWA fails in React Native WebView** due to Google's "disallowed_useragent" error
- **Need a solution that works in both environments**

## The Solution

Create a **dual-mode PWA** that:
1. **Detects the environment** (browser vs WebView)
2. **Uses browser-sdk** for browser environments (normal OAuth)
3. **Uses postMessage bridge** for WebView environments (React Native handles auth)

## Architecture

```
┌─────────────────────────────────┐
│           PWA (Next.js)         │
├─────────────────────────────────┤
│  Environment Detection Logic    │
├─────────────┬───────────────────┤
│   Browser   │     WebView       │
│   Mode      │     Mode          │
├─────────────┼───────────────────┤
│ browser-sdk │ postMessage       │
│ OAuth       │ bridge            │
│ in-window   │ to React Native   │
└─────────────┴───────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│      React Native Wrapper      │
├─────────────────────────────────┤
│    PhantomProvider (RN SDK)     │
├─────────────────────────────────┤
│         WebView Bridge          │
├─────────────────────────────────┤
│     System Browser OAuth        │
└─────────────────────────────────┘
```

## Project Structure

```
with-webview/
├── pwa/                    # Next.js PWA with dual-mode support
│   ├── lib/
│   │   ├── phantom.ts      # Dual-mode Phantom integration
│   │   └── webview-bridge.ts  # WebView bridge logic
│   ├── pages/
│   │   └── index.tsx       # Main demo page
│   └── package.json
├── react-native-wrapper/   # React Native app with WebView
│   ├── app/
│   │   └── index.tsx       # Main app with WebView
│   └── package.json
└── README.md
```

## Setup & Testing

### 1. Start the PWA
```bash
cd pwa
npm install
npm run dev
# PWA runs at http://localhost:3000
```

### 2. Test in Browser
Visit `http://localhost:3000` in your browser:
- ✅ **Normal browser auth** - Uses browser-sdk with Google OAuth

### 3. Test in React Native WebView
```bash
cd react-native-wrapper
npm install
npx expo start
```
- ✅ **Bridge auth** - postMessage to React Native → system browser OAuth

## React Native Code Examples

### Basic Setup

The React Native wrapper uses `@phantom/react-native-sdk` to handle authentication and bridges it to the PWA via postMessage:

```tsx
import React, { useRef } from 'react';
import { PhantomProvider, useConnect, AddressType } from '@phantom/react-native-sdk';
import { WebView } from 'react-native-webview';

function App() {
  return (
    <PhantomProvider
      config={{
        appId: 'your-app-id',
        scheme: 'your-app-scheme',
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl: 'your-app-scheme://phantom-auth-callback',
        },
      }}
    >
      <PWAWebView />
    </PhantomProvider>
  );
}
```

### WebView Bridge Component

```tsx
function PWAWebView() {
  const webViewRef = useRef<WebView>(null);
  const { connect } = useConnect();

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'PHANTOM_AUTH_REQUEST') {
      try {
        // Use React Native SDK for authentication
        const result = await connect({
          provider: message.data.provider || 'google'
        });

        // Send success response back to PWA
        webViewRef.current?.postMessage(JSON.stringify({
          id: message.id,
          type: 'PHANTOM_AUTH_SUCCESS',
          data: {
            walletId: result.walletId,
            addresses: result.addresses
          }
        }));
      } catch (error) {
        // Send error response back to PWA
        webViewRef.current?.postMessage(JSON.stringify({
          id: message.id,
          type: 'PHANTOM_AUTH_ERROR',
          data: { error: error.message }
        }));
      }
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://your-pwa.com' }}
      onMessage={handleWebViewMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
}
```

### Advanced Bridge with Signing

For more advanced use cases, you can also bridge signing operations:

```tsx
function AdvancedPWAWebView() {
  const { connect, solana } = useSolana();

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    switch (message.type) {
      case 'PHANTOM_AUTH_REQUEST':
        // Handle authentication (same as above)
        break;

      case 'PHANTOM_SIGN_MESSAGE':
        try {
          const result = await solana.signMessage(message.data.message);
          webViewRef.current?.postMessage(JSON.stringify({
            id: message.id,
            type: 'PHANTOM_SIGN_SUCCESS',
            data: result
          }));
        } catch (error) {
          webViewRef.current?.postMessage(JSON.stringify({
            id: message.id,
            type: 'PHANTOM_SIGN_ERROR',
            data: { error: error.message }
          }));
        }
        break;

      case 'PHANTOM_SIGN_TRANSACTION':
        try {
          const result = await solana.signAndSendTransaction(message.data.transaction);
          webViewRef.current?.postMessage(JSON.stringify({
            id: message.id,
            type: 'PHANTOM_TRANSACTION_SUCCESS',
            data: result
          }));
        } catch (error) {
          webViewRef.current?.postMessage(JSON.stringify({
            id: message.id,
            type: 'PHANTOM_TRANSACTION_ERROR',
            data: { error: error.message }
          }));
        }
        break;
    }
  };

  // ... rest of component
}
```

### Error Handling & Status

```tsx
function PWAWebViewWithStatus() {
  const [bridgeStatus, setBridgeStatus] = useState<'ready' | 'authenticating' | 'connected'>('ready');

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'PHANTOM_AUTH_REQUEST') {
      setBridgeStatus('authenticating');

      try {
        const result = await connect({ provider: message.data.provider });
        setBridgeStatus('connected');

        // Send success response...
      } catch (error) {
        setBridgeStatus('ready');
        Alert.alert('Authentication Failed', error.message);

        // Send error response...
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Status Bar */}
      <View style={{ padding: 16, backgroundColor: '#f8fafc' }}>
        <Text>Bridge Status: {bridgeStatus}</Text>
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: 'https://your-pwa.com' }}
        onMessage={handleWebViewMessage}
        onError={(error) => {
          Alert.alert('WebView Error', error.nativeEvent.description);
        }}
      />
    </View>
  );
}
```

### Development vs Production URLs

```tsx
function PWAWebView() {
  // Use localhost for development, production URL for release
  const PWA_URL = __DEV__
    ? 'http://localhost:3000'  // Make sure your PWA is running locally
    : 'https://your-production-pwa.com';

  return (
    <WebView
      source={{ uri: PWA_URL }}
      // ... other props
    />
  );
}
```

## How It Works

The PWA automatically detects its environment and chooses the appropriate auth flow:

### Browser Mode Flow
1. User visits PWA in browser
2. PWA detects browser environment
3. Uses `@phantom/browser-sdk` directly
4. OAuth opens in same window/tab
5. User authenticates and returns to PWA

### WebView Mode Flow
1. React Native app loads PWA in WebView
2. PWA detects WebView environment (`window.ReactNativeWebView`)
3. User clicks "Connect Wallet" in PWA
4. PWA sends postMessage to React Native: `PHANTOM_AUTH_REQUEST`
5. React Native receives message, calls `connect()` from `@phantom/react-native-sdk`
6. System browser opens for Google OAuth (compliant!)
7. User authenticates, browser redirects back to React Native
8. React Native sends postMessage to PWA: `PHANTOM_AUTH_SUCCESS`
9. PWA receives auth result and continues normally