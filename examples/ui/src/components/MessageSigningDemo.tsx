import { useState } from "react";
import { 
  useAccounts,
  usePhantomUI,
  type SignMessageParams
} from "@phantom/react-ui";

export default function MessageSigningDemo() {
  const { addresses } = useAccounts();
  const { 
    messageState,
    signMessage,
    showMessageModal
  } = usePhantomUI();
  
  const [message, setMessage] = useState("Hello from Phantom React UI!");
  const [encoding, setEncoding] = useState<"utf8" | "hex">("utf8");
  const [lastSignature, setLastSignature] = useState<{
    signature: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = addresses.length > 0;

  const createSignMessageParams = (): SignMessageParams => {
    if (!addresses[0]) throw new Error("No account connected");

    return {
      message: encoding === "utf8" 
        ? new TextEncoder().encode(message)
        : new Uint8Array(
            message.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
          ),
      display: encoding,
    };
  };

  const handleShowModal = () => {
    try {
      const params = createSignMessageParams();
      showMessageModal(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create message params");
    }
  };

  const handleSignMessage = async () => {
    try {
      setError(null);
      const params = createSignMessageParams();
      const result = await signMessage(params);
      
      setLastSignature({
        signature: Array.from(result.signature)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        message: message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message signing failed");
    }
  };

  const handlePresetMessage = (preset: string) => {
    setMessage(preset);
    setEncoding("utf8");
  };

  return (
    <div className="demo-section">
      <h2>Message Signing Demo</h2>
      <p>
        Test message signing with different message formats and encodings.
      </p>

      {!isConnected && (
        <div style={{ 
          padding: "1rem", 
          background: "#fff3cd", 
          border: "1px solid #ffeaa7", 
          borderRadius: "6px",
          marginBottom: "2rem" 
        }}>
          Please connect your wallet first to test message signing.
        </div>
      )}

      <div className="config-section">
        <h3>Message Configuration</h3>
        <div className="config-options">
          <label>
            Message:
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to sign"
              disabled={!isConnected}
              rows={3}
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #ccc", 
                borderRadius: "4px",
                resize: "vertical",
                fontFamily: "monospace"
              }}
            />
          </label>
          
          <label>
            Encoding:
            <select 
              value={encoding}
              onChange={(e) => setEncoding(e.target.value as "utf8" | "hex")}
              disabled={!isConnected}
            >
              <option value="utf8">UTF-8 Text</option>
              <option value="hex">Hex String</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <strong>Presets:</strong>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <button 
              onClick={() => handlePresetMessage("Hello from Phantom!")}
              disabled={!isConnected}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
            >
              Simple Greeting
            </button>
            <button 
              onClick={() => handlePresetMessage(JSON.stringify({ action: "login", timestamp: Date.now() }))}
              disabled={!isConnected}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
            >
              JSON Login
            </button>
            <button 
              onClick={() => handlePresetMessage("Sign this message to verify your identity on our platform")}
              disabled={!isConnected}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
            >
              Identity Verification
            </button>
          </div>
        </div>
      </div>

      <div className="demo-controls">
        <button 
          onClick={handleShowModal}
          disabled={!isConnected}
        >
          Show Message Modal
        </button>
        
        <button 
          onClick={handleSignMessage}
          disabled={!isConnected}
          className="secondary"
        >
          Sign Message (Direct)
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: "1rem", 
          background: "#f8d7da", 
          border: "1px solid #f5c6cb", 
          borderRadius: "6px",
          marginTop: "1rem",
          color: "#721c24"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {lastSignature && (
        <div style={{ 
          padding: "1rem", 
          background: "#d4edda", 
          border: "1px solid #c3e6cb", 
          borderRadius: "6px",
          marginTop: "1rem",
          color: "#155724"
        }}>
          <strong>Message Signed Successfully!</strong><br />
          <strong>Original Message:</strong> <code>{lastSignature.message}</code><br />
          <strong>Signature:</strong> <code style={{ wordBreak: "break-all" }}>{lastSignature.signature}</code>
        </div>
      )}

      <div className="status-display">
        <h3>Message Signing State</h3>
        <pre>{JSON.stringify({
          modalState: {
            isVisible: messageState.isVisible,
            isLoading: messageState.isLoading,
            error: messageState.error?.message,
            hasParams: !!messageState.params,
          },
          currentConfig: {
            message,
            encoding,
            messageLength: message.length,
            encodedLength: encoding === "utf8" 
              ? new TextEncoder().encode(message).length
              : Math.ceil(message.length / 2),
          },
          signerAddress: addresses[0]?.address,
        }, null, 2)}</pre>
      </div>
    </div>
  );
}