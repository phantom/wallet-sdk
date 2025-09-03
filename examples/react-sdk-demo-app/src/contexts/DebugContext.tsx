import { createContext, useContext } from "react";
import type { DebugLevel, DebugMessage } from "@phantom/react-sdk";

// Debug Context
export interface DebugContextType {
  debugMessages: DebugMessage[];
  debugLevel: DebugLevel;
  showDebug: boolean;
  setDebugLevel: (level: DebugLevel) => void;
  setShowDebug: (show: boolean) => void;
  clearDebugMessages: () => void;
}

export const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
};
