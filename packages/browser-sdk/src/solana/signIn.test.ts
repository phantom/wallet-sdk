import type { SolanaStrategy } from "./strategies/types";
import { getProvider } from "./getProvider";
import { signIn } from "./signIn";
import type { PhantomSolanaProvider, SolanaSignInData } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

describe("signIn", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  const mockSignInData: SolanaSignInData = { domain: "example.com", address: "mockAddress" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signIn: jest.fn(),
      isConnected: true,
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signIn on the provider", async () => {
    const expectedResult = {
      address: "123",
      signature: new Uint8Array([1]),
      signedMessage: new Uint8Array([2]),
    };
    (mockProvider.signIn as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signIn(mockSignInData);

    expect(getProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(signIn(mockSignInData)).rejects.toThrow("Provider not found.");
  });
});
