import { isPhantomLoginAvailable } from "./isPhantomLoginAvailable";
import { waitForPhantomExtension } from "./waitForPhantomExtension";

jest.mock("./waitForPhantomExtension", () => ({
  waitForPhantomExtension: jest.fn(),
}));

const mockWaitForPhantomExtension = waitForPhantomExtension as jest.Mock;

describe("isPhantomLoginAvailable", () => {
  const originalPhantom = (window as any).phantom;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    mockWaitForPhantomExtension.mockReset();
    (window as any).phantom = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
    (window as any).phantom = originalPhantom;
  });

  it("returns false when extension is not installed before timeout", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(false);

    const promise = isPhantomLoginAvailable(300);
    await promise.then(result => expect(result).toBe(false));
    expect(mockWaitForPhantomExtension).toHaveBeenCalledWith(300);
  });

  it("returns false when features API is missing", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(true);

    const result = await isPhantomLoginAvailable(300);
    expect(result).toBe(false);
  });

  it("returns false when features response is malformed", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(true);
    (window as any).phantom = {
      app: {
        features: jest.fn().mockResolvedValue({ features: "not-an-array" }),
      },
    };

    const result = await isPhantomLoginAvailable(300);
    expect(result).toBe(false);
  });

  it("returns true when phantom_login is supported", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(true);
    (window as any).phantom = {
      app: {
        features: jest.fn().mockResolvedValue({ features: ["phantom_login", "other"] }),
      },
    };

    const result = await isPhantomLoginAvailable(300);
    expect(result).toBe(true);
  });

  it("returns false when features call throws", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(true);
    (window as any).phantom = {
      app: {
        features: jest.fn().mockRejectedValue(new Error("boom")),
      },
    };

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await isPhantomLoginAvailable(300);
    expect(result).toBe(false);
    consoleErrorSpy.mockRestore();
  });
});
