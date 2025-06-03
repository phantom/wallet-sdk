import { SolanaAdapter } from "./adapters/types";
import { getAccount } from "./getAccount";
import { getAdapter } from "./getAdapter";

const MOCK_PUBLIC_KEY = "11111111111111111111111111111112";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

describe("getAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return account address when adapter is connected", async () => {
    const mockAdapter = {
      isConnected: true,
      getAccount: jest.fn().mockImplementation(() => MOCK_PUBLIC_KEY),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter);

    const result = await getAccount();

    expect(result).toEqual(MOCK_PUBLIC_KEY);
  });

  it("should return undefined when adapter exists but is not connected", async () => {
    const mockAdapter: Partial<SolanaAdapter> = {
      isConnected: false,
      getAccount: jest.fn().mockImplementation(() => null),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter);

    const result = await getAccount();

    expect(result).toEqual(null);
  });

  it("should return undefined when adapter is connected but has no public key", async () => {
    const mockAdapter: Partial<SolanaAdapter> = {
      isConnected: true,
      getAccount: jest.fn().mockImplementation(() => undefined),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter);

    const result = await getAccount();

    expect(result).toEqual(undefined);
  });
});
