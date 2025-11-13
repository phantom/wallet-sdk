import type { ReactNode } from "react";

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
 * Modal component is not supported in React Native.
 * Use a bottom sheet or custom native modal implementation instead.
 */
export function Modal(_props: ModalProps) {
  throw new Error("Modal component is not supported in React Native. Use a bottom sheet implementation instead.");
}
