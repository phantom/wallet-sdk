import { useContext } from "react";
import { PhantomContext } from "../PhantomContext";
import type { CompletePhantomTheme } from "../themes";

export function useTheme(): CompletePhantomTheme {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("useTheme must be used within a PhantomProvider");
  }
  return context.theme;
}
