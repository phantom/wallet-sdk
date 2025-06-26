import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { useSignIn } from "./useSignIn";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";
import type { SolanaSignInData } from "@phantom/browser-sdk/solana";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ plugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

const mockSignInData: SolanaSignInData = { domain: "example.com", address: "mockAddress" };
const mockPublicKeyString = "mockPublicKey";
const mockSignature = new Uint8Array([1, 2, 3]);
const mockSignedMessage = new Uint8Array([4, 5, 6]);

describe("useSignIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
  });

  it("should throw error when solana plugin is not properly configured", async () => {
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });

    await act(async () => {
      await expect(result.current.signIn(mockSignInData)).rejects.toThrow("Phantom Solana provider not available.");
    });
  });

  it("should throw error when phantom provider is not available (window.phantom is undefined)", async () => {
    const { result } = renderHook(() => useSignIn(), sharedConfig);
    await act(async () => {
      await expect(result.current.signIn(mockSignInData)).rejects.toThrow("Provider not found.");
    });
  });

  it("should throw error when phantom.solana is not available", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {}; // Phantom is present, but window.phantom.solana is not
    const { result } = renderHook(() => useSignIn(), sharedConfig);
    await act(async () => {
      // Expecting SDK error
      await expect(result.current.signIn(mockSignInData)).rejects.toThrow("Provider not found.");
    });
  });

  it("should successfully sign in when phantom.solana.signIn is available", async () => {
    // This is the result the hook should return (address as string)
    const mockHookResult = {
      address: mockPublicKeyString,
      signature: mockSignature,
      signedMessage: mockSignedMessage,
    };
    // This is what the provider's signIn method should return (address as string)
    const mockProviderRawResult = {
      address: mockPublicKeyString,
      signature: mockSignature,
      signedMessage: mockSignedMessage,
    };

    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signIn: jest.fn().mockResolvedValue(mockProviderRawResult),
        // signIn in SDK doesn't check isConnected, so not strictly needed here
        // isConnected: true,
        // connect: jest.fn().mockResolvedValue({ publicKey: actualMockPublicKeyObject }),
      },
    };

    const { result } = renderHook(() => useSignIn(), sharedConfig);

    let signInResponse;
    await act(async () => {
      signInResponse = await result.current.signIn(mockSignInData);
    });

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(signInResponse).toEqual(mockHookResult);
  });

  it("should throw an error if phantom.solana.signIn is not a function", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signIn: "not-a-function", // This will cause a TypeError when called
      },
    };

    const { result } = renderHook(() => useSignIn(), sharedConfig);
    await act(async () => {
      // The SDK's signIn will attempt to call provider.signIn, resulting in a TypeError.
      // Matching a generic TypeError message or part of it.
      await expect(result.current.signIn(mockSignInData)).rejects.toThrow(
        /provider.signIn is not a function|signIn is not a function/i,
      );
    });
  });

  it("should throw an error if provider.signIn is undefined", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        // signIn is undefined
      },
    };

    const { result } = renderHook(() => useSignIn(), sharedConfig);
    await act(async () => {
      await expect(result.current.signIn(mockSignInData)).rejects.toThrow("provider.signIn is not a function");
    });
  });
});
