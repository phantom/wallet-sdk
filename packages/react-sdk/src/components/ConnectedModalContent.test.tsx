import * as React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ConnectedModalContent, type ConnectedModalContentProps } from "./ConnectedModalContent";
import { usePhantom } from "../PhantomContext";
import { useDisconnect } from "../hooks/useDisconnect";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock dependencies
jest.mock("../PhantomContext");
jest.mock("../hooks/useDisconnect");
jest.mock("@phantom/wallet-sdk-ui", () => ({
  ...jest.requireActual("@phantom/wallet-sdk-ui"),
  Button: ({ children, onClick, disabled, isLoading, variant }: any) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} data-loading={isLoading} data-variant={variant}>
      {children}
    </button>
  ),
  Text: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

const mockTheme = {
  background: "#ffffff" as const,
  text: "#000000" as const,
  secondary: "#666666" as const,
  aux: "#cccccc" as const,
  overlay: "rgba(0, 0, 0, 0.7)" as const,
  borderRadius: "16px" as const,
  error: "#ff0000" as const,
  success: "#00ff00" as const,
  brand: "#0000ff" as const,
};

describe("ConnectedModalContent", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
  const mockUseDisconnect = useDisconnect as jest.MockedFunction<typeof useDisconnect>;
  const mockDisconnect = jest.fn();

  const defaultProps: ConnectedModalContentProps = {
    onClose: jest.fn(),
  };

  const renderComponent = (props: Partial<ConnectedModalContentProps> = {}) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        <ConnectedModalContent {...defaultProps} {...props} />
      </ThemeProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhantom.mockReturnValue({
      addresses: [
        // Use human-readable labels directly to avoid coupling to enum internals
        { address: "0x1234567890abcdef1234567890abcdef12345678", addressType: "Ethereum" as any },
        { address: "8B3fFH7wSrxPhLBPmSFXbJWnqfGNXvgszQRvZvwLTHTLS", addressType: "Solana" as any },
      ],
      isConnected: true,
      sdk: null,
      isConnecting: false,
      isLoading: false,
      errors: {},
      isClient: true,
      user: null,
      theme: mockTheme,
      allowedProviders: [],
      clearError: jest.fn(),
    });
    mockUseDisconnect.mockReturnValue({
      disconnect: mockDisconnect,
      isDisconnecting: false,
      error: null,
    });
  });

  describe("Wallet Information Display", () => {
    it("should display wallet addresses", () => {
      const { getByText } = renderComponent();

      expect(getByText("0x1234567890abcdef1234567890abcdef12345678")).toBeInTheDocument();
      expect(getByText("8B3fFH7wSrxPhLBPmSFXbJWnqfGNXvgszQRvZvwLTHTLS")).toBeInTheDocument();
    });

    it("should display address type labels", () => {
      const { getByText } = renderComponent();

      expect(getByText("Ethereum")).toBeInTheDocument();
      expect(getByText("Solana")).toBeInTheDocument();
    });

    it("should handle empty addresses array", () => {
      mockUsePhantom.mockReturnValue({
        addresses: [],
        isConnected: true,
        sdk: null,
        isConnecting: false,
        isLoading: false,
        errors: {},
        isClient: true,
        user: null,
        theme: mockTheme,
        allowedProviders: [],
        clearError: jest.fn(),
      });

      const { queryByText } = renderComponent();

      expect(queryByText("Ethereum")).not.toBeInTheDocument();
      expect(queryByText("Solana")).not.toBeInTheDocument();
    });

    it("should handle addresses without proper length for truncation", () => {
      mockUsePhantom.mockReturnValue({
        addresses: [
          { address: "0x123", addressType: "Ethereum" as any }, // Too short
        ],
        isConnected: true,
        sdk: null,
        isConnecting: false,
        isLoading: false,
        errors: {},
        isClient: true,
        user: null,
        theme: mockTheme,
        allowedProviders: [],
        clearError: jest.fn(),
      });

      const { getByText } = renderComponent();

      // Should display the full address if too short to truncate
      expect(getByText("0x123")).toBeInTheDocument();
    });
  });

  describe("Disconnect Functionality", () => {
    it("should show disconnect button", () => {
      const { getByText } = renderComponent();

      const button = getByText("Disconnect").closest("button");
      expect(button).toBeInTheDocument();
    });

    it("should call disconnect when button is clicked", () => {
      mockDisconnect.mockResolvedValue(undefined);

      const { getByText } = renderComponent();
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should call onClose after successful disconnect", async () => {
      mockDisconnect.mockResolvedValue(undefined);
      const onClose = jest.fn();

      const { getByText } = renderComponent({ onClose });
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should show loading state while disconnecting", async () => {
      let resolveDisconnect: () => void;
      mockDisconnect.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveDisconnect = resolve;
          }),
      );

      const { getByText } = renderComponent();
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(button.dataset.loading).toBe("true");
        expect(button).toBeDisabled();
      });

      resolveDisconnect!();
    });

    it("should show correct text while disconnecting", async () => {
      let resolveDisconnect: () => void;
      mockDisconnect.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveDisconnect = resolve;
          }),
      );

      const { getByText } = renderComponent();

      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;
      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText("Disconnecting...")).toBeInTheDocument();
      });

      resolveDisconnect!();
    });
  });

  describe("Error Handling", () => {
    it("should show error message when disconnect fails", async () => {
      mockDisconnect.mockRejectedValue(new Error("Something went wrong"));

      const { getByText } = renderComponent();
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText("Failed to disconnect")).toBeInTheDocument();
      });
    });

    it("should not call onClose when disconnect fails", async () => {
      mockDisconnect.mockRejectedValue(new Error("Disconnect failed"));
      const onClose = jest.fn();

      const { getByText } = renderComponent({ onClose });
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    it("should handle non-Error objects in catch block", async () => {
      mockDisconnect.mockRejectedValue("String error");

      const { getByText } = renderComponent();
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText("Failed to disconnect")).toBeInTheDocument();
      });
    });

    it("should handle undefined error", async () => {
      mockDisconnect.mockRejectedValue(undefined);

      const { getByText } = renderComponent();
      const button = getByText("Disconnect").closest("button") as HTMLButtonElement;

      fireEvent.click(button);

      await waitFor(() => {
        expect(getByText("Failed to disconnect")).toBeInTheDocument();
      });
    });
  });

  describe("Address Formatting", () => {
    // Pure visual/truncation behavior is tested at the UI level; we only
    // assert that addresses render, not their exact truncated form.
    it("should render without crashing for long addresses", () => {
      mockUsePhantom.mockReturnValue({
        addresses: [{ address: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", addressType: "Solana" as any }],
        isConnected: true,
        sdk: null,
        isConnecting: false,
        isLoading: false,
        errors: {},
        isClient: true,
        user: null,
        theme: mockTheme,
        allowedProviders: [],
        clearError: jest.fn(),
      });

      const { getByText } = renderComponent();
      expect(getByText("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")).toBeInTheDocument();
    });
  });
});
