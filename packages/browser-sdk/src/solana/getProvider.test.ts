import { getProvider } from "./getProvider";

describe("getProvider", () => {
  it("should return if provider is not injected", () => {
    const provider = getProvider();
    expect(provider).toBeNull();
  });

  it("should return the provider if it is injected", () => {
    // @ts-expect-error - Testing window injection
    window.solana = {};
    // @ts-expect-error - Testing window injection
    window.phantom = {
      solana: {},
    };

    const provider = getProvider();
    expect(provider).toBeDefined();
  });
});
