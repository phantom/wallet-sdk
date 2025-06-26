import { InjectedSolanaStrategy } from "./strategies/injected";
import { getProvider } from "./getProvider";
import { ProviderStrategy } from "../types";

describe("getProvider", () => {
  it.only("should throw if provider is not found", async () => {
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
    await expect(getProvider(ProviderStrategy.INJECTED)).rejects.toThrow();
  });
  it("should return injected provider", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn(),
      },
    };
    const provider = await getProvider(ProviderStrategy.INJECTED);
    expect(provider).toBeInstanceOf(InjectedSolanaStrategy);
  });
});
