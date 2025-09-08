// Common analytics header names that SDKs can use
export const ANALYTICS_HEADERS = {
  SDK_TYPE: "x-phantom-sdk-type",
  SDK_VERSION: "x-phantom-sdk-version", 
  PLATFORM: "x-phantom-platform",
  WALLET_TYPE: "x-phantom-wallet-type",
  APP_ID: "x-app-id",
} as const;

// Base headers required for all SDKs
export interface BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: string;
  [ANALYTICS_HEADERS.SDK_VERSION]: string;
  [ANALYTICS_HEADERS.APP_ID]?: string;
}

// Server SDK specific headers
export interface ServerSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "server-sdk";
  [ANALYTICS_HEADERS.PLATFORM]?: string;
}

// Browser SDK specific headers
export interface BrowserSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "browser-sdk";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: "app-wallet" | "user-wallet";
  [ANALYTICS_HEADERS.PLATFORM]?: string; // chrome-version, firefox-version, safari-version, edge-version, etc.
}


// React Native SDK specific headers
export interface ReactNativeSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "react-native-sdk";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: "app-wallet" | "user-wallet";
  [ANALYTICS_HEADERS.PLATFORM]?: string; // ios-version, android-version, etc.
}

// Client SDK specific headers
export type ClientSideSdkHeaders = BrowserSdkHeaders 
  | ReactNativeSdkHeaders;

// Union type of all possible SDK headers
export type SdkAnalyticsHeaders =
  | ServerSdkHeaders
  | ClientSideSdkHeaders;

