// Common analytics header names that SDKs can use
export const ANALYTICS_HEADERS = {
  SDK_TYPE: "x-phantom-sdk-type", // server, browser-sdk, react-native-sdk
  SDK_VERSION: "x-phantom-sdk-version", // SDK version, e.g. 1.0.0
  PLATFORM: "x-phantom-platform", // ext-sdk for all SDK requests
  WALLET_TYPE: "x-phantom-wallet-type", // app-wallet, user-wallet
  APP_ID: "x-app-id", // Your application ID for identifying your app in analytics
  PLATFORM_VERSION: "x-phantom-platform-version", // OS version, device model, etc.
  CLIENT: "x-phantom-client", // mcp, chrome, firefox, safari, node, ios, android, etc.
} as const;

// Platform value sent in all SDK API requests
export type SdkPlatform = "ext-sdk";

// Wallet type sent in analytics headers
export type SdkWalletType = "app-wallet" | "user-wallet";

// Known static client values; dynamic values (browser name, Platform.OS) are also accepted
export type SdkClient = "node" | "mcp" | string;

// Base headers required for all SDKs
export interface BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: string;
  [ANALYTICS_HEADERS.SDK_VERSION]: string;
  [ANALYTICS_HEADERS.APP_ID]?: string;
}

// Server SDK specific headers
export interface ServerSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "server";
  [ANALYTICS_HEADERS.PLATFORM]?: SdkPlatform;
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string;
  [ANALYTICS_HEADERS.CLIENT]?: SdkClient;
}

// Browser SDK specific headers
export interface BrowserSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "browser";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: SdkWalletType;
  [ANALYTICS_HEADERS.PLATFORM]?: SdkPlatform;
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string;
  [ANALYTICS_HEADERS.CLIENT]?: SdkClient;
}

// React Native SDK specific headers
export interface ReactNativeSdkHeaders extends BaseAnalyticsHeaders {
  [ANALYTICS_HEADERS.SDK_TYPE]: "react-native";
  [ANALYTICS_HEADERS.WALLET_TYPE]?: SdkWalletType;
  [ANALYTICS_HEADERS.PLATFORM]?: SdkPlatform;
  [ANALYTICS_HEADERS.PLATFORM_VERSION]?: string;
  [ANALYTICS_HEADERS.CLIENT]?: SdkClient;
}

// Client SDK specific headers
export type ClientSideSdkHeaders = BrowserSdkHeaders | ReactNativeSdkHeaders;

// Union type of all possible SDK headers
export type SdkAnalyticsHeaders = ServerSdkHeaders | ClientSideSdkHeaders;
