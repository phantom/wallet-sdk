import type { ReactNode } from "react";
import { useState, useCallback, useMemo } from "react";
import { ModalContext, type ModalContextValue } from "./ModalContext";
import { isMobileDevice } from "@phantom/browser-sdk";
import { Modal } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "./PhantomContext";
import { ConnectModalContent } from "./components/ConnectModalContent";
import { ConnectedModalContent } from "./components/ConnectedModalContent";

export interface ModalProviderProps {
  children: ReactNode;
  appIcon?: string;
  appName?: string;
}

/**
 * Provider that manages modal state and renders the Modal component.
 */
export function ModalProvider({ children, appIcon, appName }: ModalProviderProps) {
  const { isConnected } = usePhantom();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
        isVisible={isModalOpen}
        onClose={closeModal}
        appIcon={appIcon}
        appName={appName}
        isConnected={isConnected}
        isMobile={isMobile}
      >
        {isConnected ? (
          <ConnectedModalContent onClose={closeModal} />
        ) : (
          <ConnectModalContent appIcon={appIcon} appName={appName} onClose={closeModal} />
        )}
      </Modal>
    </ModalContext.Provider>
  );
}
