import type { ReactNode } from "react";
import { Modal as RNModal, View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useTheme, Icon, Text } from "@phantom/wallet-sdk-ui";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
  isConnected?: boolean;
  isMobile?: boolean;
  children: ReactNode;
}

/**
 * Modal component for React Native using bottom sheet design
 */
export function Modal({ isVisible, onClose, isConnected, children }: ModalProps) {
  const theme = useTheme();

  const borderColor = `rgba(152, 151, 156, 0.10)`;

  const styles = StyleSheet.create({
    bottomSheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      bottom: 0,
      left: 0,
      paddingBottom: 20,
      position: "absolute",
      right: 0,
    },
    closeButton: {
      alignItems: "center",
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      position: "absolute",
      right: 20,
      top: 5,
      width: 40,
    },
    content: {
      alignItems: "center",
      gap: 24,
      paddingBottom: 24,
      paddingHorizontal: 24,
    },
    footer: {
      alignItems: "center",
      borderColor: borderColor,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 4,
      justifyContent: "center",
      padding: 16,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: theme.secondary,
      borderRadius: 2.5,
      height: 5,
      marginTop: 12,
      opacity: 0.3,
      width: 40,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      paddingBottom: 0,
      paddingHorizontal: 24,
      paddingTop: 16,
      position: "relative",
    },
    title: {
      marginBottom: 16,
    },
  });

  return (
    <RNModal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.bottomSheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.title}>
            <Text variant="caption" color={theme.secondary}>
              {isConnected ? "Wallet" : "Login or Sign Up"}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.6}>
            <Icon type="close" size={24} color={theme.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>

        <View style={styles.footer}>
          <Text variant="label" color={theme.secondary}>
            Powered by
          </Text>
          <Icon type="phantom" size={16} color={theme.secondary} />
          <Text variant="label" color={theme.secondary}>
            Phantom
          </Text>
        </View>
      </SafeAreaView>
    </RNModal>
  );
}
