import { disconnect } from "./disconnect";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn().mockReturnValue({
    disconnect: jest.fn(),
  }),
}));

describe("disconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when provider is not properly injected", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
  });
});
