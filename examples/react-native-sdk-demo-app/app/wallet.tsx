import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAccounts, useSolana, useDisconnect } from "@phantom/react-native-sdk";
import { useBalance } from "../hooks/useBalance";
import bs58 from "bs58";

export default function WalletScreen() {
  const router = useRouter();
  const { isConnected, addresses, walletId } = useAccounts();
  const { solana } = useSolana();
  const { disconnect, isDisconnecting } = useDisconnect();
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isSigningTx, setIsSigningTx] = useState(false);
  const [signError, setSignError] = useState<Error | null>(null);
  const [txError, setTxError] = useState<Error | null>(null);

  const [messageToSign, setMessageToSign] = useState("Hello from Phantom SDK!");
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [transactionExplorer, setTransactionExplorer] = useState<string | null>(null);

  // Get Solana address for balance checking
  const solanaAddress = addresses?.find(addr => addr.addressType === "Solana")?.address || null;
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance(solanaAddress);
  const hasBalance = balance !== null && balance > 0;

  // Redirect if not connected
  React.useEffect(() => {
    if (!isConnected) {
      router.replace("/");
    }
  }, [isConnected, router]);

  const handleSignMessage = async () => {
    if (!messageToSign.trim()) {
      Alert.alert("Error", "Please enter a message to sign");
      return;
    }

    try {
      setIsSigningMessage(true);
      setSignError(null);
      if (!solana) throw new Error("Solana not available");
      const result = await solana.signMessage(messageToSign);

      const signatureString = bs58.encode(result.signature);
      setSignedMessage(signatureString);
      Alert.alert("Success", `Message signed successfully!\n\nSignature: ${signatureString.slice(0, 20)}...`);
    } catch (error) {
      const err = error as Error;
      setSignError(err);
      Alert.alert("Error", `Failed to sign message: ${err.message}`);
    } finally {
      setIsSigningMessage(false);
    }
  };

  const handleSignTransaction = async () => {
    if (!hasBalance) {
      Alert.alert("Error", "Insufficient balance to send transaction");
      return;
    }

    Alert.alert(
      "Send Transaction",
      "This will create a small self-transfer transaction (0.000001 SOL) to demonstrate signing and sending.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Transaction",
          onPress: async () => {
            try {
              setTransactionError(null);
              setTransactionResult(null);
              await sendTestTransaction();
            } catch (error) {
              setTransactionError(`Failed to sign transaction: ${(error as Error).message}`);
              setTransactionResult(null);
            }
          },
        },
      ],
    );
  };

  const sendTestTransaction = async () => {
    try {
      // Find Solana address
      const solanaAddress = addresses?.find(addr => addr.addressType === "Solana")?.address;
      if (!solanaAddress) {
        Alert.alert("Error", "No Solana address found");
        return;
      }

      // Import Solana web3.js components
      const { SystemProgram, PublicKey, Connection, VersionedTransaction, TransactionMessage } = await import(
        "@solana/web3.js"
      );

      // Create connection to get recent blockhash using environment variable
      const rpcUrl = process.env.EXPO_PUBLIC_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a self-transfer instruction (very small amount for demo)
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(solanaAddress),
        toPubkey: new PublicKey(solanaAddress), // Self-transfer
        lamports: 1000, // 0.000001 SOL
      });

      // Create versioned transaction
      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Sign and send the transaction
      setIsSigningTx(true);
      setTxError(null);
      if (!solana) throw new Error("Solana not available");
      const result = await solana.signAndSendTransaction(transaction);

      // Set success state
      setTransactionResult(`Transaction sent successfully!\n\nSignature: ${result.signature}`);
      setTransactionExplorer(null);
      setTransactionError(null);
      setIsSigningTx(false);

      // Refresh balance after successful transaction
      setTimeout(() => refetchBalance(), 2000);
    } catch (error) {
      console.error("Transaction error:", error);
      setIsSigningTx(false);
      const err = error as Error;
      setTxError(err);
      throw error;
    }
  };

  const handleOpenExplorer = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open block explorer URL");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to open URL: ${(error as Error).message}`);
    }
  };

  const handleDisconnect = () => {
    Alert.alert("Disconnect Wallet", "Are you sure you want to disconnect your wallet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          try {
            await disconnect();
            Alert.alert("Success", "Wallet disconnected successfully");
            router.replace("/");
          } catch (error) {
            Alert.alert("Error", `Failed to disconnect: ${(error as Error).message}`);
          }
        },
      },
    ]);
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>Wallet not connected</Text>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => router.replace("/")}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wallet Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Wallet ID:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {walletId || "N/A"}
            </Text>
          </View>

          <Text style={styles.infoLabel}>Addresses:</Text>
          {addresses && addresses.length > 0 ? (
            addresses.map((addr, index) => (
              <View key={index} style={styles.addressItem}>
                <Text style={styles.addressType}>{addr.addressType}:</Text>
                <Text style={styles.addressValue} numberOfLines={1}>
                  {addr.address}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.infoValue}>No addresses available</Text>
          )}
        </View>

        {/* SOL Balance Section */}
        {solanaAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOL Balance</Text>
            <View style={styles.balanceContainer}>
              <View style={styles.balanceDisplay}>
                <Text style={styles.balanceValue}>
                  {balanceLoading
                    ? "Loading..."
                    : balanceError
                      ? "Error"
                      : balance !== null
                        ? `${balance.toFixed(4)} SOL`
                        : "--"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.refreshButton]}
                onPress={() => refetchBalance()}
                disabled={balanceLoading}
              >
                <Text style={[styles.buttonText, { color: "#6366f1" }]}>
                  {balanceLoading ? "Loading..." : "Refresh"}
                </Text>
              </TouchableOpacity>
            </View>
            {balanceError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load balance: {balanceError}</Text>
              </View>
            )}
          </View>
        )}

        {/* Message Signing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign Message</Text>
          <Text style={styles.description}>Enter a message to sign with your wallet:</Text>

          <TextInput
            style={styles.textInput}
            value={messageToSign}
            onChangeText={setMessageToSign}
            placeholder="Enter message to sign..."
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => handleSignMessage()}
            disabled={isSigningMessage}
          >
            <Text style={styles.buttonText}>{isSigningMessage ? "Signing..." : "Sign Message"}</Text>
          </TouchableOpacity>

          {signedMessage && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Signature:</Text>
              <Text style={styles.resultValue} numberOfLines={3}>
                {signedMessage}
              </Text>
            </View>
          )}

          {signError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{signError.message}</Text>
            </View>
          )}
        </View>

        {/* Transaction Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign Transaction</Text>
          <Text style={styles.description}>This demonstrates transaction signing capabilities:</Text>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, !hasBalance && styles.disabledButton]}
            onPress={() => handleSignTransaction()}
            disabled={isSigningTx || !hasBalance}
          >
            <Text style={[styles.buttonText, { color: !hasBalance ? "#9ca3af" : "#6366f1" }]}>
              {isSigningTx ? "Signing..." : !hasBalance ? "Insufficient Balance" : "Demo Transaction Signing"}
            </Text>
          </TouchableOpacity>

          {txError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{txError.message}</Text>
            </View>
          )}

          {/* Transaction Result Display */}
          {transactionResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Transaction Result:</Text>
              <Text style={styles.resultValue} numberOfLines={6}>
                {transactionResult}
              </Text>
              {transactionExplorer && (
                <TouchableOpacity
                  style={[styles.button, styles.explorerButton]}
                  onPress={() => handleOpenExplorer(transactionExplorer)}
                >
                  <Text style={[styles.buttonText, { color: "#059669" }]}>View on Block Explorer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={() => {
                  setTransactionResult(null);
                  setTransactionError(null);
                  setTransactionExplorer(null);
                }}
              >
                <Text style={[styles.buttonText, { color: "#6366f1" }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Transaction Error Display */}
          {transactionError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{transactionError}</Text>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={() => {
                  setTransactionResult(null);
                  setTransactionError(null);
                }}
              >
                <Text style={[styles.buttonText, { color: "#ef4444" }]}>Clear Error</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Actions</Text>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={() => handleDisconnect()}
            disabled={isDisconnecting}
          >
            <Text style={styles.buttonText}>{isDisconnecting ? "Disconnecting..." : "Disconnect Wallet"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  addressItem: {
    marginTop: 8,
    paddingLeft: 10,
  },
  addressType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  addressValue: {
    fontSize: 12,
    color: "#374151",
    fontFamily: "monospace",
    marginTop: 2,
  },
  textInput: {
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    marginBottom: 15,
    textAlignVertical: "top",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderColor: "#6366f1",
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: "#ef4444",
  },
  disabledButton: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  refreshButton: {
    backgroundColor: "#ffffff",
    borderColor: "#6366f1",
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  clearButton: {
    backgroundColor: "#ffffff",
    borderColor: "#6366f1",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  explorerButton: {
    backgroundColor: "#ffffff",
    borderColor: "#059669",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceDisplay: {
    flex: 1,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
    fontFamily: "monospace",
  },
  resultContainer: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 12,
    color: "#166534",
    fontFamily: "monospace",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
});
