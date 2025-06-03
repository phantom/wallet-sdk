import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSignIn,
  useSignAndSendTransaction,
  useSignMessage,
  useAccount,
  useAccountEffect,
} from "@phantom/react-sdk/solana";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";

export function Actions() {
  const userAddress = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signIn } = useSignIn();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signMessage } = useSignMessage();

  useAccountEffect({
    onConnect: data => {
      // eslint-disable-next-line no-console
      console.log("Connected to Phantom with public key:", data.publicKey);
    },
    onDisconnect: () => {
      // eslint-disable-next-line no-console
      console.log("Disconnected from Phantom");
    },
    onAccountChanged: data => {
      // eslint-disable-next-line no-console
      console.log("Account changed to:", data.publicKey);
    },
  });

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
    if (!userAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      // Example sign-in data. Adjust according to your dApp's requirements.
      const signInData = {
        domain: window.location.host,
        address: userAddress,
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
    if (!userAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const message = new TextEncoder().encode("Hello from Phantom React SDK Demo!");
      const result = await signMessage(message);
      alert(`Message Signed! Signature: ${result.signature}, Public Key: ${result.address}`);
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!userAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const rpc = createSolanaRpc("https://solana-mainnet.g.alchemy.com/v2/Pnb7lrjdZw6df2yXSKDiG");

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(address(userAddress), tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      );

      const transaction = compileTransaction(transactionMessage);

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
          <strong>Account Public Key:</strong> {userAddress}
        </p>
      </div>
      <div className="controls">
        <button id="connectBtn" onClick={onConnect}>
          Connect
        </button>
        <button id="signInBtn" onClick={onSignIn} disabled={!userAddress}>
          Sign In (SIWS)
        </button>
        <button id="signMessageBtn" onClick={onSignMessage} disabled={!userAddress}>
          Sign Message
        </button>
        <button id="signAndSendTransactionBtn" onClick={onSignAndSendTransaction} disabled={!userAddress}>
          Sign and Send Transaction
        </button>
        <button id="disconnectBtn" onClick={onDisconnect} disabled={!userAddress}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
