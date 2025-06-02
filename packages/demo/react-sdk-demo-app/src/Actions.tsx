import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSignIn,
  useSignAndSendTransaction,
  useSignMessage,
  useAccount,
} from "@phantom/react-sdk/solana";
import { PublicKey, Transaction, SystemProgram, Connection } from "@solana/web3.js"; // Added for transaction creation

export function Actions() {
  const { publicKey, status } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signIn } = useSignIn();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signMessage } = useSignMessage();

  const onConnect = async () => {
    try {
      const connectResult = await connect();
      if (connectResult) {
        alert(`Connected to Phantom with public key: ${connectResult}`);
      } else {
        alert("Connected, but public key was not retrieved.");
      }
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onDisconnect = async () => {
    await disconnect();
    alert("Disconnected from Phantom");
  };

  const onSignIn = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      // Example sign-in data. Adjust according to your dApp's requirements.
      const signInData = {
        domain: window.location.host,
        address: publicKey,
        statement: "Sign in to the demo app.",
        // nonce: "oAuthNonce", // Optional: for preventing replay attacks
        // chainId: "mainnet-beta", // Optional: specify the chain
      };
      const result = await signIn(signInData);
      alert(
        `Signed In! Address: ${result.address}, Signature: ${
          result.signature
        }, Signed Message: ${result.signedMessage}`,
      );
    } catch (error) {
      console.error("Error signing in:", error);
      alert(`Error signing in: ${(error as Error).message || error}`);
    }
  };

  const onSignMessage = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const message = new TextEncoder().encode("Hello from Phantom React SDK Demo!");
      const result = await signMessage(message);
      alert(`Message Signed! Signature: ${result.signature}, Public Key: ${result.publicKey}`);
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const connection = new Connection("https://api.mainnet-beta.solana.com");

      const transaction = new Transaction({
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(publicKey),
          toPubkey: new PublicKey(publicKey), // Sending to self for demo
          lamports: 1000000, // 0.001 SOL
        }),
      );
      // Note: For the transaction to succeed, the connected wallet needs to have a provider
      // that can fetch recent blockhash and fee payer information.
      // The Phantom wallet provider handles this.
      const { signature } = await signAndSendTransaction(transaction);
      alert(`Transaction sent with signature: ${signature}`);
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    }
  };

  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>
      <div className="account-info">
        <p>
          <strong>Account Public Key:</strong> {publicKey}
        </p>
        <p>
          <strong>Account Status:</strong> {status}
        </p>
      </div>
      <div className="controls">
        <button id="connectBtn" onClick={onConnect}>
          Connect
        </button>
        <button id="signInBtn" onClick={onSignIn} disabled={!publicKey}>
          Sign In (SIWS)
        </button>
        <button id="signMessageBtn" onClick={onSignMessage} disabled={!publicKey}>
          Sign Message
        </button>
        <button id="signAndSendTransactionBtn" onClick={onSignAndSendTransaction} disabled={!publicKey}>
          Sign and Send Transaction
        </button>
        <button id="disconnectBtn" onClick={onDisconnect} disabled={!publicKey}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
