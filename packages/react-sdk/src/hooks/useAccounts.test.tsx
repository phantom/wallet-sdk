import { renderHook } from "@testing-library/react";
import { useAccounts } from "./useAccounts";
import { usePhantom } from "../PhantomContext";

jest.mock("../PhantomContext", () => ({
  usePhantom: jest.fn(),
}));

const mockUsePhantom = usePhantom as jest.Mock;

describe("useAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when not connected", () => {
    mockUsePhantom.mockReturnValue({
      isConnected: false,
      addresses: ["addr1"],
    });

    const { result } = renderHook(() => useAccounts());
    expect(result.current).toBe(null);
  });

  it("returns addresses when connected", () => {
    const addresses = ["addr1", "addr2"];
    mockUsePhantom.mockReturnValue({
      isConnected: true,
      addresses,
    });

    const { result } = renderHook(() => useAccounts());
    expect(result.current).toEqual(addresses);
  });
});
