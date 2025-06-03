import type { SolanaAdapter } from "./adapters/types";
import { getAdapter } from "./getAdapter";
import { signIn } from "./signIn";
import type { PhantomSolanaProvider, SolanaSignInData } from "./types";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

describe("signIn", () => {
  let mockAdapter: Partial<PhantomSolanaProvider>;
  const mockSignInData: SolanaSignInData = { domain: "example.com", address: "mockAddress" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {
      signIn: jest.fn(),
      isConnected: true,
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);
  });

  it("should properly call signIn on the adapter", async () => {
    const expectedResult = {
      address: "123",
      signature: new Uint8Array([1]),
      signedMessage: new Uint8Array([2]),
    };
    (mockAdapter.signIn as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signIn(mockSignInData);

    expect(getAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.signIn).toHaveBeenCalledWith(mockSignInData);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if adapter is not found", async () => {
    (getAdapter as jest.Mock).mockReturnValue(null);
    await expect(signIn(mockSignInData)).rejects.toThrow("Adapter not found.");
  });
});
