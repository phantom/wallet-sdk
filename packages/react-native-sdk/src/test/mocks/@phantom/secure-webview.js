// Mock for @phantom/secure-webview
const React = require('react');

const WebViewState = {
  CLOSED: 'closed',
  VISIBLE_AUTH: 'visible_auth',
  INVISIBLE_SESSION: 'invisible_session',
  TRANSITIONING: 'transitioning'
};

class SecureWebView extends React.Component {
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }

  navigateToUrl(url) {
    // Mock implementation
    setTimeout(() => {
      if (this.props.callbacks?.onNavigationComplete) {
        this.props.callbacks.onNavigationComplete({
          success: true,
          url: `${this.props.config.navigation.redirectUrl}?wallet_id=mock_wallet_id&provider=google`
        });
      }
    }, 100);
  }

  hideWebView() {
    // Mock implementation
  }

  showWebView() {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }

  render() {
    return React.createElement('div', {
      'data-testid': this.props.testID || 'secure-webview'
    });
  }
}

const SecurityValidator = class {
  constructor(config) {
    this.config = config;
  }

  validateOrigin() {
    return true;
  }

  validateMessage() {
    return { valid: true };
  }
};

const StateManager = class {
  constructor(callback) {
    this.callback = callback;
    this.state = WebViewState.CLOSED;
  }

  getCurrentState() {
    return this.state;
  }

  transitionTo(newState, reason) {
    const oldState = this.state;
    this.state = newState;
    this.callback(oldState, newState, reason);
    return true;
  }

  cleanup() {
    // Mock cleanup
  }
};

const PlatformSecurity = class {
  constructor(config) {
    this.config = config;
  }

  getSecureWebViewProps() {
    return {};
  }
};

module.exports = {
  WebViewState,
  SecureWebView,
  SecurityValidator,
  StateManager,
  PlatformSecurity
};