import { Platform } from 'react-native';
import type { SecurityConfig } from './types';

export class PlatformSecurity {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  public getSecureWebViewProps(): Record<string, any> {
    const baseProps = {
      javaScriptEnabled: true,
      domStorageEnabled: false,
      cacheEnabled: false,
      incognito: true,
      startInLoadingState: true,
      scalesPageToFit: false,
      allowsInlineMediaPlayback: false,
      mediaPlaybackRequiresUserAction: true,
      allowsProtectedMedia: false,
      bounces: false,
      scrollEnabled: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      allowsBackForwardNavigationGestures: false,
      allowsLinkPreview: false,
      dataDetectorTypes: 'none',
      overScrollMode: 'never',
      nestedScrollEnabled: false,
    };

    if (Platform.OS === 'ios') {
      return {
        ...baseProps,
        ...this.getIOSSecurityProps(),
      };
    } else if (Platform.OS === 'android') {
      return {
        ...baseProps,
        ...this.getAndroidSecurityProps(),
      };
    }

    return baseProps;
  }

  private getIOSSecurityProps(): Record<string, any> {
    return {
      // iOS-specific security settings
      allowsInlineMediaPlayback: false,
      mediaPlaybackRequiresUserAction: true,
      allowsAirPlayForMediaPlayback: false,
      allowsPictureInPictureMediaPlayback: false,
      fraudulentWebsiteWarningEnabled: true,
      suppressesIncrementalRendering: true,
      keyboardDisplayRequiresUserAction: true,
      hideKeyboardAccessoryView: true,
      allowsLinkPreview: false,
      // Disable various iOS WebView features for security
      decelerationRate: 'normal',
      contentInsetAdjustmentBehavior: 'never',
      automaticallyAdjustContentInsets: false,
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      scrollEventThrottle: 16,
    };
  }

  private getAndroidSecurityProps(): Record<string, any> {
    return {
      // Android-specific security settings
      mixedContentMode: 'never', // Block mixed content
      thirdPartyCookiesEnabled: false,
      hardwareAccelerationDisabled: false,
      allowFileAccess: false,
      allowFileAccessFromFileURLs: false,
      allowUniversalAccessFromFileURLs: false,
      allowsFullscreenVideo: false,
      androidLayerType: 'none',
      // Disable geolocation
      geolocationEnabled: false,
      // Disable file downloads
      downloadingEnabled: false,
    };
  }

  public getContentSecurityPolicy(): string {
    if (!this.config.strictCSP) {
      return '';
    }

    const allowedOrigins = this.config.allowedOrigins.join(' ');

    return [
      "default-src 'self'",
      `connect-src 'self' ${allowedOrigins}`,
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "media-src 'none'",
      "frame-src 'none'",
      "worker-src 'none'",
      "child-src 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'none'",
    ].join('; ');
  }

  public getSecureUserAgent(baseUserAgent?: string): string {
    const secureComponents = [
      'SecureWebView/1.0',
      `Platform/${Platform.OS}`,
      `Version/${Platform.Version}`,
    ];

    if (baseUserAgent) {
      // Remove potentially identifying information from base user agent
      const sanitized = baseUserAgent
        .replace(/\([^)]+\)/g, '') // Remove parenthetical content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return `${sanitized} ${secureComponents.join(' ')}`;
    }

