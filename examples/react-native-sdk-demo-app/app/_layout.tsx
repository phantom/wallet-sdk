import "react-native-get-random-values";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "./providers";
export { useThemeContext } from "./providers";

export default function RootLayout() {
  return (
    <Providers>
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
    </Providers>
  );
}
