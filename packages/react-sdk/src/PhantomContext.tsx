import type { CreatePhantomConfig, Phantom } from "@phantom/browser-sdk";
import { createPhantom } from "@phantom/browser-sdk";
import * as React from "react";

type PhantomContextType = { phantom: undefined; isReady: false } | { phantom: Phantom; isReady: true };

const PhantomContext = React.createContext<PhantomContextType>({ phantom: undefined, isReady: false });

export const PhantomProvider = ({ children, config }: { children: React.ReactNode; config: CreatePhantomConfig }) => {
  const [context, setContext] = React.useState<PhantomContextType>({ phantom: undefined, isReady: false });

  React.useEffect(() => {
    const phantom = createPhantom(config);
    setContext({ phantom, isReady: true });
  }, [config]);

  return <PhantomContext.Provider value={context}>{children}</PhantomContext.Provider>;
};

export function usePhantom() {
  const context = React.useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
