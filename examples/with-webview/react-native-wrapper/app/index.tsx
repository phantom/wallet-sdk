import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert, Text, StatusBar } from 'react-native';
import { PhantomProvider, useConnect, useSolana } from '@phantom/react-native-sdk';
import { AddressType } from '@phantom/react-native-sdk';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

// Import the polyfill at the top of the app
import 'react-native-get-random-values';

// WebView Bridge Component
function PhantomWebView() {
  const webViewRef = useRef<WebView>(null);
  const { connect, isConnecting } = useConnect();
  const { solana } = useSolana();
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'authenticated'>('idle');

  // Handle messages from the PWA
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[React Native] Received message:', message);

      switch (message.type) {
        case 'PHANTOM_AUTH_REQUEST':
          await handleAuthRequest(message);
          break;

        case 'PHANTOM_SIGN_MESSAGE':
          await handleSignMessageRequest(message);
          break;

        case 'PHANTOM_SIGN_AND_SEND_TRANSACTION':
          await handleSignAndSendTransactionRequest(message);
          break;

        default:
          console.log('[React Native] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[React Native] Failed to parse WebView message:', error);
    }
  };

  // Handle authentication request from PWA
  const handleAuthRequest = async (request: any) => {
    try {
      console.log('[React Native] Starting authentication:', request.data.provider);
      setAuthStatus('authenticating');

      // Use the React Native SDK to authenticate
      const result = await connect({
        provider: request.data.provider || 'google'
      });

      console.log('[React Native] Auth successful:', result);

      // Send success response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_AUTH_SUCCESS',
        data: {
          walletId: result.walletId,
          addresses: result.addresses
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));
      setAuthStatus('authenticated');

      Alert.alert(
        'Authentication Successful',
        `Connected wallet with ${result.addresses.length} addresses`
      );

    } catch (error) {
      console.error('[React Native] Auth failed:', error);

      // Send error response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_AUTH_ERROR',
        data: {
          error: (error as Error).message
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));
      setAuthStatus('idle');

      Alert.alert(
        'Authentication Failed',
        (error as Error).message
      );
    }
  };

  // Handle sign message request from PWA
  const handleSignMessageRequest = async (request: any) => {
    try {
      console.log('[React Native] Signing message:', request.data.message);

      if (!solana.isAvailable) {
        throw new Error('Solana SDK not available');
      }

      // Use React Native SDK to sign message
      const result = await solana.solana.signMessage(request.data.message);

      console.log('[React Native] Sign successful:', result);

      // Send success response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_SIGN_SUCCESS',
        data: {
          signature: result.signature,
          publicKey: result.publicKey,
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));

      Alert.alert(
        'Message Signed',
        `Successfully signed message`
      );

    } catch (error) {
      console.error('[React Native] Sign failed:', error);

      // Send error response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_SIGN_ERROR',
        data: {
          error: (error as Error).message
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));

      Alert.alert(
        'Sign Failed',
        (error as Error).message
      );
    }
  };

  // Handle sign and send transaction request from PWA
  const handleSignAndSendTransactionRequest = async (request: any) => {
    try {
      console.log('[React Native] Signing and sending transaction:', request.data);

      if (!solana.isAvailable) {
        throw new Error('Solana SDK not available');
      }

      // Use React Native SDK to sign and send transaction
      const result = await solana.solana.signAndSendTransaction(request.data.transaction);

      console.log('[React Native] Transaction successful:', result);

      // Send success response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_TRANSACTION_SUCCESS',
        data: {
          signature: result.signature,
          publicKey: result.publicKey,
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));

      Alert.alert(
        'Transaction Sent',
        `Transaction signature: ${result.signature.slice(0, 8)}...`
      );

    } catch (error) {
      console.error('[React Native] Transaction failed:', error);

      // Send error response back to PWA
      const response = {
        id: request.id,
        type: 'PHANTOM_TRANSACTION_ERROR',
        data: {
          error: (error as Error).message
        }
      };

      webViewRef.current?.postMessage(JSON.stringify(response));

      Alert.alert(
        'Transaction Failed',
        (error as Error).message
      );
    }
  };

  // Get the PWA URL - in development, use localhost
  // In production, this would be your deployed PWA URL
  const PWA_URL = __DEV__
    ? 'http://localhost:3000'  // Development - make sure PWA is running
    : 'https://your-pwa-domain.com';  // Production

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Bridge Status: {authStatus === 'idle' ? 'Ready' : authStatus === 'authenticating' ? 'Authenticating...' : 'Connected'}
        </Text>
        {isConnecting && (
          <Text style={styles.statusSubtext}>Opening system browser...</Text>
        )}
      </View>

      {/* WebView with PWA */}
      <WebView
        ref={webViewRef}
        source={{ uri: PWA_URL }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[React Native] WebView error:', nativeEvent);
          Alert.alert('WebView Error', nativeEvent.description);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[React Native] HTTP error:', nativeEvent);
          Alert.alert('HTTP Error', `Status: ${nativeEvent.statusCode}`);
        }}
        onLoadStart={() => {
          console.log('[React Native] WebView loading started');
        }}
        onLoadEnd={() => {
          console.log('[React Native] WebView loading finished');
        }}
        // Inject JavaScript to help with debugging
        injectedJavaScript={`
          console.log('[WebView] Phantom bridge initialized');
          window.phantomBridgeReady = true;
          true; // Required for injected JavaScript
        `}
        style={styles.webview}
      />
    </View>
  );
}

// Main App Component
export default function App() {
  return (
    <PhantomProvider
      config={{
        appId: 'webview-example-app',
        scheme: 'phantom-webview-example',
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl: 'phantom-webview-example://phantom-auth-callback',
        },
      }}
    >
      <PhantomWebView />
    </PhantomProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
});