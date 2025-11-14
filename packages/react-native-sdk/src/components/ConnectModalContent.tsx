import { useState, useCallback } from "react";
import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import type { EmbeddedProviderAuthType } from "@phantom/embedded-provider-core";
import { Button, Icon, Text, useTheme } from "@phantom/wallet-sdk-ui";
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

  const errorBackgroundColor = `${theme.error}1A`;
  const errorBorderColor = `${theme.error}4D`;
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
      width: 56,
    },
    buttonContainer: {
      alignItems: "center",
      flexDirection: "column",
      gap: 12,
      width: "100%",
    },
    container: {
      alignItems: "center",
      flexDirection: "column",
      gap: 24,
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
    loadingContainer: {
      alignItems: "center",
      flexDirection: "column",
      gap: 12,
      justifyContent: "center",
      padding: 24,
    },
    spacer: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      {appIcon && <Image source={{ uri: appIcon }} style={styles.appIcon} />}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text variant="label" color={theme.secondary}>
            Loading...
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          {/* All buttons in columns with icon and text */}
          {allowedProviders.includes("google") && (
            <Button
              onClick={() => connectWithAuthProvider("google")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "google"}
              fullWidth={true}
            >
              <Icon type="google" size={20} color={theme.text} />
              <Text variant="captionBold">Continue with Google</Text>
              <View style={styles.spacer} />
              <Icon type="chevron-right" size={16} color={theme.text} />
            </Button>
          )}

          {allowedProviders.includes("apple") && (
            <Button
              onClick={() => connectWithAuthProvider("apple")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "apple"}
              fullWidth={true}
            >
              <Icon type="apple" size={20} color={theme.text} />
              <Text variant="captionBold">Continue with Apple</Text>
              <View style={styles.spacer} />
              <Icon type="chevron-right" size={16} color={theme.text} />
            </Button>
          )}

          {allowedProviders.includes("x") && (
            <Button
              onClick={() => connectWithAuthProvider("x")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "x"}
              fullWidth={true}
            >
              <Icon type="x" size={20} color={theme.text} />
              <Text variant="captionBold">Continue with X</Text>
              <View style={styles.spacer} />
              <Icon type="chevron-right" size={16} color={theme.text} />
            </Button>
          )}

          {allowedProviders.includes("tiktok") && (
            <Button
              onClick={() => connectWithAuthProvider("tiktok")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "tiktok"}
              fullWidth={true}
            >
              <Icon type="tiktok" size={20} color={theme.text} />
              <Text variant="captionBold">Continue with TikTok</Text>
              <View style={styles.spacer} />
              <Icon type="chevron-right" size={16} color={theme.text} />
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
