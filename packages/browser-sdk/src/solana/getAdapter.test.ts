import { InjectedSolanaAdapter } from "./adapters/injected";
import { getAdapter } from "./getAdapter";

describe("getAdapter", () => {
  it("should return injected adapter", () => {
    const adapter = getAdapter("injected");
    expect(adapter).toBeInstanceOf(InjectedSolanaAdapter);
  });
});
