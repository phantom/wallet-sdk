import { waitForPhantomExtension } from "./waitForPhantomExtension";

const mockIsPhantomExtensionInstalled = jest.fn();

jest.mock("@phantom/browser-injected-sdk", () => ({
  isPhantomExtensionInstalled: () => mockIsPhantomExtensionInstalled(),
}));

describe("waitForPhantomExtension", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    mockIsPhantomExtensionInstalled.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves true when extension is installed immediately", async () => {
    mockIsPhantomExtensionInstalled.mockReturnValue(true);

    const result = await waitForPhantomExtension(300);
    expect(result).toBe(true);
  });

  it("resolves false after timeout when extension never appears", async () => {
    mockIsPhantomExtensionInstalled.mockReturnValue(false);

    const promise = waitForPhantomExtension(300);
    jest.advanceTimersByTime(300);
    await promise.then(result => expect(result).toBe(false));
  });

  it("ignores errors and keeps polling until timeout", async () => {
    mockIsPhantomExtensionInstalled.mockImplementation(() => {
      throw new Error("not ready");
    });

    const promise = waitForPhantomExtension(300);
    jest.advanceTimersByTime(300);
    await promise.then(result => expect(result).toBe(false));
  });
});
