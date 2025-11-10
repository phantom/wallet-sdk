import React, { useState } from "react";
import { useConnect, useDisconnect, useAccount, useSignMessage, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export default function WalletDemo() {
  const [message, setMessage] = useState("Hello from Phantom SDK + wagmi!");
  const [signResult, setSignResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wagmi hooks
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { signMessage, isPending: isSigning, error: signError, data: signatureData } = useSignMessage();

  // Update state when signature data changes
  React.useEffect(() => {
    if (signatureData) {
      setSignResult(signatureData);
      setError(null);
    }
  }, [signatureData]);

  // Update state when sign error changes
  React.useEffect(() => {
    if (signError) {
      setError(`Signing failed: ${signError.message}`);
      setSignResult(null);
    }
  }, [signError]);

  // Get the phantom connector
  const phantomConnector = connectors.find(c => c.id === "phantom");

  const handleConnect = async () => {
    try {
      setError(null);
      if (phantomConnector) {
        connect({ connector: phantomConnector });
      }
    } catch (err) {
      setError(`Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSignMessage = () => {
    setError(null);
    setSignResult(null);
    signMessage({ message });
  };

  const handleSwitchToSepolia = async () => {
    try {
      setError(null);
      await switchChain({ chainId: sepolia.id });
    } catch (err) {
      setError(`Chain switch failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div>
      <div className="status">
        <h2>Connection Status</h2>
        {isConnected ? (
          <div>
            <p>
              <strong>Connected!</strong>
            </p>
            <p>
              <strong>Address:</strong> {address}
            </p>
            <p>
              <strong>Chain ID:</strong> {chainId}
            </p>
            <button onClick={() => disconnect()}>Disconnect</button>
            <button onClick={handleSwitchToSepolia}>Switch to Sepolia</button>
          </div>
        ) : (
          <div>
            <p>Not connected</p>
            <button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Phantom Wallet"}
            </button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="status">
          <h2>Sign Message with wagmi</h2>
          <div>
            <label>
              Message to sign:
              <br />
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: "300px",
                  padding: "8px",
                  margin: "8px 0",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>
          </div>
          <button onClick={handleSignMessage} disabled={isSigning || !message.trim()}>
            {isSigning ? "Signing..." : "Sign Message"}
          </button>
        </div>
      )}

      {signResult && (
        <div className="result">
          <h3>✅ Signature Result</h3>
          <p>
            <strong>Message:</strong> "{message}"
          </p>
          <p>
            <strong>Signature:</strong>
          </p>
          <code style={{ wordBreak: "break-all", fontSize: "12px" }}>{signResult}</code>
        </div>
      )}

      {(error || signError) && (
        <div className="error">
          <h3>❌ Error</h3>
          <p>{error || signError?.message}</p>
        </div>
      )}

      <div className="status">
        <h3>How it works</h3>
        <ol style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
          <li>Our custom Phantom connector implements the EIP-1193 interface</li>
          <li>
            The connector uses the Phantom SDK's <code>sdk.ethereum</code> provider
          </li>
          <li>wagmi treats it as a standard Ethereum wallet</li>
          <li>
            <code>useSignMessage</code> calls our provider's <code>signPersonalMessage</code>
          </li>
          <li>The signature is returned in standard format compatible with wagmi</li>
        </ol>
      </div>
    </div>
  );
}
