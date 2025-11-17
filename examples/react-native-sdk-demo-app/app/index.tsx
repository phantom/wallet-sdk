import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useConnect, useAccounts, useDisconnect, useModal } from "@phantom/react-native-sdk";
import { useThemeContext } from "./providers";

export default function HomeScreen() {
  const router = useRouter();
  const { connect, isConnecting, error: connectError } = useConnect();
  const { isConnected, addresses, walletId } = useAccounts();
  const { disconnect, isDisconnecting } = useDisconnect();
  const modal = useModal();
  const { currentTheme, setTheme } = useThemeContext();

  const handleConnect = async (provider: "google") => {
    try {
      const result = await connect({ provider });

      if (result.status === "completed") {
        Alert.alert("Success", "Wallet connected successfully!");
        router.push("/wallet");
      } else if (result.status === "pending") {
        Alert.alert("Redirecting", "Opening browser for authentication...");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to connect: ${(error as Error).message}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      Alert.alert("Disconnected", "Wallet has been disconnected");
    } catch (error) {
      Alert.alert("Error", `Failed to disconnect: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Phantom React Native SDK</Text>
          <Text style={styles.subtitle}>Demo Application</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: isConnected ? "#10b981" : "#ef4444",
                },
              ]}
            />
            <Text style={styles.statusText}>{isConnected ? "Connected" : "Disconnected"}</Text>
          </View>

          {isConnected && (
            <View style={styles.walletInfo}>
              <Text style={styles.infoLabel}>Wallet ID:</Text>
              <Text style={styles.infoValue}>{walletId || "N/A"}</Text>

              <Text style={styles.infoLabel}>Addresses:</Text>
              {addresses && addresses.length > 0 ? (
                addresses.map((addr, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.addressItem}>
                      <Text style={styles.addressType}>{addr.addressType}:</Text>
                      <Text style={styles.addressValue} numberOfLines={1}>
                        {addr.address}
                      </Text>
                    </View>
                  </React.Fragment>
                ))
              ) : (
                <Text style={styles.infoValue}>No addresses available</Text>
              )}
            </View>
          )}
        </View>

        {/* Theme Switcher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modal Theme</Text>
          <Text style={styles.description}>Switch between different themes for the modal:</Text>
          <View style={styles.themeButtonRow}>
            <TouchableOpacity
              style={[styles.themeButton, currentTheme === "dark" && styles.themeButtonActive]}
              onPress={() => setTheme("dark")}
            >
              <Text style={[styles.themeButtonText, currentTheme === "dark" && styles.themeButtonTextActive]}>
                Dark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeButton, currentTheme === "light" && styles.themeButtonActive]}
              onPress={() => setTheme("light")}
            >
              <Text style={[styles.themeButtonText, currentTheme === "light" && styles.themeButtonTextActive]}>
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeButton, currentTheme === "custom" && styles.themeButtonActive]}
              onPress={() => setTheme("custom")}
            >
              <Text style={[styles.themeButtonText, currentTheme === "custom" && styles.themeButtonTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Authentication Options */}
        {!isConnected ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connect Wallet</Text>
            <Text style={styles.description}>Connect your Phantom wallet using various authentication methods:</Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => modal.open()}
              disabled={isConnecting}
            >
              <Text style={styles.buttonText}>Open Connect Modal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={() => handleConnect("google")}
              disabled={isConnecting}
            >
              <Text style={styles.buttonText}>{isConnecting ? "Connecting..." : "Connect with Google"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet Actions</Text>

            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => modal.open()}>
              <Text style={styles.buttonText}>Open Wallet Modal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => router.push("/wallet")}>
              <Text style={styles.buttonText}>Open Wallet Operations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => handleDisconnect()}
              disabled={isDisconnecting}
            >
              <Text style={styles.buttonText}>{isDisconnecting ? "Disconnecting..." : "Disconnect Wallet"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Display */}
        {connectError && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error</Text>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{connectError?.message}</Text>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            This demo app showcases the Phantom React Native SDK integration. It demonstrates wallet connection,
            authentication flows, message signing, and transaction handling in a React Native/Expo environment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 5,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  walletInfo: {
    marginTop: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 10,
  },
  infoValue: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
    fontFamily: "monospace",
  },
  addressItem: {
    marginTop: 5,
  },
  addressType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  addressValue: {
    fontSize: 12,
    color: "#374151",
    fontFamily: "monospace",
    marginTop: 2,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  googleButton: {
    backgroundColor: "#dc2626",
  },
  dangerButton: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  themeButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeButtonActive: {
    backgroundColor: "#6366f1",
    borderColor: "#4f46e5",
  },
  themeButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  themeButtonTextActive: {
    color: "#ffffff",
  },
});
