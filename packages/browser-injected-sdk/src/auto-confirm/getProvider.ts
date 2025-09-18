import type { PhantomProvider } from "./types";

export function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const provider = (window as any)?.phantom?.app;

  if (!provider) {
    return null;
  }

  return provider;
}
