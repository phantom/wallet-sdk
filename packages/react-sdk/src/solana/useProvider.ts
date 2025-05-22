import { usePhantom } from "../PhantomContext";

export function useProvider() {
  const { phantom } = usePhantom();

  if (!phantom) {
    throw new Error("Phantom is not available, check if you configured the PhantomProvider properly.");
  }

  if (!phantom?.solana) {
    throw new Error("Solana is not available, check if you configured the solana plugin properly.");
  }

  return phantom.solana.getProvider();
}
