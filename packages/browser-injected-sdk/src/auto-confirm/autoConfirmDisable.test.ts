import { autoConfirmDisable } from "./autoConfirmDisable";
import type { AutoConfirmResult } from "./types";
import { PHANTOM_NOT_DETECTED, APP_PROVIDER_NOT_FOUND } from "../errors";

describe("autoConfirmDisable", () => {
  const originalPhantom = (window as any).phantom;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    mockRequest = jest.fn();
    (window as any).phantom = { app: { request: mockRequest } };
  });

  afterEach(() => {
    (window as any).phantom = originalPhantom;
  });

  it("should disable auto-confirm", async () => {
    const mockResult: AutoConfirmResult = { enabled: false, chains: [] };
    mockRequest.mockImplementation(({ method }) => {
      if (method === "phantom_auto_confirm_disable") {
        return Promise.resolve(mockResult);
      }
      throw new Error(`Unknown ${method}`);
    });

    const result = await autoConfirmDisable();

    expect(mockRequest).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_disable",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw when Phantom is not installed", async () => {
    (window as any).phantom = undefined;

    await expect(autoConfirmDisable()).rejects.toThrow(PHANTOM_NOT_DETECTED);
  });

  it("should throw when app provider is missing", async () => {
    (window as any).phantom = { solana: {} };

    await expect(autoConfirmDisable()).rejects.toThrow(APP_PROVIDER_NOT_FOUND);
  });

  it("should handle provider request error", async () => {
    mockRequest.mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmDisable()).rejects.toThrow("Request failed");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
