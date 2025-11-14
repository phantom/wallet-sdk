import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ConnectModalContent, type ConnectModalContentProps } from "./ConnectModalContent";
import { usePhantom } from "../PhantomContext";
import { useConnect } from "../hooks/useConnect";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock dependencies
jest.mock("../PhantomContext");
jest.mock("../hooks/useConnect");
jest.mock("@phantom/wallet-sdk-ui", () => ({
  ...jest.requireActual("@phantom/wallet-sdk-ui"),
  Button: ({ children, onClick, disabled, isLoading, testID }: any) => (
    <mock-button
      testID={testID || "button"}
      onPress={onClick}
      disabled={disabled}
      isLoading={isLoading}
    >
      {children}
    </mock-button>
  ),
  Icon: ({ type }: { type: string }) => <mock-icon testID={`icon-${type}`} type={type} />,
  Text: ({ children }: { children: React.ReactNode }) => <mock-text>{children}</mock-text>,
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

describe("ConnectModalContent", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
  const mockUseConnect = useConnect as jest.MockedFunction<typeof useConnect>;
  const mockConnect = jest.fn();

  const defaultProps: ConnectModalContentProps = {
    onClose: jest.fn(),
  };

  const renderComponent = (props: Partial<ConnectModalContentProps> = {}) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        <ConnectModalContent {...defaultProps} {...props} />
      </ThemeProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhantom.mockReturnValue({
      isConnecting: false,
      allowedProviders: ["google", "apple"],
      isConnected: false,
      addresses: [],
      walletId: null,
      sdk: null,
      disconnect: jest.fn(),
      getAddresses: jest.fn().mockReturnValue([]),
      isDisconnecting: false,
      config: {} as any,
      currentProviderType: null,
    });
    mockUseConnect.mockReturnValue({
      connect: mockConnect,
      isConnecting: false,
      error: null,
    });
  });

  describe("Provider Buttons", () => {
    it("should render Google button when google is in allowedProviders", () => {
      const { getByTestId, getByText } = renderComponent();
      
      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(getByText("Continue with Google")).toBeTruthy();
    });

    it("should render Apple button when apple is in allowedProviders", () => {
      const { getByTestId, getByText } = renderComponent();
      
      expect(() => getByTestId("icon-apple")).not.toThrow();
      expect(getByText("Continue with Apple")).toBeTruthy();
    });

    it("should render X button when x is in allowedProviders", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["x"],
      } as any);

      const { getByTestId, getByText } = renderComponent();
      
      expect(() => getByTestId("icon-x")).not.toThrow();
      expect(getByText("Continue with X")).toBeTruthy();
    });

    it("should render TikTok button when tiktok is in allowedProviders", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["tiktok"],
      } as any);

      const { getByTestId, getByText } = renderComponent();
      
      expect(() => getByTestId("icon-tiktok")).not.toThrow();
      expect(getByText("Continue with TikTok")).toBeTruthy();
    });

    it("should not render buttons for providers not in allowedProviders", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google"], // Only google
      } as any);

      const { getByTestId, queryByTestId, queryByText } = renderComponent();
      
      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(queryByTestId("icon-apple")).toBeNull();
      expect(queryByTestId("icon-x")).toBeNull();
      expect(queryByTestId("icon-tiktok")).toBeNull();
      expect(queryByText("Continue with Apple")).toBeNull();
    });

    it("should render multiple provider buttons when multiple providers allowed", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google", "apple", "x", "tiktok"],
      } as any);

      const { getByTestId } = renderComponent();
      
      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(() => getByTestId("icon-apple")).not.toThrow();
      expect(() => getByTestId("icon-x")).not.toThrow();
      expect(() => getByTestId("icon-tiktok")).not.toThrow();
    });
  });

  describe("Button Interactions", () => {
    it("should call connect with google provider when Google button is clicked", async () => {
      mockConnect.mockResolvedValue({ status: "completed" });
      const onClose = jest.fn();
      
      const { getByText } = renderComponent({ onClose });
      const googleButton = getByText("Continue with Google").parent;
      
      fireEvent.press(googleButton!);
      
      expect(mockConnect).toHaveBeenCalledWith({ provider: "google" });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should call connect with apple provider when Apple button is clicked", async () => {
      mockConnect.mockResolvedValue({ status: "completed" });
      const onClose = jest.fn();
      
      const { getByText } = renderComponent({ onClose });
      const appleButton = getByText("Continue with Apple").parent;
      
      fireEvent.press(appleButton!);
      
      expect(mockConnect).toHaveBeenCalledWith({ provider: "apple" });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should disable all buttons when connecting", async () => {
      const { getByText, getAllByTestId } = renderComponent();
      const googleButton = getByText("Continue with Google").parent;
      
      fireEvent.press(googleButton!);
      
      await waitFor(() => {
        const buttons = getAllByTestId("button");
        buttons.forEach((button: any) => {
          expect(button.props.disabled).toBe(true);
        });
      });
    });

    it("should show loading state only on clicked button", async () => {
      const { getByText } = renderComponent();
      const googleButton = getByText("Continue with Google").parent;
      const appleButton = getByText("Continue with Apple").parent;
      
      fireEvent.press(googleButton!);
      
      await waitFor(() => {
        expect(googleButton?.props.isLoading).toBe(true);
        expect(appleButton?.props.isLoading).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error message when connect fails", async () => {
      const errorMessage = "Failed to connect to Google";
      mockConnect.mockRejectedValue(new Error(errorMessage));
      
      const { getByText } = renderComponent();
      const googleButton = getByText("Continue with Google").parent;
      
      fireEvent.press(googleButton!);
      
      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });

    it("should clear error when retrying with different provider", async () => {
      mockConnect
        .mockRejectedValueOnce(new Error("Failed to connect"))
        .mockResolvedValueOnce({ status: "completed" });
      
      const { getByText, queryByText } = renderComponent();
      
      // First attempt fails
      fireEvent.press(getByText("Continue with Google").parent!);
      
      await waitFor(() => {
        expect(getByText("Failed to connect")).toBeTruthy();
      });
      
      // Second attempt with different provider
      fireEvent.press(getByText("Continue with Apple").parent!);
      
      await waitFor(() => {
        expect(queryByText("Failed to connect")).toBeNull();
      });
    });

    it("should not call onClose when connect fails", async () => {
      mockConnect.mockRejectedValue(new Error("Connection failed"));
      const onClose = jest.fn();
      
      const { getByText } = renderComponent({ onClose });
      fireEvent.press(getByText("Continue with Google").parent!);
      
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading UI when context isConnecting is true", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnecting: true,
      } as any);

      const { getByTestId } = renderComponent();
      
      expect(() => getByTestId("activity-indicator")).not.toThrow();
    });

    it("should disable buttons when context isConnecting is true", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnecting: true,
      } as any);

      const { getAllByTestId } = renderComponent();
      const buttons = getAllByTestId("button");
      
      buttons.forEach((button: any) => {
        expect(button.props.disabled).toBe(true);
      });
    });
  });

  describe("App Icon", () => {
    it("should render app icon when provided", () => {
      const { getByTestId } = renderComponent({ appIcon: "https://example.com/icon.png" });
      
      const appIcon = getByTestId("app-icon");
      expect(appIcon.props.source).toEqual({ uri: "https://example.com/icon.png" });
    });

    it("should not render app icon when not provided", () => {
      const { queryByTestId } = renderComponent();
      
      expect(queryByTestId("app-icon")).toBeNull();
    });
  });

  describe("Welcome Text", () => {
    it("should display welcome text", () => {
      const { getByText } = renderComponent();
      
      expect(getByText("Welcome! 👋")).toBeTruthy();
      expect(getByText("Log in or sign up to continue")).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty allowedProviders array", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: [],
      } as any);

      const { queryByTestId } = renderComponent();
      
      expect(queryByTestId("icon-google")).toBeNull();
      expect(queryByTestId("icon-apple")).toBeNull();
      expect(queryByTestId("icon-x")).toBeNull();
      expect(queryByTestId("icon-tiktok")).toBeNull();
    });

    it("should handle non-Error objects in catch block", async () => {
      mockConnect.mockRejectedValue("String error");
      
      const { getByText } = renderComponent();
      fireEvent.press(getByText("Continue with Google").parent!);
      
      await waitFor(() => {
        expect(getByText("String error")).toBeTruthy();
      });
    });
  });
});
