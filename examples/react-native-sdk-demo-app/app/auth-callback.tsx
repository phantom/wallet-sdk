import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useConnect, useAccounts } from "@phantom/react-native-sdk";

interface AuthState {
  status: "loading" | "success" | "error";
  message: string;
  title: string;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { connect, isConnecting, error: connectError } = useConnect();
  const { addresses, walletId } = useAccounts();

  const [authState, setAuthState] = useState<AuthState>({
    status: "loading",
    title: "Processing authentication...",
    message: "Please wait while we complete your authentication.",
  });

  const hasStartedAuth = useRef(false);

  // Handle authentication callback
  const handleAuthCallback = useCallback(async () => {
    try {
      setAuthState({
        status: "loading",
        title: "Connecting to wallet...",
        message: "Establishing connection with your authenticated wallet.",
      });

      // Connect - this should resume from the redirect
      // The React Native SDK should automatically handle the callback URL params
      const result = await connect({ provider: "google" });

      // Check if connection was successful
      if (result.status === "completed" && result.addresses && result.addresses.length > 0) {
        setAuthState({
          status: "success",
          title: "Authentication Successful!",
          message: "You have been successfully authenticated and connected to your wallet.",
        });
      } else if (result.status === "pending") {
        // Handle pending status if needed
      } else {
        throw new Error("Connection completed but no addresses found");
      }
    } catch (error) {
      setAuthState({
        status: "error",
        title: "Authentication Failed",
        message: (error as Error).message || "An unknown error occurred during authentication.",
      });
    }
  }, [connect]);

  useEffect(() => {
    if (!hasStartedAuth.current) {
      hasStartedAuth.current = true;
      handleAuthCallback();
    }
  }, [handleAuthCallback]);

  // Monitor connect error
  useEffect(() => {
    if (connectError) {
      console.error("Auth callback error:", connectError);
      setAuthState({
        status: "error",
        title: "Authentication Failed",
        message: connectError.message || "An unknown error occurred during authentication.",
      });
    }
  }, [connectError]);

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleRetry = () => {
    hasStartedAuth.current = false;
    setAuthState({
      status: "loading",
      title: "Retrying authentication...",
      message: "Please wait while we retry your authentication.",
    });
    handleAuthCallback();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Loading State */}
        {authState.status === "loading" && (
          <View style={styles.section}>
            <View style={styles.centeredContent}>
              <ActivityIndicator size="large" color="#6366f1" style={styles.spinner} />
              <Text style={styles.statusTitle}>{authState.title}</Text>
              <Text style={styles.statusMessage}>{authState.message}</Text>
              {isConnecting && <Text style={styles.connectingText}>Connecting...</Text>}
            </View>
          </View>
        )}

        {/* Success State */}
        {authState.status === "success" && (
          <View style={styles.section}>
            <View style={styles.centeredContent}>
              <View style={styles.successIcon}>
                <Text style={styles.iconText}>✓</Text>
              </View>
              <Text style={styles.statusTitle}>{authState.title}</Text>
              <Text style={styles.statusMessage}>{authState.message}</Text>

              <View style={styles.walletInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Wallet ID:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {walletId || "N/A"}
                  </Text>
                </View>

                <Text style={styles.infoLabel}>Addresses:</Text>
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr, index) => (
                    <View key={index} style={styles.addressItem}>
                      <Text style={styles.addressType}>{addr.addressType}:</Text>
                      <Text style={styles.addressValue} numberOfLines={1}>
                        {addr.address}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.infoValue}>No addresses available</Text>
                )}
              </View>

              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleGoHome}>
                <Text style={styles.buttonText}>Go to Main App</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error State */}
        {authState.status === "error" && (
          <View style={styles.section}>
            <View style={styles.centeredContent}>
              <View style={styles.errorIcon}>
                <Text style={styles.iconText}>✗</Text>
              </View>
              <Text style={styles.statusTitle}>{authState.title}</Text>
              <Text style={styles.errorMessage}>{authState.message}</Text>

              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRetry}>
                  <Text style={[styles.buttonText, { color: "#6366f1" }]}>Retry Authentication</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleGoHome}>
                  <Text style={styles.buttonText}>Go to Main App</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
    flexGrow: 1,
    justifyContent: "center",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centeredContent: {
    alignItems: "center",
  },
  spinner: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 10,
  },
  statusMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  connectingText: {
    fontSize: 14,
    color: "#6366f1",
    fontStyle: "italic",
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 30,
    color: "#ffffff",
    fontWeight: "bold",
  },
  walletInfo: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  addressItem: {
    marginTop: 8,
    paddingLeft: 10,
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
  errorMessage: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
  },
  buttonGroup: {
    width: "100%",
    gap: 10,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderColor: "#6366f1",
    borderWidth: 1,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
