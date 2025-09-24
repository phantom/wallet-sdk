# @phantom/secure-webview

A secure, invisible WebView component for React Native 

## Features

- **Secure Navigation**: Navigate to URLs with security validation
- **State Management**: Visible for authentication, invisible for session persistence
- **Security Validation**: Origin validation, message sanitization, and security violation detection
- **Flexible Callbacks**: Navigate and receive callbacks when navigation is complete

## Usage

```typescript
import { SecureWebView } from '@phantom/secure-webview';

const config = {
  navigation: {
    redirectUrl: 'https://your-app.com/callback',
    timeout: 300000 // 5 minutes
  },
  session: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    autoHideAfterAuth: true
  },
  security: {
    allowedOrigins: ['https://auth.phantom.app'],
    enableEncryption: false,
    strictCSP: true,
    blockDangerousAPIs: true,
    enableLogging: false,
    maxMessageSize: 1024 * 1024, // 1MB
    messageRateLimit: 60 // messages per minute
  }
};

const callbacks = {
  onStateChange: (oldState, newState) => {
    console.log(`State changed from ${oldState} to ${newState}`);
  },
  onNavigationComplete: (result) => {
    if (result.success) {
      console.log('Navigation completed:', result.url);
    } else {
      console.error('Navigation failed:', result.error);
    }
  },
  onError: (error) => {
    console.error('WebView error:', error);
  }
};

// Usage in component
<SecureWebView
  config={config}
  callbacks={callbacks}
  testID="secure-webview"
/>
```

## API

### SecureWebView Methods

- `navigateToUrl(url: string)`: Navigate to a specific URL
- `hideWebView()`: Hide the WebView (make it invisible)
- `showWebView()`: Show the WebView (make it visible)
- `close()`: Close the WebView completely

### WebView States

- `CLOSED`: WebView is closed and not rendered
- `VISIBLE_AUTH`: WebView is visible for authentication
- `INVISIBLE_SESSION`: WebView is invisible but maintains session
- `TRANSITIONING`: WebView is transitioning between states

### Configuration Options

#### NavigationConfig
- `initialUrl?`: Initial URL to navigate to
- `redirectUrl?`: URL pattern that indicates navigation completion
- `timeout?`: Navigation timeout in milliseconds

#### SessionConfig
- `sessionTimeout`: Session timeout in milliseconds
- `keepAliveInterval?`: Keep-alive ping interval
- `autoHideAfterAuth`: Auto-hide after successful authentication

#### SecurityConfig
- `allowedOrigins`: Array of allowed origins for navigation
- `enableEncryption`: Enable message encryption
- `strictCSP`: Enable strict Content Security Policy
- `blockDangerousAPIs`: Block dangerous JavaScript APIs
- `enableLogging`: Enable security logging
- `maxMessageSize`: Maximum message size in bytes
- `messageRateLimit`: Maximum messages per minute

## Security Features

- Origin validation for all navigation attempts
- Message sanitization to prevent XSS attacks
- Rate limiting for incoming messages
- CSP (Content Security Policy) enforcement
- Dangerous API blocking
- Secure message passing with integrity verification

## License

MIT