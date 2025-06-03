import { signIn } from "./signIn";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, PublicKey, SolanaSignInData } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

const mockPublicKey = { toBase58: () => "mockPublicKey", toString: () => "mockPublicKey" } as unknown as PublicKey;

describe("signIn", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  const mockSignInData: SolanaSignInData = { domain: "example.com", address: "mockAddress" };

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockProvider = {
      signIn: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signIn", async () => {
    const expectedResult = {
      address: mockPublicKey.toString(),
      signature: new Uint8Array([1]),
      signedMessage: new Uint8Array([2]),
    };
    (mockProvider.signIn as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signIn(mockSignInData);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signIn(mockSignInData)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signIn", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signIn(mockSignInData)).rejects.toThrow("The connected provider does not support signIn.");
  });
});
