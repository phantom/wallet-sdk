import { useContext } from "react";
import { PhantomUIContext, type PhantomUIContextValue } from "../context";

export function usePhantomUI(): PhantomUIContextValue {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("usePhantomUI must be used within a PhantomProvider");
  }
  return context;
}
