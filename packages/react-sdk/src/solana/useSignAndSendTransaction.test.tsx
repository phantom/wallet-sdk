import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { useSignAndSendTransaction } from "./useSignAndSendTransaction";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";
import type { Transaction } from "@solana/kit";

const mockTransaction = {} as Transaction; // Using a simple mock for Transaction
const mockSignatureString = "mockTransactionSignature";
const mockPublicKeyString = "mockPublicKey";
const solanaPlugin = createSolanaPlugin();

const mockSolanaProvider = {
  ...solanaPlugin.create(),
  signAndSendTransaction: jest
    .fn()
    .mockResolvedValue({ signature: mockSignatureString, publicKey: mockPublicKeyString }),
};

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider
      config={{
        chainPlugins: [
          {
            name: "solana",
            create: () => {
              return mockSolanaProvider;
            },
          },
        ],
      }}
    >
      {children}
    </PhantomProvider>
  ),
};
describe("useSignAndSendTransaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
  });

  it("should throw error when solana chain plugin is not properly configured", async () => {
    const { result } = renderHook(() => useSignAndSendTransaction(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });
    await act(async () => {
      await expect(result.current.signAndSendTransaction(mockTransaction)).rejects.toThrow(
        "Phantom Solana provider not available.",
      );
    });
  });

  it("should successfully sign and send a transaction when phantom.solana.signAndSendTransaction is available", async () => {
    const mockSignAndSendResult = { signature: mockSignatureString, publicKey: mockPublicKeyString };

    const { result } = renderHook(() => useSignAndSendTransaction(), sharedConfig);
    let response;
    await act(async () => {
      response = await result.current.signAndSendTransaction(mockTransaction);
    });

    expect(mockSolanaProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(response).toEqual(mockSignAndSendResult);
  });

  it("should attempt to connect if provider is not connected, then sign and send", async () => {
    const mockSignAndSendResult = { signature: mockSignatureString, publicKey: mockPublicKeyString };

    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signAndSendTransaction: jest.fn().mockResolvedValue(mockSignAndSendResult),
        isConnected: false, // Initially not connected
        connect: jest.fn().mockImplementation(async () => {
          // @ts-expect-error - window.phantom is not typed
          window.phantom.solana.isConnected = true; // Simulate successful connection
          return Promise.resolve(mockPublicKeyString);
        }),
      },
    };

    const { result } = renderHook(() => useSignAndSendTransaction(), sharedConfig);
    let response;
    await act(async () => {
      response = await result.current.signAndSendTransaction(mockTransaction);
    });

    expect(mockSolanaProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(response).toEqual(mockSignAndSendResult);
  });
});
