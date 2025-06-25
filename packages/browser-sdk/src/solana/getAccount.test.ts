import type { SolanaStrategy } from "./strategies/types";
import { getAccount } from "./getAccount";
import { getProvider } from "./getProvider";

const MOCK_PUBLIC_KEY = "11111111111111111111111111111112";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

describe("getAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return account address when provider is connected", async () => {
    const mockProvider = {
      isConnected: true,
      getAccount: jest.fn().mockImplementation(() => MOCK_PUBLIC_KEY),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = await getAccount();

    expect(result).toEqual(MOCK_PUBLIC_KEY);
  });

  it("should return undefined when provider exists but is not connected", async () => {
    const mockProvider: Partial<SolanaStrategy> = {
      isConnected: false,
      getAccount: jest.fn().mockImplementation(() => null),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = await getAccount();

    expect(result).toEqual(null);
  });

  it("should return undefined when provider is connected but has no public key", async () => {
    const mockProvider: Partial<SolanaStrategy> = {
      isConnected: true,
      getAccount: jest.fn().mockImplementation(() => undefined),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = await getAccount();

    expect(result).toEqual(undefined);
  });
});
