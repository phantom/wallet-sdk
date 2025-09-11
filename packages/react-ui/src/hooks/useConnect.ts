import { useCallback } from "react";
// import { useConnect as useBaseConnect } from "@phantom/react-sdk";
import { usePhantomUI } from "../PhantomProvider";

export interface UseConnectResult {
  connect: () => void;
  isConnecting: boolean;
  error: Error | null;
}

export function useConnect(): UseConnectResult {
  const ui = usePhantomUI();

  const connect = useCallback(() => {
    ui.showConnectionModal();
  }, [ui]);

  return {
    connect,
    isConnecting: ui.connectionState.isConnecting,
    error: ui.connectionState.error,
  };
}
