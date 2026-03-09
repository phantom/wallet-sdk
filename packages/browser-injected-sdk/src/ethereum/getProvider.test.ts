import { InjectedEthereumStrategy } from "./strategies/injected";
import { getProvider } from "./getProvider";
import { ProviderStrategy } from "../types";

describe("ethereum getProvider", () => {
  it("should throw if provider is not found", async () => {
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
    await expect(getProvider(ProviderStrategy.INJECTED)).rejects.toThrow();
  }, 10000);

  it("should return injected provider", async () => {
    (window as any).phantom = {
      ethereum: {
        request: jest.fn(),
        on: jest.fn(),
        isConnected: false,
        selectedAddress: null,
      },
    };
    const provider = await getProvider(ProviderStrategy.INJECTED);
    expect(provider).toBeInstanceOf(InjectedEthereumStrategy);
  });
});
