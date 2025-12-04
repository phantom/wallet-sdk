import "./Actions.css";
import {
  useConnect,
  useDisconnect,
  useSolana,
  useEthereum,
  useAccounts,
  usePhantom,
  useAutoConfirm,
  NetworkId,
  ConnectButton,
  ConnectBox,
} from "@phantom/react-sdk";
import {
  SystemProgram,
  PublicKey,
  Connection,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  StakeProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { parseEther, parseGwei, numberToHex } from "viem";
import { useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { useBalance } from "./hooks/useBalance";

export function SDKActions() {
  const { connect, isConnecting, isLoading, error: connectError } = useConnect();
  const { disconnect, isDisconnecting } = useDisconnect();
  const { solana, isAvailable: isSolanaAvailable } = useSolana();
  const { ethereum, isAvailable: isEthereumAvailable } = useEthereum();
  const { isConnected, user } = usePhantom();
  const autoConfirm = useAutoConfirm();
  const addresses = useAccounts();
  const [isSigningMessageType, setIsSigningMessageType] = useState<"solana" | "evm" | null>(null);
  const [isSigningTypedData, setIsSigningTypedData] = useState(false);
  const [isSigningOnlyTransaction, setIsSigningOnlyTransaction] = useState<"solana" | "ethereum" | null>(null);
  const [isSigningDeniedProgramTx, setIsSigningDeniedProgramTx] = useState(false);
  const [isSigningAndSendingTransaction, setIsSigningAndSendingTransaction] = useState(false);
  const [isSendingEthTransaction, setIsSendingEthTransaction] = useState(false);
  const [isSigningAllTransactions, setIsSigningAllTransactions] = useState(false);
  const [isSendingTokens, setIsSendingTokens] = useState(false);
  const [isStakingSol, setIsStakingSol] = useState(false);
  const [isSendingCustomSol, setIsSendingCustomSol] = useState(false);
  const [customSolAmount, setCustomSolAmount] = useState("");
  const [customSolDestination, setCustomSolDestination] = useState("8dvUxPRHyHGw9W68yP73GkXCjBCjRJuLrANj9n1SXRGb");
  const [isSendingEthMainnet, setIsSendingEthMainnet] = useState(false);
  const [isSendingPolygon, setIsSendingPolygon] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const solanaAddress = addresses?.find(addr => addr.addressType === "Solana")?.address || null;
  const ethereumAddress = addresses?.find(addr => addr.addressType === "Ethereum")?.address || null;

  // Use balance hook
  const {
    balance: solanaBalance,
    loading: solanaBalanceLoading,
    error: solanaBalanceError,
    refetch: refetchSolanaBalance,
  } = useBalance(solanaAddress);
  const hasSolanaBalance = solanaBalance !== null && solanaBalance > 0;

  const onConnectInjected = async () => {
    try {
      await connect({
        provider: "injected",
      });
    } catch (error) {
      console.error("Error connecting to injected provider:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onConnectWithGoogle = async () => {
    try {
      // Connect with Google auth provider
      await connect({
        provider: "google",
      });
    } catch (error) {
      console.error("Error connecting with Google:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  // Attempt to sign a Solana transaction with a program ID that is NOT in the allowlist
  const onSignDeniedProgramTransaction = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsSigningDeniedProgramTx(true);
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);
      const { blockhash } = await connection.getLatestBlockhash();

      // Generate a random program id to ensure it's outside the allowlist
      const disallowedProgramId = Keypair.generate().publicKey;

      const disallowedIx = new TransactionInstruction({
        programId: disallowedProgramId,
        keys: [],
        data: Buffer.alloc(0),
      });

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: [disallowedIx],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const result = await solana.signAndSendTransaction(transaction);
      if (!result) {
        alert("Solana chain not available");
        return;
      }
      alert("Transaction sent (unexpected). If using KMS policy, this should be denied.");
    } catch (error) {
      console.error("Expected denial when signing with disallowed program:", error);
      alert(`Denied as expected: ${(error as Error).message || error}`);
    } finally {
      setIsSigningDeniedProgramTx(false);
    }
  };

  const onConnectWithPhantom = async () => {
    try {
      // Connect with Phantom auth provider (uses extension)
      await connect({
        provider: "phantom",
      });
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
      alert(`Error connecting: ${(error as Error).message || error}`);
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert(`Error disconnecting: ${(error as Error).message || error}`);
    }
  };

  const onSignMessage = async (type: "solana" | "evm") => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningMessageType(type);
      if (type === "solana") {
        if (!isSolanaAvailable) {
          alert("Solana chain not available. The selected wallet does not support Solana.");
          return;
        }
        const result = await solana.signMessage("Hello from Phantom SDK!");
        if (!result) {
          alert("Solana chain not available");
          return;
        }
        alert(`Message Signed! Signature: ${bs58.encode(result.signature)}`);
      } else {
        if (!isEthereumAvailable) {
          alert("Ethereum chain not available. The selected wallet does not support Ethereum.");
          return;
        }
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }
        const message = "Hello from Phantom SDK!";
        const prefixedMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
        const result = await ethereum.signPersonalMessage(prefixedMessage, ethAddress.address);
        if (!result) {
          alert("Ethereum chain not available");
          return;
        }
        alert(`Message Signed! Signature: ${result}`);
      }
    } catch (error) {
      console.error("Error signing message:", error);
      alert(`Error signing message: ${(error as Error).message || error}`);
    } finally {
      setIsSigningMessageType(null);
    }
  };

  const onSignTypedData = async () => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isEthereumAvailable) {
      alert("Ethereum chain not available. The selected wallet does not support Ethereum.");
      return;
    }

    const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
    if (!ethAddress) {
      alert("No Ethereum address found");
      return;
    }

    try {
      setIsSigningTypedData(true);

      // Example typed data structure (EIP-712)
      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        message: {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: ethAddress.address,
          },
          contents: "Hello, Bob! This is a typed data message from Phantom React SDK Demo.",
        },
      };

      const result = await ethereum.signTypedData(typedData, ethAddress.address);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`Typed Data Signed! Signature: ${result}`);
    } catch (error) {
      console.error("Error signing typed data:", error);
      alert(`Error signing typed data: ${(error as Error).message || error}`);
    } finally {
      setIsSigningTypedData(false);
    }
  };

  const onSignTransaction = async (type: "solana" | "ethereum") => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setIsSigningOnlyTransaction(type);
      if (type === "solana") {
        if (!isSolanaAvailable) {
          alert("Solana chain not available. The selected wallet does not support Solana.");
          return;
        }
        if (!solanaAddress) {
          alert("No Solana address found");
          return;
        }
        // Create connection to get recent blockhash (using environment RPC URL)
        const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // Create a versioned transaction message
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaAddress),
          toPubkey: new PublicKey(solanaAddress), // Self-transfer for demo
          lamports: 3500000, //  small amount: 0.0035 SOL
        });

        const messageV0 = new TransactionMessage({
          payerKey: new PublicKey(solanaAddress),
          recentBlockhash: blockhash,
          instructions: [transferInstruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        const result = await solana.signTransaction(transaction);
        if (!result) {
          alert("Solana chain not available");
          return;
        }
        alert(`Transaction signed! Signature: ${JSON.stringify(result)}`);
      } else {
        // Ethereum
        if (!isEthereumAvailable) {
          alert("Ethereum chain not available. The selected wallet does not support Ethereum.");
          return;
        }
        const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
        if (!ethAddress) {
          alert("No Ethereum address found");
          return;
        }

        // Create simple ETH transfer with proper hex formatting
        const transactionParams = {
          from: ethAddress.address,
          to: ethAddress.address, // Self-transfer for demo
          value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
          gas: numberToHex(21000n), // Gas limit in hex
          gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
          chainId: numberToHex(11155111), // Sepolia testnet
        };

        const result = await ethereum.signTransaction(transactionParams);
        if (!result) {
          alert("Ethereum chain not available");
          return;
        }
        alert(`Transaction signed! Signature: ${result}`);
      }
    } catch (error) {
      console.error("Error signing transaction:", error);
      alert(`Error signing transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningOnlyTransaction(null);
    }
  };

  const onSignAndSendTransaction = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsSigningAndSendingTransaction(true);
      // Create connection to get recent blockhash (using environment RPC URL)
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a versioned transaction message
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: new PublicKey(solanaAddress), // Self-transfer for demo
        lamports: 1000, // Very small amount: 0.000001 SOL
      });

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      try {
        const result = await solana.signAndSendTransaction(transaction);
        if (!result) {
          alert("Solana chain not available");
          return;
        }

        alert(`Transaction sent! Signature: ${result.signature}`);
      } catch (error) {
        console.error("Error signing and sending transaction:", error);
        alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
      }
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      alert(`Error signing and sending transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSigningAndSendingTransaction(false);
    }
  };

  const onSendEthTransaction = async () => {
    if (!isConnected || !addresses || addresses.length === 0) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isEthereumAvailable) {
      alert("Ethereum chain not available. The selected wallet does not support Ethereum.");
      return;
    }

    const ethAddress = addresses.find(addr => addr.addressType === "Ethereum");
    if (!ethAddress) {
      alert("No Ethereum address found");
      return;
    }

    try {
      setIsSendingEthTransaction(true);

      // Create simple ETH transfer with proper hex formatting
      const transactionParams = {
        from: ethAddress.address,
        to: ethAddress.address, // Self-transfer for demo
        value: numberToHex(parseEther("0.001")), // 0.001 ETH in hex
        gas: numberToHex(21000n), // Gas limit in hex
        gasPrice: numberToHex(parseGwei("20")), // 20 gwei in hex
        chainId: numberToHex(11155111), // Sepolia testnet
      };

      const result = await ethereum.sendTransaction(transactionParams);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`Ethereum transaction sent! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending Ethereum transaction:", error);
      alert(`Error sending Ethereum transaction: ${(error as Error).message || error}`);
    } finally {
      setIsSendingEthTransaction(false);
    }
  };

  const onSignAllTransactions = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsSigningAllTransactions(true);
      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create 2 transactions for demo
      const transactions = [];
      for (let i = 0; i < 2; i++) {
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaAddress),
          toPubkey: new PublicKey(solanaAddress), // Self-transfer for demo
          lamports: 1000 + i, // Slightly different amounts: 0.000001 and 0.000002 SOL
        });

        const messageV0 = new TransactionMessage({
          payerKey: new PublicKey(solanaAddress),
          recentBlockhash: blockhash,
          instructions: [transferInstruction],
        }).compileToV0Message();

        transactions.push(new VersionedTransaction(messageV0));
      }

      const results = await solana.signAllTransactions(transactions);
      if (!results) {
        alert("Solana chain not available");
        return;
      }
      // Note: Results may show as {} in JSON.stringify because they only have serialize() methods
      // But the transactions are valid and can be used
      alert(`All transactions signed! ${results.length} transaction(s) ready.`);
    } catch (error) {
      console.error("Error signing all transactions:", error);
      alert(`Error signing all transactions: ${(error as Error).message || error}`);
    } finally {
      setIsSigningAllTransactions(false);
    }
  };

  const onSendTokens = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsSendingTokens(true);

      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Target address (user-provided)
      let targetAddress: PublicKey;
      try {
        targetAddress = new PublicKey(customSolDestination);
      } catch (e) {
        alert("Please enter a valid Solana address for the destination.");
        return;
      }

      // USDC mint address (mainnet)
      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

      const instructions = [];

      // 1. SOL transfer (0.0001 SOL = 100,000 lamports)
      const solTransferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: targetAddress,
        lamports: 100000, // 0.0001 SOL
      });
      instructions.push(solTransferInstruction);

      // 2. USDC transfer (0.0001 USDC = 100 micro-USDC, since USDC has 6 decimals)
      try {
        // Get the sender's USDC token account
        const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(solanaAddress));

        // Get the receiver's USDC token account
        const receiverTokenAccount = await getAssociatedTokenAddress(usdcMint, targetAddress);

        // Check if sender has USDC token account
        try {
          await getAccount(connection, senderTokenAccount);
        } catch (error) {
          alert("You don't have a USDC token account. Please acquire some USDC first.");
          return;
        }

        // Create USDC transfer instruction
        const usdcTransferInstruction = createTransferInstruction(
          senderTokenAccount,
          receiverTokenAccount,
          new PublicKey(solanaAddress),
          100, // 0.0001 USDC (6 decimals)
          [], // multiSigners array
          TOKEN_PROGRAM_ID,
        );
        instructions.push(usdcTransferInstruction);
      } catch (error) {
        // USDC transfer setup failed - proceeding with SOL transfer only
        alert("Failed to setup USDC transfer. Proceeding with SOL transfer only.");
      }

      // Create transaction message
      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Sign and send transaction
      const result = await solana.signAndSendTransaction(transaction);
      if (!result) {
        alert("Solana chain not available");
        return;
      }

      alert(`Tokens sent! Transaction signature: ${result.signature}`);

      // Refresh balance after successful transaction
      refetchSolanaBalance();
    } catch (error) {
      console.error("Error sending tokens:", error);
      alert(`Error sending tokens: ${(error as Error).message || error}`);
    } finally {
      setIsSendingTokens(false);
    }
  };

  const onStakeSol = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsStakingSol(true);

      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Amount to stake: 0.0025 SOL = 2,500,000 lamports
      const stakeAmount = 0.0025 * LAMPORTS_PER_SOL;

      // Generate a new stake account keypair
      const stakeAccountKeypair = Keypair.generate();

      // Use a well-known validator VOTE account (not identity account!)
      // Using Everstake's vote account which is active and reliable on mainnet
      const validatorVoteAccount = new PublicKey("26pV97Ce83ZQ6Kz9XT4td8tdoUFPTng8Fb8gPyc53dJx");

      // Get minimum balance for rent exemption
      const rentExemption = await connection.getMinimumBalanceForRentExemption(200); // Stake account size

      const instructions = [];

      // Add compute budget instructions (optional but helps with priority)
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 600000,
        }),
      );
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1,
        }),
      );

      // Create stake account instruction
      const userPublicKey = new PublicKey(solanaAddress);

      const createStakeAccountInstruction = SystemProgram.createAccount({
        fromPubkey: userPublicKey,
        newAccountPubkey: stakeAccountKeypair.publicKey,
        lamports: stakeAmount + rentExemption,
        space: 200, // Standard stake account size
        programId: StakeProgram.programId,
      });
      instructions.push(createStakeAccountInstruction);

      // Initialize stake account instruction
      const initializeStakeInstruction = StakeProgram.initialize({
        stakePubkey: stakeAccountKeypair.publicKey,
        authorized: {
          staker: userPublicKey,
          withdrawer: userPublicKey,
        },
      });
      instructions.push(initializeStakeInstruction);

      // Delegate stake instruction
      const delegateStakeTransaction = StakeProgram.delegate({
        stakePubkey: stakeAccountKeypair.publicKey,
        authorizedPubkey: userPublicKey,
        votePubkey: validatorVoteAccount,
      });
      // Extract the instructions from the delegate transaction
      instructions.push(...delegateStakeTransaction.instructions);

      // Create transaction message
      const messageV0 = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Pre-sign the transaction with the stake account keypair
      transaction.sign([stakeAccountKeypair]);

      // Sign and send transaction (Phantom will add user's signature)
      const result = await solana.signAndSendTransaction(transaction);
      if (!result) {
        alert("Transaction was rejected or Solana chain not available");
        return;
      }

      alert(`SOL staked successfully! Transaction signature: ${result.signature}`);

      // Refresh balance after successful transaction
      refetchSolanaBalance();
    } catch (error) {
      console.error("Error staking SOL:", error);
      alert(`Error staking SOL: ${(error as Error).message || error}`);
    } finally {
      setIsStakingSol(false);
    }
  };

  const onSendCustomSol = async () => {
    if (!isConnected || !solanaAddress || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }

    // Validate input
    const amount = parseFloat(customSolAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid SOL amount greater than 0.");
      return;
    }

    try {
      setIsSendingCustomSol(true);

      // Create connection to get recent blockhash
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Validate recipient address
      if (!customSolDestination || customSolDestination.trim() === "") {
        alert("Please enter a destination Solana address.");
        return;
      }

      let targetAddress: PublicKey;
      try {
        targetAddress = new PublicKey(customSolDestination.trim());
      } catch (error) {
        alert("Invalid Solana address. Please enter a valid address.");
        return;
      }

      // Convert SOL to lamports
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: targetAddress,
        lamports: lamports,
      });

      // Create transaction message
      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Try to switch to mainnet first (for wallets like Solflare that need explicit chain switching)
      try {
        await solana.switchNetwork("mainnet");
      } catch (error) {
        // Ignore switch network errors - some wallets don't support it or are already on mainnet
        console.error("Note: Could not switch network (may already be on mainnet):", error);
      }

      // Sign and send transaction
      const result = await solana.signAndSendTransaction(transaction);
      if (!result) {
        alert("Solana chain not available");
        return;
      }

      alert(`Sent ${amount} SOL! Transaction signature: ${result.signature}`);

      // Refresh balance after successful transaction
      refetchSolanaBalance();
    } catch (error) {
      console.error("Error sending custom SOL:", error);
      alert(`Error sending SOL: ${(error as Error).message || error}`);
    } finally {
      setIsSendingCustomSol(false);
    }
  };

  const onSendEthMainnet = async () => {
    if (!isConnected || !ethereumAddress || !isEthereumAvailable) {
      alert("Please connect your wallet first and ensure Ethereum is available.");
      return;
    }

    try {
      setIsSendingEthMainnet(true);

      // Create ETH transfer (0.00001 ETH to self)
      const transactionParams = {
        from: ethereumAddress,
        to: ethereumAddress, // Self-transfer
        value: numberToHex(parseEther("0.00001")), // 0.00001 ETH in hex
        chainId: numberToHex(1), // Ethereum mainnet
      };

      const result = await ethereum.sendTransaction(transactionParams);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`ETH transaction sent on Ethereum mainnet! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending ETH on mainnet:", error);
      alert(`Error sending ETH: ${(error as Error).message || error}`);
    } finally {
      setIsSendingEthMainnet(false);
    }
  };

  const onSendPolygon = async () => {
    if (!isConnected || !ethereumAddress || !isEthereumAvailable) {
      alert("Please connect your wallet first and ensure Ethereum is available.");
      return;
    }

    try {
      setIsSendingPolygon(true);

      // Create POL transfer (0.00001 POL to self) on Polygon mainnet
      const transactionParams = {
        from: ethereumAddress,
        to: ethereumAddress, // Self-transfer
        value: numberToHex(parseEther("0.00001")), // 0.00001 POL in hex
        chainId: numberToHex(137), // Polygon mainnet
      };

      const result = await ethereum.sendTransaction(transactionParams);
      if (!result) {
        alert("Ethereum chain not available");
        return;
      }
      alert(`POL transaction sent on Polygon mainnet! Hash: ${result}`);
    } catch (error) {
      console.error("Error sending POL on Polygon:", error);
      alert(`Error sending POL: ${(error as Error).message || error}`);
    } finally {
      setIsSendingPolygon(false);
    }
  };

  // Auto-confirm handlers
  const onEnableAutoConfirm = async () => {
    try {
      const result = await autoConfirm.enable({
        chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET],
      });
      alert(`Auto-confirm enabled for ${result.chains.length} chains!`);
    } catch (error) {
      console.error("Error enabling auto-confirm:", error);
      alert(`Error enabling auto-confirm: ${(error as Error).message || error}`);
    }
  };

  const onDisableAutoConfirm = async () => {
    try {
      await autoConfirm.disable();
      alert("Auto-confirm disabled!");
    } catch (error) {
      console.error("Error disabling auto-confirm:", error);
      alert(`Error disabling auto-confirm: ${(error as Error).message || error}`);
    }
  };

  const onSwitchToSolanaMainnet = async () => {
    if (!isConnected || !isSolanaAvailable) {
      alert("Please connect your wallet first and ensure Solana is available.");
      return;
    }
    try {
      setIsSwitchingNetwork(true);
      await solana.switchNetwork("mainnet");
      alert("Switched to Solana mainnet!");
    } catch (error) {
      console.error("Error switching network:", error);
      alert(`Error switching network: ${(error as Error).message || error}`);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  return (
    <>
      <div className="section">
        <h3>Connection Status</h3>
        <div className="status-card">
          <div className="status-row">
            <span className="status-label">Status:</span>
            <span className={`status-value ${isConnected ? "connected" : "disconnected"}`}>
              {isConnected ? "Connected" : "Not Connected"}
            </span>
          </div>

          {isConnected && user && (
            <div className="status-row">
              <span className="status-label">Auth Provider:</span>
              <span className="status-value">{user.authProvider}</span>
            </div>
          )}
          {user && (
            <div className="status-row">
              <span className="status-label">User ID:</span>
              <span className="status-value">{user.authUserId ?? "Undefined"}</span>
            </div>
          )}
          {addresses &&
            addresses.map((address, index) => (
              <div key={index} className="status-row">
                <span className="status-label">{address.addressType}:</span>
                <span className="status-value address">{address.address}</span>
              </div>
            ))}
          {addresses && addresses.length > 1 && (
            <div className="status-row">
              <span className="status-label">Total:</span>
              <span className="status-value">{addresses.length} addresses</span>
            </div>
          )}
        </div>

        {isConnected && (
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              ConnectButton (click to open wallet modal):
            </h4>
            <ConnectButton fullWidth />
          </div>
        )}
      </div>

      {!isConnected && isLoading && (
        <div className="section">
          <h3>Initializing SDK...</h3>
          <div className="status-card">
            <p>Loading Phantom SDK...</p>
          </div>
        </div>
      )}

      {!isConnected && !isLoading && (
        <div className="section">
          <h3>Connection Options</h3>
          <div className="button-group">
            <button className="primary" onClick={onConnectWithPhantom} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Login with Phantom"}
            </button>
            <button className="primary" onClick={onConnectWithGoogle} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect with Google"}
            </button>
            <button className="primary" onClick={onConnectInjected} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Injected"}
            </button>
          </div>
          {connectError && <p className="error-text">Error: {connectError.message}</p>}

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              Or use the ConnectButton component:
            </h4>
            <ConnectButton fullWidth />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              Or use the ConnectBox component:
            </h4>
            <ConnectBox maxWidth="500px" />
          </div>
        </div>
      )}

      {isConnected && solanaAddress && (
        <div className="section">
          <h3>SOL Balance</h3>
          <div className="balance-card">
            <div className="balance-row">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">
                {solanaBalanceLoading
                  ? "Loading..."
                  : solanaBalanceError
                    ? "Error"
                    : solanaBalance !== null
                      ? `${solanaBalance.toFixed(4)} SOL`
                      : "--"}
              </span>
            </div>
            <button className="small" onClick={() => refetchSolanaBalance()} disabled={solanaBalanceLoading}>
              {solanaBalanceLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {solanaBalanceError && <p className="error-text">Balance error: {solanaBalanceError}</p>}
        </div>
      )}

      {isConnected && user?.authProvider === "injected" && (
        <div className="section">
          <h3>Auto-Confirm Settings</h3>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className={`status-value ${autoConfirm.status?.enabled ? "connected" : "disconnected"}`}>
                {autoConfirm.isLoading ? "Loading..." : autoConfirm.status?.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {autoConfirm.status?.enabled && autoConfirm.status.chains.length > 0 && (
              <div className="status-row">
                <span className="status-label">Active Chains:</span>
                <span className="status-value">{autoConfirm.status.chains.length}</span>
              </div>
            )}
            {autoConfirm.supportedChains && autoConfirm.supportedChains.chains.length > 0 && (
              <div className="status-row">
                <span className="status-label">Supported:</span>
                <span className="status-value">{autoConfirm.supportedChains.chains.length} chains</span>
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              onClick={onEnableAutoConfirm}
              disabled={autoConfirm.isLoading || autoConfirm.status?.enabled}
              className="small"
            >
              {autoConfirm.isLoading ? "Loading..." : "Enable Auto-Confirm"}
            </button>
            <button
              onClick={onDisableAutoConfirm}
              disabled={autoConfirm.isLoading || !autoConfirm.status?.enabled}
              className="small"
            >
              {autoConfirm.isLoading ? "Loading..." : "Disable Auto-Confirm"}
            </button>
            <button onClick={autoConfirm.refetch} disabled={autoConfirm.isLoading} className="small">
              {autoConfirm.isLoading ? "Loading..." : "Refresh Status"}
            </button>
          </div>

          {autoConfirm.error && <p className="error-text">Auto-confirm error: {autoConfirm.error.message}</p>}
        </div>
      )}

      {isConnected && (
        <div className="section">
          <h3>Wallet Operations</h3>
          <div className="button-group">
            <button
              onClick={() => onSignMessage("solana")}
              disabled={!isConnected || isSigningMessageType === "solana"}
            >
              {isSigningMessageType === "solana" ? "Signing..." : "Sign Message (Solana)"}
            </button>
            <button onClick={() => onSignMessage("evm")} disabled={!isConnected || isSigningMessageType === "evm"}>
              {isSigningMessageType === "evm" ? "Signing..." : "Sign Message (EVM)"}
            </button>
            <button onClick={onSignTypedData} disabled={!isConnected || isSigningTypedData}>
              {isSigningTypedData ? "Signing..." : "Sign Typed Data (EVM)"}
            </button>
            <button
              onClick={() => onSignTransaction("solana")}
              disabled={!isConnected || isSigningOnlyTransaction === "solana" || !hasSolanaBalance}
            >
              {isSigningOnlyTransaction === "solana"
                ? "Signing..."
                : !hasSolanaBalance
                  ? "Insufficient SOL Balance (need > 0)"
                  : "Sign Transaction (Solana)"}
            </button>
            <button
              onClick={onSignDeniedProgramTransaction}
              disabled={!isConnected || isSigningDeniedProgramTx || !solanaAddress}
            >
              {isSigningDeniedProgramTx ? "Signing & Sending..." : "Try Sign & Send Tx (Disallowed Program)"}
            </button>
            <button
              onClick={() => onSignTransaction("ethereum")}
              disabled={!isConnected || isSigningOnlyTransaction === "ethereum"}
            >
              {isSigningOnlyTransaction === "ethereum" ? "Signing..." : "Sign Transaction (Ethereum)"}
            </button>
            <button
              onClick={onSignAndSendTransaction}
              disabled={!isConnected || isSigningAndSendingTransaction || !hasSolanaBalance}
            >
              {isSigningAndSendingTransaction
                ? "Signing & Sending..."
                : !hasSolanaBalance
                  ? "Insufficient SOL Balance (need > 0)"
                  : "Sign & Send Transaction (Solana)"}
            </button>
            <button
              onClick={onSwitchToSolanaMainnet}
              disabled={!isConnected || isSwitchingNetwork || !isSolanaAvailable}
            >
              {isSwitchingNetwork ? "Switching..." : "Switch to Solana Mainnet"}
            </button>
            <button onClick={onSendEthTransaction} disabled={!isConnected || isSendingEthTransaction}>
              {isSendingEthTransaction ? "Sending..." : "Sign & Send Transaction (Ethereum)"}
            </button>
            <button onClick={onSendEthMainnet} disabled={!isConnected || isSendingEthMainnet}>
              {isSendingEthMainnet ? "Sending..." : "Send 0.00001 ETH (Mainnet)"}
            </button>
            <button onClick={onSendPolygon} disabled={!isConnected || isSendingPolygon}>
              {isSendingPolygon ? "Sending..." : "Send 0.00001 POL (Polygon)"}
            </button>
            <button
              onClick={onSignAllTransactions}
              disabled={!isConnected || isSigningAllTransactions || !hasSolanaBalance}
            >
              {isSigningAllTransactions
                ? "Signing All..."
                : !hasSolanaBalance
                  ? "Insufficient SOL Balance (need > 0)"
                  : "Sign All Transactions (Solana)"}
            </button>
            <button onClick={onSendTokens} disabled={!isConnected || isSendingTokens || !hasSolanaBalance}>
              {isSendingTokens
                ? "Sending Tokens..."
                : !hasSolanaBalance
                  ? "Insufficient SOL Balance (need > 0)"
                  : "Send 0.0001 SOL + 0.0001 USDC"}
            </button>
            <button onClick={onStakeSol} disabled={!isConnected || isStakingSol || !hasSolanaBalance}>
              {isStakingSol
                ? "Staking SOL..."
                : !hasSolanaBalance
                  ? "Insufficient SOL Balance (need > 0)"
                  : "Stake 0.0025 SOL"}
            </button>

            <div className="custom-sol-section">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter SOL amount"
                  value={customSolAmount}
                  onChange={e => setCustomSolAmount(e.target.value)}
                  className="sol-input"
                />
                <input
                  type="text"
                  placeholder="Destination Solana address"
                  value={customSolDestination}
                  onChange={e => setCustomSolDestination(e.target.value)}
                  className="sol-input"
                />
                <button
                  onClick={onSendCustomSol}
                  disabled={!isConnected || isSendingCustomSol || !hasSolanaBalance || !customSolAmount}
                  className="send-custom-sol-btn"
                >
                  {isSendingCustomSol
                    ? "Sending..."
                    : !hasSolanaBalance
                      ? "Insufficient SOL Balance (need > 0)"
                      : "Send Custom SOL"}
                </button>
              </div>
            </div>

            <button onClick={onDisconnect} disabled={!isConnected || isDisconnecting}>
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
