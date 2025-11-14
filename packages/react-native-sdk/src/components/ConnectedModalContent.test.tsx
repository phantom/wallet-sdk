import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
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
    <mock-button
      testID={variant === "danger" ? "disconnect-button" : "button"}
      onPress={onClick}
      disabled={disabled}
      isLoading={isLoading}
      variant={variant}
    >
      {children}
    </mock-button>
  ),
  Text: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <mock-text testID={variant}>{children}</mock-text>
  ),
  hexToRgba: (_hex: string, opacity: number) => `rgba(255, 0, 0, ${opacity})`,
}));

const mockTheme = {
  background: "#ffffff",
  text: "#000000",
  secondary: "#666666",
  aux: "#cccccc",
  overlay: "rgba(0, 0, 0, 0.7)",
  borderRadius: "16px",
  error: "#ff0000",
  success: "#00ff00",
  brand: "#0000ff",
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
        { address: "0x1234567890abcdef", addressType: "ethereum" },
        { address: "8B3fFH7w...vwLTHTLS", addressType: "solana" },
      ],
      isConnected: true,
      walletId: "test-wallet-id",
      sdk: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getAddresses: jest.fn(),
      isConnecting: false,
      isDisconnecting: false,
      config: {} as any,
      currentProviderType: null,
      allowedProviders: [],
    } as any);
    mockUseDisconnect.mockReturnValue({
      disconnect: mockDisconnect,
      isDisconnecting: false,
      error: null,
    });
  });

  describe("Wallet Information Display", () => {
    it("should display wallet addresses", () => {
      const { getByText } = renderComponent();
      
      expect(getByText("0x1234567890abcdef")).toBeTruthy();
      expect(getByText("8B3fFH7w...vwLTHTLS")).toBeTruthy();
    });

    it("should display address labels", () => {
      const { getAllByTestId } = renderComponent();
      
      const captions = getAllByTestId("caption");
      const labels = captions.map((el: any) => el.children[0]);
      
      expect(labels).toContain("Ethereum");
      expect(labels).toContain("Solana");
    });

    it("should handle empty addresses array", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        addresses: [],
      } as any);

      const { queryByText } = renderComponent();
      
      expect(queryByText("Ethereum")).toBeNull();
      expect(queryByText("Solana")).toBeNull();
    });

    it("should handle single address", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        addresses: [
          { address: "0x1234567890abcdef", addressType: "ethereum" },
        ],
      } as any);

      const { getByText, queryByText } = renderComponent();
      
      expect(getByText("0x1234567890abcdef")).toBeTruthy();
      expect(queryByText("Solana")).toBeNull();
    });
  });

  describe("Disconnect Functionality", () => {
    it("should show disconnect button", () => {
      const { getByTestId } = renderComponent();
      
      expect(getByTestId("disconnect-button")).toBeTruthy();
    });

    it("should call disconnect when button is clicked", async () => {
      mockDisconnect.mockResolvedValue(undefined);
      
      const { getByTestId } = renderComponent();
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should call onClose after successful disconnect", async () => {
      mockDisconnect.mockResolvedValue(undefined);
      const onClose = jest.fn();
      
      const { getByTestId } = renderComponent({ onClose });
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should show loading state while disconnecting", async () => {
      let resolveDisconnect: () => void;
      mockDisconnect.mockImplementation(() => 
        new Promise<void>(resolve => { resolveDisconnect = resolve; })
      );
      
      const { getByTestId } = renderComponent();
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(button.props.isLoading).toBe(true);
        expect(button.props.disabled).toBe(true);
      });
      
      resolveDisconnect!();
    });

    it("should show correct text while disconnecting", async () => {
      let resolveDisconnect: () => void;
      mockDisconnect.mockImplementation(() => 
        new Promise<void>(resolve => { resolveDisconnect = resolve; })
      );
      
      const { getByText } = renderComponent();
      
      expect(getByText("Disconnect")).toBeTruthy();
      
      const button = getByText("Disconnect").parent;
      fireEvent.press(button!);
      
      await waitFor(() => {
        expect(getByText("Disconnecting...")).toBeTruthy();
      });
      
      resolveDisconnect!();
    });
  });

  describe("Error Handling", () => {
    it("should show error message when disconnect fails", async () => {
      const errorMessage = "Failed to disconnect wallet";
      mockDisconnect.mockRejectedValue(new Error(errorMessage));
      
      const { getByTestId, getByText } = renderComponent();
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });

    it("should not call onClose when disconnect fails", async () => {
      mockDisconnect.mockRejectedValue(new Error("Disconnect failed"));
      const onClose = jest.fn();
      
      const { getByTestId } = renderComponent({ onClose });
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    it("should clear error on component mount", () => {
      // First render with an error
      const { rerender, queryByText } = renderComponent();
      
      // Simulate having an error from previous attempt
      mockUseDisconnect.mockReturnValue({
        ...mockUseDisconnect(),
        error: new Error("Previous error"),
      });
      
      rerender(
        <ThemeProvider theme={mockTheme}>
          <ConnectedModalContent {...defaultProps} />
        </ThemeProvider>
      );
      
      // Error should be cleared on mount
      expect(queryByText("Previous error")).toBeNull();
    });

    it("should handle non-Error objects in catch block", async () => {
      mockDisconnect.mockRejectedValue("String error");
      
      const { getByTestId, getByText } = renderComponent();
      const button = getByTestId("disconnect-button");
      
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(getByText("String error")).toBeTruthy();
      });
    });
  });

  describe("UI States", () => {
    it("should render Connected title", () => {
      const { getByText } = renderComponent();
      
      expect(getByText("Connected")).toBeTruthy();
    });

    it("should display addresses with proper formatting", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        addresses: [
          { address: "0xabcdefghijklmnopqrstuvwxyz123456789", addressType: "ethereum" },
        ],
      } as any);

      const { getByText } = renderComponent();
      
      // Should display the full address (no truncation in React Native version)
      expect(getByText("0xabcdefghijklmnopqrstuvwxyz123456789")).toBeTruthy();
    });
  });
});
