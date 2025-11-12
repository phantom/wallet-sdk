"use client";
import { PhantomProvider, AddressType } from "@phantom/react-sdk";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PhantomProvider
      config={{
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      }}
    >
      {children}
    </PhantomProvider>
  );
}
