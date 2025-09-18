import { WalletInterface } from "@/components/WalletInterface";
import { ServerSafeLayout } from "@/components/ServerSafeLayout";
import { ClientProvider } from "@/components/ClientProvider";

// This page component is server-side rendered
export default function Home() {
  return (
    <ServerSafeLayout>
      {/* Only the wallet functionality is wrapped in client provider */}
      <ClientProvider>
        <WalletInterface />
      </ClientProvider>
    </ServerSafeLayout>
  );
}
