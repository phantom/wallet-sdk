import { renderHook } from "@testing-library/react";
import { useConnect } from "./useConnect";
import { usePhantom } from "../PhantomContext";

jest.mock("../PhantomContext", () => ({
  usePhantom: jest.fn(),
}));

const mockUsePhantom = usePhantom as jest.Mock;

describe("useConnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes connect and state from context", () => {
    mockUsePhantom.mockReturnValue({
      sdk: { connect: jest.fn() },
      isConnecting: true,
      isLoading: false,
      errors: { connect: "oops" },
    });

    const { result } = renderHook(() => useConnect());

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("oops");
    expect(typeof result.current.connect).toBe("function");
  });

  it("throws when sdk is not initialized", async () => {
    mockUsePhantom.mockReturnValue({
      sdk: null,
      isConnecting: false,
      isLoading: false,
      errors: {},
    });

    const { result } = renderHook(() => useConnect());

    await expect(result.current.connect({} as any)).rejects.toThrow("SDK not initialized");
  });

  it("calls sdk.connect and returns its result", async () => {
    const connectResult = { user: "ok" };
    const connectMock = jest.fn().mockResolvedValue(connectResult);

    mockUsePhantom.mockReturnValue({
      sdk: { connect: connectMock },
      isConnecting: false,
      isLoading: false,
      errors: {},
    });

    const { result } = renderHook(() => useConnect());

    await expect(result.current.connect({} as any)).resolves.toEqual(connectResult);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows errors from sdk.connect", async () => {
    const error = new Error("connect failed");
    const connectMock = jest.fn().mockRejectedValue(error);

    mockUsePhantom.mockReturnValue({
      sdk: { connect: connectMock },
      isConnecting: false,
      isLoading: false,
      errors: {},
    });

    const { result } = renderHook(() => useConnect());

    await expect(result.current.connect({} as any)).rejects.toThrow("connect failed");
  });
});
