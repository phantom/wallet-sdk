"use client";
import { useAccounts, useConnect, useDisconnect, useSolana } from "@phantom/react-sdk";
import { useState } from "react";
import bs58 from "bs58";

export function WalletInterface() {
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const addresses = useAccounts();
  const isConnected = addresses && addresses.length > 0;

  const { solana } = useSolana();
  const [signatureResult, setSignatureResult] = useState<string>("");

  const handleSignMessage = async () => {
    if (!solana || !isConnected) return;
    try {
      const message = "Hello from Phantom SDK with Next.js!";
      const result = await solana.signMessage(message);
      setSignatureResult(`Message signed! Signature: ${bs58.encode(result.signature)}...`);
    } catch (error) {
      console.error("Failed to sign message:", error);
      setSignatureResult("Failed to sign message");
    }
  };

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <button
          onClick={() => connect({ provider: "injected" })}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Connect Phantom Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium mb-2">✅ Wallet Connected</p>
            <div className="text-sm text-green-700">
              {addresses.map(addr => (
                <div key={addr.addressType} className="font-mono break-all">
                  {addr.addressType}: {addr.address}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSignMessage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Sign Message
          </button>

          {signatureResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm font-mono break-all">{signatureResult}</p>
            </div>
          )}

          <button
            onClick={() => disconnect()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
