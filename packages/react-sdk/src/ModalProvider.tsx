import type { ReactNode } from "react";
import { useState, useCallback, useMemo } from "react";
import { usePhantom } from "./PhantomContext";
import { ModalContext, type ModalContextValue } from "./ModalContext";
import { Modal } from "./components/Modal";

export interface ModalProviderProps {
  children: ReactNode;
  appIcon?: string;
  appName?: string;
}

/**
 * Provider that manages modal state and renders the Modal component.
 * Uses lazy loading to break circular dependencies in the module graph.
 */
export function ModalProvider({ children, appIcon, appName }: ModalProviderProps) {
  const { theme } = usePhantom();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      {theme && <Modal isVisible={isModalOpen} onClose={closeModal} appIcon={appIcon} appName={appName} />}
    </ModalContext.Provider>
  );
}
