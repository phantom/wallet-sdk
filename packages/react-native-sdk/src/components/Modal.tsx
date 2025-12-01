import type { ReactNode } from "react";
import { Modal as RNModal, View, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "@phantom/wallet-sdk-ui";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
  isMobile?: boolean;
  children: ReactNode;
}

/**
 * Modal component for React Native using bottom sheet design
 * Only renders the container and backdrop - content components handle headers and footers
 */
export function Modal({ isVisible, onClose, children }: ModalProps) {
  const theme = useTheme();

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
    handle: {
      alignSelf: "center",
      backgroundColor: theme.secondary,
      borderRadius: 2.5,
      height: 5,
      marginTop: 12,
      opacity: 0.3,
      width: 40,
    },
  });

  return (
    <RNModal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.bottomSheet}>
        <View style={styles.handle} />
        {children}
      </SafeAreaView>
    </RNModal>
  );
}
