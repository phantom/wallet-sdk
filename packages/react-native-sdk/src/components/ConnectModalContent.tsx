import { useState, useCallback } from "react";
import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import type { EmbeddedProviderAuthType } from "@phantom/embedded-provider-core";
import { Button, Icon, Text, useTheme, hexToRgba, ModalHeader } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "../PhantomContext";
import { useConnect } from "../hooks/useConnect";

export interface ConnectModalContentProps {
  appIcon?: string;
  appName?: string;
  onClose: () => void;
}

export function ConnectModalContent({ appIcon, onClose }: ConnectModalContentProps) {
  const theme = useTheme();
  const { isConnecting: contextIsConnecting, allowedProviders } = usePhantom();
  const { connect } = useConnect();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerType, setProviderType] = useState<EmbeddedProviderAuthType | null>(null);

  const isLoading = contextIsConnecting || isConnecting;

  const errorBackgroundColor = hexToRgba(theme.error, 0.1); // 10% opacity
  const errorBorderColor = hexToRgba(theme.error, 0.3); // 30% opacity
  const errorTextColor = theme.error;

  const connectWithAuthProvider = useCallback(
    async (provider: EmbeddedProviderAuthType) => {
      try {
        setIsConnecting(true);
        setError(null);
        setProviderType(provider);

        await connect({ provider });

        onClose();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setIsConnecting(false);
        setProviderType(null);
      }
    },
    [connect, onClose],
  );

  const styles = StyleSheet.create({
    appIcon: {
      borderRadius: 28,
      height: 56,
      marginBottom: 12,
      width: 56,
    },
    buttonContainer: {
      alignItems: "center",
      flexDirection: "column",
      gap: 12,
      paddingHorizontal: 32,
      width: "100%",
    },
    buttonContent: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    buttonContentLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    container: {
      alignItems: "center",
      flexDirection: "column",
      gap: 12,
      paddingBottom: 24,
      width: "100%",
    },
    errorContainer: {
      backgroundColor: errorBackgroundColor,
      borderColor: errorBorderColor,
      borderRadius: parseInt(theme.borderRadius),
      borderWidth: 1,
      padding: 12,
      width: "100%",
    },
    errorText: {
      color: errorTextColor,
      fontSize: 14,
    },
    footer: {
      alignItems: "center",
      borderColor: theme.aux,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 4,
      justifyContent: "center",
      marginTop: 24,
      padding: 16,
      width: "100%",
    },
    loadingContainer: {
      alignItems: "center",
      flexDirection: "column",
      gap: 12,
      justifyContent: "center",
      padding: 24,
    },
  });

  return (
    <View style={styles.container}>
      <ModalHeader title="Login or Sign Up" onClose={onClose} />

      {appIcon && <Image testID="app-icon" source={{ uri: appIcon }} style={styles.appIcon} />}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator testID="activity-indicator" size="large" color={theme.brand} />
          <Text variant="label" color={theme.secondary}>
            Loading...
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          {/* All buttons in columns with icon and text */}
          {allowedProviders.includes("google") && (
            <Button
              onClick={() => connectWithAuthProvider("google")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "google"}
              fullWidth={true}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonContentLeft}>
                  <Icon type="google" size={20} color={theme.text} />
                  <Text variant="captionBold">Continue with Google</Text>
                </View>
                <Icon type="chevron-right" size={16} color={theme.secondary} />
              </View>
            </Button>
          )}

          {allowedProviders.includes("apple") && (
            <Button
              onClick={() => connectWithAuthProvider("apple")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "apple"}
              fullWidth={true}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonContentLeft}>
                  <Icon type="apple" size={20} color={theme.text} />
                  <Text variant="captionBold">Continue with Apple</Text>
                </View>
                <Icon type="chevron-right" size={16} color={theme.secondary} />
              </View>
            </Button>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text variant="label" color={theme.secondary}>
          Powered by
        </Text>
        <Icon type="phantom" size={16} color={theme.secondary} />
        <Text variant="label" color={theme.secondary}>
          Phantom
        </Text>
      </View>
    </View>
  );
}
