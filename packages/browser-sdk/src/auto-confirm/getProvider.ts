import type { PhantomProvider } from "./types";

export async function getProvider(): Promise<PhantomProvider | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const provider = (window as any).phantom?.ethereum || (window as any).phantom;

  if (!provider) {
    return null;
  }

  return provider;
}