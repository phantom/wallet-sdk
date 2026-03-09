import { autoConfirmStatus } from "./autoConfirmStatus";
import { PHANTOM_NOT_DETECTED, APP_PROVIDER_NOT_FOUND } from "../errors";

describe("autoConfirmStatus", () => {
  const originalPhantom = (window as any).phantom;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    mockRequest = jest.fn();
    (window as any).phantom = { app: { request: mockRequest } };
  });

  afterEach(() => {
    (window as any).phantom = originalPhantom;
  });

  it("should get auto-confirm status", async () => {
    // Mock raw provider response with internal CAIP format
    const mockProviderResponse = { enabled: true, chains: ["solana:101", "eip155:1"] };
    mockRequest.mockResolvedValue(mockProviderResponse);

    const result = await autoConfirmStatus();

    expect(mockRequest).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_status",
      params: {},
    });
    // Expect the processed result with NetworkId values
    expect(result).toEqual({ enabled: true, chains: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "eip155:1"] });
  });

  it("should throw when Phantom is not installed", async () => {
    (window as any).phantom = undefined;

    await expect(autoConfirmStatus()).rejects.toThrow(PHANTOM_NOT_DETECTED);
  });

  it("should throw when app provider is missing", async () => {
    (window as any).phantom = { solana: {} };

    await expect(autoConfirmStatus()).rejects.toThrow(APP_PROVIDER_NOT_FOUND);
  });

  it("should handle provider request error", async () => {
    mockRequest.mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmStatus()).rejects.toThrow("Request failed");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
