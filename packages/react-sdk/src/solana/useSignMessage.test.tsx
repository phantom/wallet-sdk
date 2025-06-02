import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { useSignMessage } from "./useSignMessage";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

const mockMessage = new Uint8Array([1, 2, 3, 4, 5]);
const mockPublicKeyString = "mockPublicKey";

const mockSignature = new Uint8Array([5, 4, 3, 2, 1]);

describe("useSignMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
  });

  it("should throw error when solana chain plugin is not properly configured", async () => {
    const { result } = renderHook(() => useSignMessage(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });
    await act(async () => {
      await expect(result.current.signMessage(mockMessage)).rejects.toThrow("Phantom Solana provider not available.");
    });
  });

  it("should throw error when phantom provider is not available (window.phantom is undefined)", async () => {
    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    await act(async () => {
      // Expecting SDK error
      await expect(result.current.signMessage(mockMessage)).rejects.toThrow("Phantom provider not found.");
    });
  });

  it("should throw error when phantom.solana is not available", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {}; // Phantom is present, but window.phantom.solana is not
    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    await act(async () => {
      // Expecting SDK error
      await expect(result.current.signMessage(mockMessage)).rejects.toThrow("Phantom provider not found.");
    });
  });

  it("should successfully sign a message when phantom.solana.signMessage is available", async () => {
    // This is the result the hook should return (publicKey as string)
    const mockHookResult = { signature: mockSignature, address: mockPublicKeyString };
    // This is what the provider's signMessage method should return (publicKey as string)
    const mockProviderRawResult = { signature: mockSignature, publicKey: mockPublicKeyString };

    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signMessage: jest.fn().mockResolvedValue(mockProviderRawResult),
        isConnected: true,
        connect: jest.fn().mockResolvedValue({ publicKey: mockPublicKeyString }),
      },
    };

    const { result } = renderHook(() => useSignMessage(), sharedConfig);

    let signMessageResponse;
    await act(async () => {
      signMessageResponse = await result.current.signMessage(mockMessage, "utf8");
    });

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.signMessage).toHaveBeenCalledWith(mockMessage, "utf8");
    expect(signMessageResponse).toEqual(mockHookResult);
  });

  it("should use default display encoding if not provided", async () => {
    const mockProviderRawResult = { signature: mockSignature, publicKey: mockPublicKeyString };

    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signMessage: jest.fn().mockResolvedValue(mockProviderRawResult),
        isConnected: true,
        connect: jest.fn().mockResolvedValue({ address: mockPublicKeyString }),
      },
    };

    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    await act(async () => {
      await result.current.signMessage(mockMessage);
    });
    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.signMessage).toHaveBeenCalledWith(mockMessage, undefined);
  });

  it("should throw an error if phantom.solana.signMessage is not a function", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signMessage: "not-a-function",
        isConnected: true, // To prevent connect from being called
        connect: jest.fn(),
      },
    };

    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    await act(async () => {
      await expect(result.current.signMessage(mockMessage)).rejects.toThrow(
        /provider.signMessage is not a function|signMessage is not a function/i,
      );
    });
  });

  it("should attempt to connect if provider is not connected, then sign", async () => {
    const mockHookResult = { signature: mockSignature, address: mockPublicKeyString };
    const mockProviderRawResult = { signature: mockSignature, publicKey: mockPublicKeyString };

    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        signMessage: jest.fn().mockResolvedValue(mockProviderRawResult),
        isConnected: false, // Initially not connected
        connect: jest.fn().mockImplementation(async () => {
          // @ts-expect-error - window.phantom is not typed
          window.phantom.solana.isConnected = true; // Simulate successful connection
          return Promise.resolve({ publicKey: mockPublicKeyString });
        }),
      },
    };

    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    let signMessageResponse;
    await act(async () => {
      signMessageResponse = await result.current.signMessage(mockMessage, "utf8");
    });

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.connect).toHaveBeenCalledTimes(1);
    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.signMessage).toHaveBeenCalledWith(mockMessage, "utf8");
    expect(signMessageResponse).toEqual(mockHookResult);
  });

  it("should throw 'The connected provider does not support signMessage' if provider.signMessage is undefined", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        isConnected: true, // To prevent connect from being called
        connect: jest.fn(),
        // signMessage is undefined
      },
    };

    const { result } = renderHook(() => useSignMessage(), sharedConfig);
    await act(async () => {
      await expect(result.current.signMessage(mockMessage)).rejects.toThrow(
        "The connected provider does not support signMessage.",
      );
    });
  });
});
