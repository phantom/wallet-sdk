import { InjectedSolanaAdapter } from "./adapters/injected";
import { getAdapter } from "./getAdapter";

describe("getAdapter", () => {
  it.only("should throw if provider is not found", async () => {
    // @ts-expect-error - window.phantom is not typed
    delete window.phantom;
    await expect(getAdapter("injected")).rejects.toThrow();
  });
  it("should return injected adapter", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn(),
      },
    };
    const adapter = await getAdapter("injected");
    expect(adapter).toBeInstanceOf(InjectedSolanaAdapter);
  });
});
