import { useContext } from "react";
import { PhantomUIContext } from "../context";
import type { CompletePhantomTheme } from "../themes";

export function useTheme(): CompletePhantomTheme {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("useTheme must be used within a PhantomProvider");
  }
  return context.theme;
}
