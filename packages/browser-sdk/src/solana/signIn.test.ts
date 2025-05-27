import { signIn } from "./signIn";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaSignInData, SolanaOperationOptions } from "./types";
import type { PublicKey } from "@solana/web3.js";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

const mockPublicKey = { toBase58: () => "mockPublicKey" } as unknown as PublicKey;

describe("signIn", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;
  const mockSignInData: SolanaSignInData = { domain: "example.com", address: "mockAddress" };

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      signIn: jest.fn(),
      // isConnected is not strictly necessary for signIn's core logic, but good to have for consistency in mock
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signIn", async () => {
    const expectedResult = {
      address: mockPublicKey,
      signature: new Uint8Array([1]),
      signedMessage: new Uint8Array([2]),
    };
    (mockProvider.signIn as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signIn(mockSignInData);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(result).toEqual(expectedResult);
  });

  it("should use custom getProvider from options and call provider.signIn", async () => {
    const expectedResult = {
      address: mockPublicKey,
      signature: new Uint8Array([3]),
      signedMessage: new Uint8Array([4]),
    };
    const customProvider = { ...mockProvider, signIn: jest.fn().mockResolvedValue(expectedResult) };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);

    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signIn(mockSignInData, options);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signIn(mockSignInData)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider is not found (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(signIn(mockSignInData, options)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signIn", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider); // No signIn method
    await expect(signIn(mockSignInData)).rejects.toThrow("The connected provider does not support signIn.");
  });
});
