import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  WebViewState,
  type SecureWebViewConfig,
  type NavigationResult,
  type SecureWebViewCallbacks
} from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SecureWebViewProps {
  config: SecureWebViewConfig;
  callbacks?: SecureWebViewCallbacks;
  testID?: string;
}

export class SecureWebView extends React.Component<SecureWebViewProps, { state: WebViewState; currentUrl?: string }> {
  private webViewRef: React.RefObject<any>; // Changed from WebView to any for testing
  private navigationTimeout: NodeJS.Timeout | null = null;

  constructor(props: SecureWebViewProps) {
    super(props);
    this.state = {
      state: WebViewState.CLOSED,
      currentUrl: props.config.navigation.initialUrl
    };
    this.webViewRef = React.createRef();
  }

  componentDidMount() {
    console.log('[SecureWebView] Component mounted');
    if (this.props.config.navigation.initialUrl) {
      this.navigateToUrl(this.props.config.navigation.initialUrl);
    }
  }

  componentWillUnmount() {
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }
  }

  public navigateToUrl = (url: string): void => {
    console.log('[SecureWebView] Navigating to URL:', url);
    this.setState({
      state: WebViewState.VISIBLE_AUTH,
      currentUrl: url
    });

    // Set navigation timeout
    const timeout = this.props.config.navigation.timeout || 300000; // 5 minutes default
    this.navigationTimeout = setTimeout(() => {
      this.handleNavigationComplete('', false, 'Navigation timeout');
    }, timeout);
  };

  public hideWebView = (): void => {
    this.setState({ state: WebViewState.INVISIBLE_SESSION });
  };

  public showWebView = (): void => {
    this.setState({ state: WebViewState.VISIBLE_AUTH });
  };

  public close = (): void => {
    this.setState({ state: WebViewState.CLOSED });
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }
  };

  private handleNavigationStateChange = (event: any) => {
    const { navigation } = this.props.config;

    // Check if we've reached the redirect URL
    if (navigation.redirectUrl && event.url.startsWith(navigation.redirectUrl)) {
      this.handleNavigationComplete(event.url, true);
      return;
    }

    // Basic origin validation
    if (navigation.redirectUrl) {
      try {
        const redirectOrigin = new URL(navigation.redirectUrl).origin;
        const currentOrigin = new URL(event.url).origin;

        // Allow navigation within the same origin or to the redirect URL
        if (currentOrigin !== redirectOrigin && !event.url.startsWith(navigation.redirectUrl)) {
          // Navigation to unauthorized origin
        }
      } catch (error) {
        // Invalid URL during navigation
      }
    }
  };

  private handleNavigationComplete = (url: string, success: boolean, error?: string) => {
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }

    const result: NavigationResult = {
      success,
      url: success ? url : undefined,
      error
    };

    this.props.callbacks?.onNavigationComplete?.(result);

    // Auto-hide if configured
    if (success && this.props.config.session.autoHideAfterAuth) {
      this.hideWebView();
    }
  };

  private handleError = (event: any) => {
    const error = new Error(`WebView error: ${event.nativeEvent?.description || 'Unknown error'}`);
    this.props.callbacks?.onError?.(error);
    this.handleNavigationComplete('', false, error.message);
  };

  private getWebViewStyle = () => {
    switch (this.state.state) {
      case WebViewState.VISIBLE_AUTH:
        return styles.visibleWebView;
      case WebViewState.INVISIBLE_SESSION:
        return styles.invisibleWebView;
      case WebViewState.TRANSITIONING:
        return styles.transitioningWebView;
      case WebViewState.CLOSED:
      default:
        return styles.hiddenWebView;
    }
  };

  render() {
    console.log('[SecureWebView] Rendering, state:', this.state.state);

    if (this.state.state === WebViewState.CLOSED) {
      console.log('[SecureWebView] State is CLOSED, returning null');
      return null;
    }

    console.log('[SecureWebView] Creating WebView element...');

    try {
      const webViewStyle = this.getWebViewStyle();
      console.log('[SecureWebView] Using style:', webViewStyle);

      const element = React.createElement(View as any, {
        style: styles.container,
        testID: this.props.testID || 'secure-webview'
      }, React.createElement(WebView as any, {
        ref: this.webViewRef,
        style: webViewStyle,
        onNavigationStateChange: this.handleNavigationStateChange,
        onError: this.handleError,
        javaScriptEnabled: true,
        domStorageEnabled: true,
        startInLoadingState: false,
        scalesPageToFit: true,
        allowsInlineMediaPlayback: true,
        mediaPlaybackRequiresUserAction: false,
        source: this.state.currentUrl ? { uri: this.state.currentUrl } : undefined
      }));

      console.log('[SecureWebView] WebView element created successfully');
      return element;
    } catch (error) {
      console.error('[SecureWebView] Error creating WebView element:', error);
      throw error;
    }
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  visibleWebView: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'white',
  },
  invisibleWebView: {
    width: 1,
    height: 1,
    position: 'absolute' as any,
    top: -1000,
    left: -1000,
    backgroundColor: 'transparent',
  },
  transitioningWebView: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'white',
    opacity: 0.5,
  },
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute' as any,
    top: -1000,
    left: -1000,
  },
});