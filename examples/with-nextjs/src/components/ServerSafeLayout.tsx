import { ReactNode } from "react";

interface ServerSafeLayoutProps {
  children: ReactNode;
}

// This layout is server-side rendered and contains static content
export function ServerSafeLayout({ children }: ServerSafeLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <main className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Phantom SDK + Next.js</h1>
          <p className="text-gray-600">Connect your Phantom wallet and sign a message</p>
          <p className="text-sm text-gray-500 mt-2">
            🌟 This page layout is server-side rendered! Only the wallet component is client-side.
          </p>
        </div>

        {/* Children can be either SSR or client components */}
        {children}
      </main>

      {/* This footer is server-side rendered */}
      <footer className="mt-8 text-center text-gray-500">
        <p>This footer and main layout are server-side rendered for better SEO</p>
        <p className="text-xs mt-2">Built with Phantom React SDK - demonstrating SSR compatibility</p>
        <p className="text-xs text-green-600 mt-1">✅ Server-rendered content preserves SEO benefits</p>
      </footer>
    </div>
  );
}
