import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  useAccounts,
  useSignMessage,
  useSignAndSendTransaction,
  useDisconnect,
  NetworkId
} from '@phantom/react-native-sdk';

export default function WalletScreen() {
  const router = useRouter();
  const { isConnected, addresses, walletId } = useAccounts();
  const { signMessage, isSigning: isSigningMessage, error: signError } = useSignMessage();
  const { signAndSendTransaction, isSigning: isSigningTx, error: txError } = useSignAndSendTransaction();
  const { disconnect, isDisconnecting } = useDisconnect();

  const [messageToSign, setMessageToSign] = useState('Hello from Phantom React Native SDK Demo!');
  const [signedMessage, setSignedMessage] = useState<string | null>(null);

  // Redirect if not connected
  React.useEffect(() => {
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  const handleSignMessage = async () => {
    if (!messageToSign.trim()) {
      Alert.alert('Error', 'Please enter a message to sign');
      return;
    }

    try {
      const signature = await signMessage({
        message: messageToSign,
        networkId: NetworkId.SOLANA_MAINNET
      });
      
      setSignedMessage(signature);
      Alert.alert('Success', `Message signed successfully!\n\nSignature: ${signature.slice(0, 20)}...`);
    } catch (error) {
      Alert.alert('Error', `Failed to sign message: ${(error as Error).message}`);
    }
  };

  const handleSignTransaction = async () => {
    Alert.alert(
      'Demo Transaction', 
      'This would sign and send a transaction. In a real app, you would provide a transaction object.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Simulate', 
          onPress: async () => {
            try {
              // This is a demo - in a real app you'd have a proper transaction
              Alert.alert('Demo', 'Transaction signing simulation - not implemented in this demo');
            } catch (error) {
              Alert.alert('Error', `Failed to sign transaction: ${(error as Error).message}`);
            }
          }
        }
      ]
    );
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
              Alert.alert('Success', 'Wallet disconnected successfully');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', `Failed to disconnect: ${(error as Error).message}`);
            }
          }
        }
      ]
    );
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>Wallet not connected</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.replace('/')}
          >
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
              {walletId || 'N/A'}
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

        {/* Message Signing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign Message</Text>
          <Text style={styles.description}>
            Enter a message to sign with your wallet:
          </Text>
          
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
            onPress={handleSignMessage}
            disabled={isSigningMessage}
          >
            <Text style={styles.buttonText}>
              {isSigningMessage ? 'Signing...' : 'Sign Message'}
            </Text>
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
          <Text style={styles.description}>
            This demonstrates transaction signing capabilities:
          </Text>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSignTransaction}
            disabled={isSigningTx}
          >
            <Text style={[styles.buttonText, { color: '#6366f1' }]}>
              {isSigningTx ? 'Signing...' : 'Demo Transaction Signing'}
            </Text>
          </TouchableOpacity>
          
          {txError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{txError.message}</Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDisconnect}
            disabled={isDisconnecting}
          >
            <Text style={styles.buttonText}>
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  addressItem: {
    marginTop: 8,
    paddingLeft: 10,
  },
  addressType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  addressValue: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  textInput: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#6366f1',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});