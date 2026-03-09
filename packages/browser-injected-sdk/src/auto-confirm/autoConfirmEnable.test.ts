import { autoConfirmEnable } from "./autoConfirmEnable";
import { NetworkId } from "@phantom/constants";
import { PHANTOM_NOT_DETECTED, APP_PROVIDER_NOT_FOUND } from "../errors";

describe("autoConfirmEnable", () => {
  const originalPhantom = (window as any).phantom;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    mockRequest = jest.fn();
    (window as any).phantom = { app: { request: mockRequest } };
  });

  afterEach(() => {
    (window as any).phantom = originalPhantom;
  });

  it("should enable auto-confirm with chains parameter", async () => {
    const mockProviderResponse = { enabled: true, chains: ["solana:103", "eip155:1"] };
    const expectedResult = { enabled: true, chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET] };
    mockRequest.mockResolvedValue(mockProviderResponse);

    const result = await autoConfirmEnable({ chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET] });

    expect(mockRequest).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_enable",
      params: { chains: ["solana:103", "eip155:1"] },
    });
    expect(result).toEqual(expectedResult);
  });

  it("should enable auto-confirm without chains parameter", async () => {
    const mockResult = { enabled: true, chains: [] };
    mockRequest.mockResolvedValue(mockResult);

    const result = await autoConfirmEnable();

    expect(mockRequest).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_enable",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw when Phantom is not installed", async () => {
    (window as any).phantom = undefined;

    await expect(autoConfirmEnable()).rejects.toThrow(PHANTOM_NOT_DETECTED);
  });

  it("should throw when app provider is missing", async () => {
    (window as any).phantom = { solana: {} };

    await expect(autoConfirmEnable()).rejects.toThrow(APP_PROVIDER_NOT_FOUND);
  });

  it("should handle provider request error", async () => {
    mockRequest.mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmEnable()).rejects.toThrow("Request failed");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
