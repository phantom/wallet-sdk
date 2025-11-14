import "react-native-get-random-values";

import { Stack } from "expo-router";
import { useState, createContext, useContext, type ReactNode } from "react";
import {
  PhantomProvider,
  AddressType,
  type PhantomSDKConfig,
  type PhantomDebugConfig,
  darkTheme,
  lightTheme,
  type PhantomTheme,
} from "@phantom/react-native-sdk";
import { StatusBar } from "expo-status-bar";

// Theme Context
interface ThemeContextType {
  currentTheme: "dark" | "light" | "custom";
  setTheme: (theme: "dark" | "light" | "custom") => void;
  theme: Partial<PhantomTheme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeContextProvider");
  }
  return context;
}

function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light" | "custom">("dark");

  const customTheme: Partial<PhantomTheme> = {
    background: "#ff6b35",
    text: "#ffffff",
    secondary: "#ffe5d9",
    overlay: "rgba(0, 0, 0, 0.7)",
    borderRadius: "24px",
    error: "#dc2626",
    success: "#84cc16",
    brand: "#fbbf24",
  };

  const getTheme = (): Partial<PhantomTheme> => {
    switch (currentTheme) {
      case "light":
        return lightTheme;
      case "custom":
        return customTheme;
      case "dark":
      default:
        return darkTheme;
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme, theme: getTheme() }}>
      {children}
    </ThemeContext.Provider>
  );
}

// SDK configuration - static, won't cause SDK reinstantiation when debug changes
const config: PhantomSDKConfig = {
  appId: process.env.EXPO_PUBLIC_APP_ID || "57b8172b-8583-4c13-a800-49f8553eb259",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "phantom-rn-demo", // Must match app.json scheme
  providers: ["google", "apple"],
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

function RootLayoutInner() {
  const { theme } = useThemeContext();

  return (
    <PhantomProvider
      config={config}
      debugConfig={debugConfig}
      appIcon="https://picsum.photos/seed/picsum/200"
      appName="Phantom React Native SDK Demo"
      theme={theme}
    >
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

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <RootLayoutInner />
    </ThemeContextProvider>
  );
}
