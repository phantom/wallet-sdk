// Common analytics header names that SDKs can use
export const ANALYTICS_HEADERS = {
  SDK_TYPE: "x-phantom-sdk-type", // server, browser-sdk, react-native-sdk
  SDK_VERSION: "x-phantom-sdk-version", // SDK version, e.g. 1.0.0
  PLATFORM: "x-phantom-platform", // firefox, chrome, safari, ios, android, etc.
  WALLET_TYPE: "x-phantom-wallet-type", // app-wallet, user-wallet
  APP_ID: "x-app-id", // Your application ID for identifying your app in analytics
  PLATFORM_VERSION: "x-phantom-platform-version", // OS version, device model, etc.
} as const;

// Base headers required for all SDKs
export interface BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: string;
  [ANALYTICS_HEADERS.SDK_VERSION]: string;
  [ANALYTICS_HEADERS.APP_ID]?: string;
}

// Server SDK specific headers
export interface ServerSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "server";
  [ANALYTICS_HEADERS.PLATFORM]?: string;
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string;
}

// Browser SDK specific headers
export interface BrowserSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "browser";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: "app-wallet" | "user-wallet";
  [ANALYTICS_HEADERS.PLATFORM]?: string; // chrome, firefox, safari, edge, etc.
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string; // Full user agent for more detailed info
}

// React Native SDK specific headers
export interface ReactNativeSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "react-native";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: "app-wallet" | "user-wallet";
  [ANALYTICS_HEADERS.PLATFORM]?: string; // ios, android, etc.
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string; // OS version, device model, etc.
}

// Client SDK specific headers
export type ClientSideSdkHeaders = BrowserSdkHeaders | ReactNativeSdkHeaders;

// Union type of all possible SDK headers
export type SdkAnalyticsHeaders = ServerSdkHeaders | ClientSideSdkHeaders;
