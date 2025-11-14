import { createContext, useContext } from "react";

export interface ModalContextValue {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return {
    open: context.openModal,
    close: context.closeModal,
    isOpened: context.isModalOpen,
  };
}
