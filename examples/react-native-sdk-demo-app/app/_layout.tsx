import "react-native-get-random-values";

import { Stack } from "expo-router";
import { PhantomProvider, AddressType, type PhantomSDKConfig } from "@phantom/react-native-sdk";
import { StatusBar } from "expo-status-bar";

const config: PhantomSDKConfig = {
  organizationId: process.env.EXPO_PUBLIC_ORGANIZATION_ID || "57b8172b-8583-4c13-a800-49f8553eb259",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "phantom-rn-demo", // Must match app.json scheme
  embeddedWalletType: process.env.EXPO_PUBLIC_EMBEDDED_WALLET_TYPE || "user-wallet",
  addressTypes: [AddressType.solana],
  authOptions: {
    authUrl: process.env.EXPO_PUBLIC_AUTH_URL,
    redirectUrl: process.env.EXPO_PUBLIC_REDIRECT_URL || "phantom-rn-demo://phantom-auth-callback",
  },
  apiBaseUrl: process.env.EXPO_PUBLIC_WALLET_API || "https://api.phantom.app/v1/wallets",
  debug: process.env.EXPO_PUBLIC_DEBUG === "true",
  solanaProvider: "web3js",
  appName: "Phantom React Native SDK Demo",
  appLogo: "https://picsum.photos/200", // Optional app logo URL
};

export default function RootLayout() {
  return (
    <PhantomProvider config={config}>
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
