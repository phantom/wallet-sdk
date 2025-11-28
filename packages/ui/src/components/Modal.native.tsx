import type { ReactNode } from "react";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
  isMobile?: boolean;
  children: ReactNode;
}

/**
 * Modal component is not provided in the UI package for React Native.
 * Use the Modal component from @phantom/react-native-sdk instead.
 */
export function Modal(_props: ModalProps) {
  throw new Error(
    "Modal component is not provided in the UI package for React Native. Import Modal from @phantom/react-native-sdk instead.",
  );
}
