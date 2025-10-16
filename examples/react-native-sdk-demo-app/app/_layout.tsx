import "react-native-get-random-values";

import { Stack } from "expo-router";
import {
  PhantomProvider,
  AddressType,
  type PhantomSDKConfig,
  type PhantomDebugConfig,
} from "@phantom/react-native-sdk";
import { StatusBar } from "expo-status-bar";

// SDK configuration - static, won't cause SDK reinstantiation when debug changes
const config: PhantomSDKConfig = {
  appId: process.env.EXPO_PUBLIC_APP_ID || "57b8172b-8583-4c13-a800-49f8553eb259",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "phantom-rn-demo", // Must match app.json scheme
  embeddedWalletType: isEmbeddedWalletType(process.env.EXPO_PUBLIC_EMBEDDED_WALLET_TYPE)
    ? process.env.EXPO_PUBLIC_EMBEDDED_WALLET_TYPE
    : "user-wallet",
  addressTypes: [AddressType.solana],
  authOptions: {
    authUrl: process.env.EXPO_PUBLIC_AUTH_URL,
    redirectUrl: process.env.EXPO_PUBLIC_REDIRECT_URL || "phantom-rn-demo://phantom-auth-callback",
  },
  apiBaseUrl: process.env.EXPO_PUBLIC_WALLET_API || "https://api.phantom.app/v1/wallets",
};

function isEmbeddedWalletType(
  embeddedWalletType: typeof process.env.EXPO_PUBLIC_EMBEDDED_WALLET_TYPE,
): embeddedWalletType is PhantomSDKConfig["embeddedWalletType"] {
  return embeddedWalletType === "user-wallet" || embeddedWalletType === "app-wallet";
}

// Debug configuration - separate to avoid SDK reinstantiation
const debugConfig: PhantomDebugConfig = {
  enabled: process.env.EXPO_PUBLIC_DEBUG === "true",
};

export default function RootLayout() {
  return (
    <PhantomProvider config={config} debugConfig={debugConfig}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#6366f1",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Phantom React Native SDK Demo",
          }}
        />
        <Stack.Screen
          name="wallet"
          options={{
            title: "Wallet Operations",
          }}
        />
        <Stack.Screen
          name="auth-callback"
          options={{
            title: "Authentication Callback",
            presentation: "modal",
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </PhantomProvider>
  );
}
