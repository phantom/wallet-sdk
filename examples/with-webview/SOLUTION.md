# Phantom WebView OAuth Solution

## Problem Summary

Your Next.js PWA works perfectly in browsers but fails in React Native WebViews due to Google's OAuth restrictions:

```
Error 403: disallowed_useragent
Access blocked: [App]'s request does not comply with Google's "Use secure browsers" policy
```

## Complete Solution

We've created a **dual-mode PWA** that automatically detects its environment and uses the appropriate authentication method:

- **🌐 Browser Mode**: Uses `@phantom/browser-sdk` with standard OAuth
- **📱 WebView Mode**: Uses postMessage bridge to React Native SDK (system browser OAuth)

## Implementation Overview

### 1. PWA Side (Your Next.js App)

**Key Files:**
- `lib/webview-bridge.ts` - postMessage communication with React Native
- `lib/phantom.ts` - Dual-mode SDK wrapper
- `pages/index.tsx` - Main demo page with environment detection

**Environment Detection:**
```typescript
// Automatically detects if running in WebView
const isInWebView = () => window.ReactNativeWebView !== undefined;
```

**Dual-Mode Authentication:**
```typescript
const phantom = createDualModePhantom({
  appId: 'your-app-id',
  addressTypes: [AddressType.solana]
});

// Works in both browser AND WebView!
await phantom.connect({ provider: 'google' });
```

### 2. React Native Side (Your App Wrapper)

**Key Features:**
- Uses `@phantom/react-native-sdk` for authentication
- WebView loads your PWA
- Handles postMessage bridge communication
- Opens system browser for OAuth (Google compliant!)

**Basic Setup:**
```tsx
<PhantomProvider
  config={{
    appId: 'your-app-id',
    scheme: 'your-app-scheme',
    addressTypes: [AddressType.solana],
  }}
>
  <WebView
    source={{ uri: 'https://your-pwa.com' }}
    onMessage={handleBridgeMessage}
  />
</PhantomProvider>
```

## Benefits

✅ **Same PWA codebase** - works in browsers AND WebView
✅ **Google OAuth compliant** - uses system browser in WebView mode
✅ **Automatic detection** - no manual configuration needed
✅ **Seamless UX** - users don't know the difference
✅ **Full wallet functionality** - same features in both modes

## Files to Copy

From the example `/examples/with-webview/`:

### PWA Files (integrate into your Next.js app):
- `pwa/lib/webview-bridge.ts` - Bridge communication logic
- `pwa/lib/phantom.ts` - Dual-mode Phantom wrapper

### React Native Files (your mobile app wrapper):
- `react-native-wrapper/app/index.tsx` - Main WebView with bridge

## Integration Steps

### Step 1: Update Your PWA

Replace your Phantom SDK initialization:

```typescript
// BEFORE: Direct browser-sdk
import { BrowserSDK } from '@phantom/browser-sdk';
const sdk = new BrowserSDK(config);

// AFTER: Dual-mode wrapper
import { createDualModePhantom } from './lib/phantom';
const phantom = createDualModePhantom(config);
```

### Step 2: Create React Native Wrapper

```tsx
import { PhantomProvider, useConnect } from '@phantom/react-native-sdk';
import { WebView } from 'react-native-webview';

function App() {
  const { connect } = useConnect();

  const handleWebViewMessage = async (event) => {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'PHANTOM_AUTH_REQUEST') {
      const result = await connect({ provider: message.data.provider });

      webViewRef.current?.postMessage(JSON.stringify({
        id: message.id,
        type: 'PHANTOM_AUTH_SUCCESS',
        data: { walletId: result.walletId, addresses: result.addresses }
      }));
    }
  };

  return (
    <PhantomProvider config={{ appId: 'your-app-id', scheme: 'your-scheme' }}>
      <WebView
        source={{ uri: 'https://your-pwa.com' }}
        onMessage={handleWebViewMessage}
      />
    </PhantomProvider>
  );
}
```

### Step 3: Test Both Modes

1. **Browser Test**: Visit your PWA directly → normal OAuth
2. **WebView Test**: Open React Native app → bridge OAuth

## Message Flow

### Authentication Request (PWA → React Native):
```json
{
  "id": "1",
  "type": "PHANTOM_AUTH_REQUEST",
  "data": { "provider": "google" }
}
```

### Authentication Response (React Native → PWA):
```json
{
  "id": "1",
  "type": "PHANTOM_AUTH_SUCCESS",
  "data": {
    "walletId": "wallet-123",
    "addresses": [{ "addressType": "solana", "address": "..." }]
  }
}
```

## Advanced Features

The bridge can be extended to handle more operations:

```typescript
// PWA can request signing operations
await phantom.signMessage('Hello World!');

// React Native handles via bridge
case 'PHANTOM_SIGN_MESSAGE':
  const result = await solana.signMessage(message.data.message);
  // Send result back to PWA
```

## Testing

1. **Start your PWA**: `npm run dev` (localhost:3000)
2. **Test in browser**: Normal OAuth flow works
3. **Start React Native**: Load PWA in WebView
4. **Test bridge**: OAuth opens in system browser, compliant with Google

## Production Considerations

- **HTTPS**: Use HTTPS for production PWA
- **Deep Links**: Configure app store deep links
- **Error Handling**: Handle network/auth failures gracefully
- **Loading States**: Show loading during bridge communication

## Support

This solution uses existing Phantom SDKs:
- `@phantom/browser-sdk` for browser mode
- `@phantom/react-native-sdk` for WebView mode

No new packages needed - just bridge logic!