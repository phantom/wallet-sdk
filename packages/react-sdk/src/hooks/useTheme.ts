import { useContext } from "react";
import { PhantomContext } from "../PhantomProvider";
import type { CompletePhantomTheme } from "../themes";

export function useTheme(): CompletePhantomTheme {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("useTheme must be used within a PhantomProvider");
  }
  if (!context.theme) {
    throw new Error("Theme not initialized in PhantomProvider");
  }
  return context.theme;
}
