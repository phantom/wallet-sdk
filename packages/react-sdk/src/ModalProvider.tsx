import type { ReactNode } from "react";
import { useState, useCallback, useMemo } from "react";
import { ModalContext, type ModalContextValue } from "./ModalContext";
import { isMobileDevice } from "@phantom/browser-sdk";
import { Modal } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "./PhantomContext";
import { ConnectModalContent } from "./components/ConnectModalContent";
import { ConnectedModalContent } from "./components/ConnectedModalContent";
import { SpendingLimitModalContent } from "./components/SpendingLimitModalContent";

export interface ModalProviderProps {
  children: ReactNode;
  appIcon?: string;
  appName?: string;
}

/**
 * Provider that manages modal state and renders the Modal component.
 */
export function ModalProvider({ children, appIcon, appName }: ModalProviderProps) {
  const { isConnected, errors, clearError } = usePhantom();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    clearError("spendingLimit");
  }, [clearError]);

  const isSpendingLimitOpen = !!errors.spendingLimit;

  const modalContextValue: ModalContextValue = useMemo(
    () => ({
      isModalOpen,
      openModal,
      closeModal,
    }),
    [isModalOpen, openModal, closeModal],
  );

  return (
    <ModalContext.Provider value={modalContextValue}>
      {children}
      <Modal
        isVisible={isModalOpen || isSpendingLimitOpen}
        onClose={closeModal}
        appIcon={appIcon}
        appName={appName}
        isMobile={isMobile}
      >
        {isSpendingLimitOpen ? (
          <SpendingLimitModalContent onClose={closeModal} />
        ) : isConnected ? (
          <ConnectedModalContent onClose={closeModal} />
        ) : (
          <ConnectModalContent appIcon={appIcon} appName={appName} onClose={closeModal} />
        )}
      </Modal>
    </ModalContext.Provider>
  );
}
