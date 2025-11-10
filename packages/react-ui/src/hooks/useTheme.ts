import { useContext } from "react";
import { PhantomUIContext } from "../context";
import type { PhantomThemeWithAux } from "../themes";

export function useTheme(): PhantomThemeWithAux {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("useTheme must be used within a PhantomProvider");
  }
  return context.theme;
}
