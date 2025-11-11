import { usePhantom } from "../PhantomProvider";

export interface UseModalResult {
  open: () => void;
  close: () => void;
  isOpened: boolean;
}

export function useModal(): UseModalResult {
  const { isModalOpen, openModal, closeModal } = usePhantom();

  return {
    open: openModal,
    close: closeModal,
    isOpened: isModalOpen,
  };
}
