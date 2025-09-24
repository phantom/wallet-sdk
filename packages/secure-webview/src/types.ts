export enum WebViewState {
  CLOSED = 'closed',
  VISIBLE_AUTH = 'visible_auth',        // Visible during OAuth login
  INVISIBLE_SESSION = 'invisible_session', // Invisible after successful auth
  TRANSITIONING = 'transitioning'       // During state changes
}

export interface NavigationConfig {
  initialUrl?: string;
  redirectUrl?: string;
  timeout?: number; // in milliseconds, default 5 minutes
}

export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  keepAliveInterval?: number; // in milliseconds
  autoHideAfterAuth: boolean;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  enableEncryption: boolean;
  strictCSP: boolean;
  blockDangerousAPIs: boolean;
  enableLogging: boolean;
  maxMessageSize: number; // in bytes
  messageRateLimit: number; // messages per minute
}

export interface SecureWebViewConfig {
  navigation: NavigationConfig;
  session: SessionConfig;
  security: SecurityConfig;
  userAgent?: string;
}

export interface NavigationResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  organizationId?: string;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface SecureMessage {
  type: string;
  data: any;
  timestamp: number;
  origin: string;
  nonce?: string;
  integrity?: string;
  encrypted?: boolean;
}

export interface SecurityViolation {
  type: string;
  details: Record<string, any>;
  timestamp: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  url?: string;
  userAgent?: string;
}

export interface WebViewOperation {
  action: string;
  data: any;
  sessionId: string;
  timestamp: number;
}

export interface SecureWebViewCallbacks {
  onStateChange?: (oldState: WebViewState, newState: WebViewState) => void;
  onNavigationComplete?: (result: NavigationResult) => void;
  onSecurityViolation?: (violation: SecurityViolation) => void;
  onMessage?: (message: SecureMessage) => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
  blocked?: boolean;
  violation?: string;
}

export interface StateTransition {
  from: WebViewState;
  to: WebViewState;
  timestamp: number;
  reason?: string;
}

// React Native WebView event types
export interface WebViewNavigationEvent {
  url: string;
  title?: string;
  loading?: boolean;
  target?: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  lockIdentifier?: number;
}

export interface WebViewMessageEvent {
  data: string;
}

export interface WebViewErrorEvent {
  domain?: string;
  code?: number;
  description?: string;
}

export interface WebViewHttpErrorEvent {
  statusCode: number;
  url: string;
  description?: string;
}