    return secureComponents.join(' ');
  }

  public getInjectedJavaScript(): string {
    const csp = this.getContentSecurityPolicy();

    return `
      (function() {
        // Set Content Security Policy
        var meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = '${csp}';
        document.head.appendChild(meta);

        // Block dangerous APIs if configured
        ${this.config.blockDangerousAPIs ? this.getDangerousAPIBlockingScript() : ''}

        // Set up secure message handling
        window.addEventListener('message', function(event) {
          // Validate origin
          var allowedOrigins = ${JSON.stringify(this.config.allowedOrigins)};
          if (allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin)) {
            console.warn('SecureWebView: Message from unauthorized origin:', event.origin);
            return;
          }

          // Forward validated messages to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'FORWARDED_MESSAGE',
            data: event.data,
            origin: event.origin,
            timestamp: Date.now()
          }));
        });

        // Override console methods for logging control
        ${this.config.enableLogging ? this.getLoggingScript() : this.getLoggingDisableScript()}

        // Prevent certain navigation methods
        window.history.pushState = function() { console.warn('pushState blocked'); };
        window.history.replaceState = function() { console.warn('replaceState blocked'); };

        // Block file access attempts
        if (window.File) {
          Object.defineProperty(window, 'File', { value: null, writable: false });
        }
        if (window.FileReader) {
          Object.defineProperty(window, 'FileReader', { value: null, writable: false });
        }

        true; // Return true to indicate successful execution
      })();
    `;
  }

  private getDangerousAPIBlockingScript(): string {
    return `
      // Block dangerous APIs
      var dangerousAPIs = [
        'eval', 'setTimeout', 'setInterval', 'Function',
        'importScripts', 'open', 'close', 'print',
        'alert', 'confirm', 'prompt'
      ];

      dangerousAPIs.forEach(function(api) {
        if (window[api]) {
          Object.defineProperty(window, api, {
            value: function() {
              console.warn('SecureWebView: Blocked dangerous API call:', api);
              return null;
            },
            writable: false,
            configurable: false
          });
        }
      });

      // Block access to sensitive storage APIs
      var storageAPIs = ['localStorage', 'sessionStorage', 'indexedDB', 'webkitStorageInfo'];
      storageAPIs.forEach(function(api) {
        if (window[api]) {
          Object.defineProperty(window, api, { value: null, writable: false });
        }
      });

      // Block geolocation
      if (navigator.geolocation) {
        Object.defineProperty(navigator, 'geolocation', { value: null, writable: false });
      }

      // Block camera/microphone access
      if (navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', { value: null, writable: false });
      }
    `;
  }

  private getLoggingScript(): string {
    return `
      // Enhanced logging for debugging
      var originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console)
      };

      ['log', 'warn', 'error', 'info'].forEach(function(method) {
        console[method] = function() {
          originalConsole[method].apply(console, arguments);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CONSOLE_LOG',
            level: method,
            data: Array.from(arguments),
            timestamp: Date.now()
          }));
        };
      });
    `;
  }

  private getLoggingDisableScript(): string {
    return `
      // Disable console logging for production
      ['log', 'warn', 'error', 'info', 'debug'].forEach(function(method) {
        console[method] = function() {};
      });
    `;
  }

  public getSecureNavigationRules(): {
    allowedProtocols: string[];
    blockedDomains: string[];
    requireHTTPS: boolean;
  } {
    return {
      allowedProtocols: ['https:', 'http:'], // Only allow HTTP/HTTPS
      blockedDomains: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16'
      ],
      requireHTTPS: true
    };
  }

  public validateNavigationSecurity(url: string): {
    allowed: boolean;
    reason?: string;
  } {
    try {
      const urlObj = new URL(url);
      const rules = this.getSecureNavigationRules();

      // Check protocol
      if (!rules.allowedProtocols.includes(urlObj.protocol)) {
        return {
          allowed: false,
          reason: `Protocol ${urlObj.protocol} not allowed`
        };
      }

      // Require HTTPS in production
      if (rules.requireHTTPS && urlObj.protocol !== 'https:') {
        return {
          allowed: false,
          reason: 'HTTPS required for secure navigation'
        };
      }

      // Check blocked domains
      const hostname = urlObj.hostname.toLowerCase();
      for (const blockedDomain of rules.blockedDomains) {
        if (hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`)) {
          return {
            allowed: false,
            reason: `Domain ${hostname} is blocked`
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Invalid URL format'
      };
    }
  }
}